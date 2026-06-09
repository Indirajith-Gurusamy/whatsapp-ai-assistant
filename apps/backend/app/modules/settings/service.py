"""Service layer for admin settings — CRUD, encryption, testing, defaults."""
import logging
from typing import Dict, List, Optional, Any

from app.db.prisma import Prisma, Json
from app.core.encryption import encrypt_value, decrypt_setting_value, SENSITIVE_KEYS
from app.core.config import settings as app_settings

logger = logging.getLogger(__name__)

# ── Default settings per category (seeded from env vars) ─


import json

from app.modules.ai.providers_util import build_default_ai_providers, normalize_ai_settings


def _ai_default_providers() -> str:
    return build_default_ai_providers()


def _default_email_accounts_from_env() -> list:
    if not app_settings.GMAIL_EMAIL or not app_settings.GMAIL_APP_PASSWORD:
        return []
    return [
        {
            "id": "gmail-default",
            "name": "Gmail Default",
            "email": app_settings.GMAIL_EMAIL,
            "app_password": app_settings.GMAIL_APP_PASSWORD,
            "imap_host": app_settings.GMAIL_IMAP_HOST or "imap.gmail.com",
            "imap_port": str(app_settings.GMAIL_IMAP_PORT or 993),
            "active": True,
        }
    ]


def _build_defaults() -> Dict[str, Dict[str, str]]:
    """Build default settings, pulling values from env vars when available."""
    whatsapp_accounts = []
    if app_settings.TWILIO_ACCOUNT_SID:
        whatsapp_accounts.append({
            "id": "twilio-default",
            "name": "Twilio Default",
            "platform": "twilio",
            "active": True,
            "config": {
                "account_sid": app_settings.TWILIO_ACCOUNT_SID,
                "auth_token": app_settings.TWILIO_AUTH_TOKEN,
                "whatsapp_number": app_settings.TWILIO_WHATSAPP_NUMBER,
                "verify_token": app_settings.VERIFY_TOKEN
            }
        })

    return {
        "WHATSAPP": {
            "whatsapp_accounts": json.dumps(whatsapp_accounts),
            "twilio_account_sid": app_settings.TWILIO_ACCOUNT_SID or "",
            "twilio_auth_token": app_settings.TWILIO_AUTH_TOKEN or "",
            "twilio_whatsapp_number": app_settings.TWILIO_WHATSAPP_NUMBER or "",
            "webhook_verify_token": app_settings.VERIFY_TOKEN or "",
        },
        "AI": {
            "ai_providers": _ai_default_providers(),
            "temperature": "0.7",
            "max_tokens": "300",
            "system_prompt": (
                "You are a knowledgeable, professional Loan officer. "
                "Your role is to provide informative answers, be helpful, friendly, "
                "and professional. Keep responses concise but comprehensive (2-4 sentences)."
            ),
            "fallback_message": "Thank you for your message. We'll get back to you soon!",
        },
        "AUTOMATION": {
            "customer_service_window": "true",
            "human_handover": "false",
            "working_hours_start": "09:00",
            "working_hours_end": "18:00",
            "auto_followup_delay_minutes": "60",
        },
        "CRM": {
            "auto_assign_lead": "false",
            "default_assignee": "",
            "followup_reminder_hours": "24",
            "status_workflow": "new lead,assigned,application sent,application in,nurture,follow up,on hold,lost,duplicate,closed",
        },
        "EMAIL": {
            "email_enabled": "false",
            "email_create_customers": "false",
            "email_assign_to_leads": "false",
            "email_keyword_rules": "[]",
            "email_accounts": json.dumps(_default_email_accounts_from_env()),
            "poll_interval_seconds": str(app_settings.GMAIL_POLL_INTERVAL_SECONDS or 60),
        },
    }


DEFAULT_SETTINGS: Dict[str, Dict[str, str]] = _build_defaults()


def _is_masked_secret(value: str) -> bool:
    return "•" in value


def _merge_email_accounts_payload(old_json: str, new_json: str) -> str:
    """Preserve stored app passwords when the UI submits masked placeholders."""
    try:
        old_accounts = json.loads(old_json or "[]")
        new_accounts = json.loads(new_json or "[]")
    except json.JSONDecodeError:
        return new_json
    if not isinstance(old_accounts, list) or not isinstance(new_accounts, list):
        return new_json

    old_by_id = {
        acc.get("id"): acc
        for acc in old_accounts
        if isinstance(acc, dict) and acc.get("id")
    }
    merged: List[Dict[str, Any]] = []
    for acc in new_accounts:
        if not isinstance(acc, dict):
            continue
        prev = old_by_id.get(acc.get("id"))
        pwd = str(acc.get("app_password", ""))
        if prev and _is_masked_secret(pwd):
            acc = {**acc, "app_password": prev.get("app_password", pwd)}
        merged.append(acc)
    return json.dumps(merged)


def _merge_json_accounts_payload(
    old_json: str,
    new_json: str,
    *,
    secret_fields: tuple,
    nested_config: bool = False,
) -> str:
    """Preserve stored secrets when the UI submits masked placeholders."""
    try:
        old_accounts = json.loads(old_json or "[]")
        new_accounts = json.loads(new_json or "[]")
    except json.JSONDecodeError:
        return new_json
    if not isinstance(old_accounts, list) or not isinstance(new_accounts, list):
        return new_json

    old_by_id = {
        acc.get("id"): acc
        for acc in old_accounts
        if isinstance(acc, dict) and acc.get("id")
    }
    merged: List[Dict[str, Any]] = []
    for acc in new_accounts:
        if not isinstance(acc, dict):
            continue
        prev = old_by_id.get(acc.get("id"))
        if prev:
            if nested_config:
                prev_cfg = prev.get("config") if isinstance(prev.get("config"), dict) else {}
                new_cfg = acc.get("config") if isinstance(acc.get("config"), dict) else {}
                merged_cfg = dict(new_cfg)
                for field in secret_fields:
                    val = str(merged_cfg.get(field, ""))
                    if _is_masked_secret(val):
                        merged_cfg[field] = prev_cfg.get(field, val)
                acc = {**acc, "config": merged_cfg}
            else:
                for field in secret_fields:
                    val = str(acc.get(field, ""))
                    if _is_masked_secret(val):
                        acc = {**acc, field: prev.get(field, val)}
        merged.append(acc)
    return json.dumps(merged)


class SettingsService:
    """Business logic for system settings management."""

    def __init__(self, db: Prisma):
        self.db = db

    # ── READ ─────────────────────────────────────────

    async def get_settings(self, category: str) -> Dict[str, str]:
        """Fetch all settings for a category, auto-decrypting sensitive values.
        
        If no rows exist yet for a category, seeds the DB from env-based defaults.
        """
        cat = category.upper()
        rows = await self.db.systemsetting.find_many(
            where={"category": cat}
        )

        result: Dict[str, str] = {}

        # Start with defaults so missing rows still show up
        if cat in DEFAULT_SETTINGS:
            result.update(DEFAULT_SETTINGS[cat])

        # Auto-seed from env defaults if DB has no rows for this category
        if not rows and cat in DEFAULT_SETTINGS:
            await self._seed_category(cat)
            rows = await self.db.systemsetting.find_many(
                where={"category": cat}
            )

        for row in rows:
            val = decrypt_setting_value(row.value) if row.isEncrypted else row.value
            result[row.key] = val

        if cat == "AI":
            result = normalize_ai_settings(result)

        return result

    async def _seed_category(self, category: str) -> None:
        """Persist default settings (from env) into the DB for a category."""
        defaults = DEFAULT_SETTINGS.get(category, {})
        for key, raw_value in defaults.items():
            if not raw_value:
                continue
            should_encrypt = key in SENSITIVE_KEYS
            stored_value = encrypt_value(raw_value) if should_encrypt else raw_value
            try:
                await self.db.systemsetting.create(
                    data={
                        "category": category,
                        "key": key,
                        "value": stored_value,
                        "isEncrypted": should_encrypt,
                    }
                )
            except Exception:
                pass  # row may already exist from a race

    # ── UPDATE ───────────────────────────────────────

    async def update_settings(
        self,
        category: str,
        data: Dict[str, str],
        admin_user_id: int,
    ) -> Dict[str, str]:
        """Upsert settings for a category, encrypting sensitive keys."""
        cat = category.upper()

        # Only accept known keys for this category, but allow more for WhatsApp now
        known_keys = set(DEFAULT_SETTINGS.get(cat, {}).keys())
        # For WhatsApp, we might add new platforms later, so let's be more flexible
        filtered_data = {
            k: v for k, v in data.items() if k in known_keys or cat in ("WHATSAPP", "AI", "EMAIL")
        }
        if cat == "AI":
            for legacy_key in ("groq_api_key", "groq_model"):
                filtered_data.pop(legacy_key, None)

        # Capture old values for audit
        old_values = await self.get_settings(cat)

        if cat == "EMAIL" and "email_accounts" in filtered_data:
            filtered_data["email_accounts"] = _merge_email_accounts_payload(
                old_values.get("email_accounts", "[]"),
                filtered_data["email_accounts"],
            )
        if cat == "WHATSAPP" and "whatsapp_accounts" in filtered_data:
            filtered_data["whatsapp_accounts"] = _merge_json_accounts_payload(
                old_values.get("whatsapp_accounts", "[]"),
                filtered_data["whatsapp_accounts"],
                secret_fields=("auth_token", "verify_token"),
                nested_config=True,
            )
        if cat == "AI" and "ai_providers" in filtered_data:
            filtered_data["ai_providers"] = _merge_json_accounts_payload(
                old_values.get("ai_providers", "[]"),
                filtered_data["ai_providers"],
                secret_fields=("api_key",),
                nested_config=True,
            )

        for key, raw_value in filtered_data.items():
            should_encrypt = key in SENSITIVE_KEYS
            stored_value = encrypt_value(raw_value) if should_encrypt else raw_value

            await self.db.systemsetting.upsert(
                where={
                    "category_key": {
                        "category": cat,
                        "key": key,
                    }
                },
                data={
                    "create": {
                        "category": cat,
                        "key": key,
                        "value": stored_value,
                        "isEncrypted": should_encrypt,
                    },
                    "update": {
                        "value": stored_value,
                        "isEncrypted": should_encrypt,
                    },
                },
            )

        # Build audit-safe new values (mask sensitive)
        new_values = {**old_values, **filtered_data}
        audit_old = self._mask_sensitive(old_values)
        audit_new = self._mask_sensitive(new_values)

        await self._create_audit_log(
            admin_user_id=admin_user_id,
            action="update",
            category=cat,
            old_value=audit_old,
            new_value=audit_new,
        )

        logger.info(
            "Settings saved: category=%s keys=%s (admin user_id=%s)",
            cat,
            sorted(filtered_data.keys()),
            admin_user_id,
        )

        return await self.get_settings(cat)



    # ── TEST WHATSAPP ────────────────────────────────

    async def test_whatsapp(self, account_id: Optional[str] = None) -> Dict[str, Any]:
        """Validate WhatsApp credentials (supports specific account ID or active account)."""
        settings_data = await self.get_settings("WHATSAPP")
        
        # 1. Try to get specific account or active account from multi-account list
        accounts_json = settings_data.get("whatsapp_accounts", "[]")
        try:
            import json
            accounts = json.loads(accounts_json)
            
            # Find the account to test: specific ID if provided, otherwise active one
            target_acc = None
            if account_id:
                target_acc = next((a for a in accounts if a.get("id") == account_id), None)
            else:
                target_acc = next((a for a in accounts if a.get("active")), None)
            
            if target_acc:
                platform = target_acc.get("platform")
                config = target_acc.get("config", {})
                if platform == "twilio":
                    sid = config.get("account_sid")
                    token = config.get("auth_token")
                    if sid and token:
                        return await self._test_twilio(sid, token)
                elif platform == "meta":
                    token = config.get("access_token")
                    if token:
                        return await self._test_meta_account(
                            target_acc.get("id"),
                            config,
                            accounts,
                        )
        except Exception as e:
            logger.error(f"Error parsing whatsapp_accounts for test: {e}")

        # 2. Fallback to legacy keys (Twilio only - only if no specific account requested)
        if not account_id:
            sid = settings_data.get("twilio_account_sid", "")
            token = settings_data.get("twilio_auth_token", "")
            
            # 3. Fall back to env vars if DB settings are empty
            if not sid or not token:
                from app.core.config import settings as app_settings
                sid = sid or app_settings.TWILIO_ACCOUNT_SID
                token = token or app_settings.TWILIO_AUTH_TOKEN

            if sid and token:
                return await self._test_twilio(sid, token)

        return {"success": False, "message": "WhatsApp configuration not found or invalid"}

    async def send_test_message(
        self, 
        phone_number: str, 
        message_text: str, 
        account_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send a real WhatsApp message for end-to-end verification."""
        settings_data = await self.get_settings("WHATSAPP")
        accounts_json = settings_data.get("whatsapp_accounts", "[]")
        
        try:
            import json
            accounts = json.loads(accounts_json)
            
            target_acc = None
            if account_id:
                target_acc = next((a for a in accounts if a.get("id") == account_id), None)
            else:
                target_acc = next((a for a in accounts if a.get("active")), None)
            
            if not target_acc:
                return {"success": False, "message": "WhatsApp account not found"}
            
            platform = target_acc.get("platform")
            config = target_acc.get("config", {})
            
            from app.modules.whatsapp.sender import WhatsAppService
            
            success = False
            if platform == "meta":
                success, _ = await WhatsAppService._send_meta(phone_number, message_text, config)
            elif platform == "twilio":
                success, _ = await WhatsAppService._send_twilio(phone_number, message_text, config)
            
            return {
                "success": success,
                "message": f"Test message {'sent successfully' if success else 'failed to send'} via {platform.capitalize()}",
                "details": {"account_id": target_acc.get("id"), "platform": platform}
            }
        except Exception as e:
            logger.error(f"Error sending test message: {e}")
            return {"success": False, "message": f"Error: {str(e)}"}

    async def _test_twilio(self, sid: str, token: str) -> Dict[str, Any]:
        """Helper to test a specific Twilio SID/Token."""
        try:
            from twilio.rest import Client
            client = Client(sid, token)
            account = client.api.accounts(sid).fetch()
            return {
                "success": True,
                "message": f"Connected to Twilio: {account.friendly_name}",
                "details": {
                    "account_name": account.friendly_name,
                    "account_status": account.status,
                },
            }
        except Exception as e:
            logger.error(f"Twilio test failed: {e}")
            return {"success": False, "message": f"Twilio connection failed: {str(e)}"}

    async def _test_meta_account(
        self,
        account_id: Optional[str],
        config: Dict[str, Any],
        accounts: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Validate Meta credentials and resolve correct Phone Number ID."""
        from app.modules.whatsapp.meta_api import (
            DEFAULT_META_API_VERSION,
            resolve_meta_config,
            resolve_waba_id,
            verify_waba_owns_phone,
        )

        phone_id, err, info = await resolve_meta_config(config)
        if err or not phone_id:
            return {"success": False, "message": err or "Could not resolve Meta phone number ID"}

        waba_id, waba_err, waba_info = await resolve_waba_id(config)
        if waba_err:
            waba_id = None
            waba_info = None

        display = (info or {}).get("display_phone_number") or (info or {}).get("verified_name") or phone_id
        corrected_from = (info or {}).get("corrected_from")
        api_version = (config.get("api_version") or DEFAULT_META_API_VERSION).strip()
        token = (config.get("access_token") or "").strip()

        config_updates: Dict[str, str] = {}
        if corrected_from and account_id:
            config_updates["phone_number_id"] = phone_id
        stored_waba = (config.get("waba_id") or "").strip()
        if waba_id and account_id and waba_id != stored_waba:
            waba_source = (waba_info or {}).get("source")
            owns_phone = await verify_waba_owns_phone(
                waba_id, phone_id, token, api_version
            )
            if waba_source == "phone_whatsapp_business_account" or owns_phone:
                config_updates["waba_id"] = waba_id
            elif stored_waba and not await verify_waba_owns_phone(
                stored_waba, phone_id, token, api_version
            ):
                return {
                    "success": False,
                    "message": (
                        f"WABA ID {stored_waba} does not own phone {phone_id}. "
                        f"Set WABA to asset_id from your WhatsApp Manager URL "
                        f"(resolved parent: {waba_id or 'unknown'})."
                    ),
                }

        if config_updates and account_id:
            await self._update_meta_config_in_accounts(accounts, account_id, config_updates)
            parts = []
            if "phone_number_id" in config_updates and corrected_from:
                parts.append(
                    f"Phone Number ID (was {corrected_from} → now {phone_id})"
                )
            if "waba_id" in config_updates:
                parts.append(f"WABA ID ({waba_id})")
            message = f"Connected to Meta: {display}. Saved {' and '.join(parts)}."
        else:
            message = f"Connected to Meta: {display} (phone_number_id: {phone_id})"
            if waba_id:
                message += f", WABA: {waba_id}"

        return {
            "success": True,
            "message": message,
            "details": {
                "phone_number_id": phone_id,
                "waba_id": waba_id,
                "display_phone_number": (info or {}).get("display_phone_number"),
                **(info or {}),
                **(waba_info or {}),
            },
        }

    async def _update_meta_config_in_accounts(
        self,
        accounts: List[Dict[str, Any]],
        account_id: str,
        config_updates: Dict[str, str],
    ) -> None:
        """Persist corrected Meta config fields back to whatsapp_accounts."""
        updated = False
        for acc in accounts:
            if acc.get("id") == account_id and acc.get("platform") == "meta":
                acc.setdefault("config", {}).update(config_updates)
                updated = True
                break
        if not updated:
            return

        import json
        from app.core.encryption import encrypt_value

        stored = encrypt_value(json.dumps(accounts))
        await self.db.systemsetting.upsert(
            where={"category_key": {"category": "WHATSAPP", "key": "whatsapp_accounts"}},
            data={
                "create": {
                    "category": "WHATSAPP",
                    "key": "whatsapp_accounts",
                    "value": stored,
                    "isEncrypted": True,
                },
                "update": {"value": stored, "isEncrypted": True},
            },
        )
        logger.info(
            f"Updated Meta config for account {account_id}: {list(config_updates.keys())}"
        )

    # ── TEST AI ──────────────────────────────────────

    async def test_ai(self, provider_id: Optional[str] = None) -> Dict[str, Any]:
        """Send a test prompt using a specific or active AI provider."""
        from app.modules.ai.chat import complete_chat
        from app.modules.ai.providers_util import get_provider_by_id, parse_ai_providers

        settings_data = await self.get_settings("AI")
        providers = parse_ai_providers(settings_data.get("ai_providers", ""))
        provider = get_provider_by_id(providers, provider_id)

        if not provider:
            return {"success": False, "message": "No AI provider configured"}

        provider_type = provider.get("provider", "")
        config = provider.get("config") or {}
        model = config.get("model", "")

        try:
            response = await complete_chat(
                provider_type=provider_type,
                config=config,
                messages=[
                    {"role": "system", "content": "Reply in one short sentence."},
                    {"role": "user", "content": "Say hello and confirm you are working."},
                ],
                temperature=0.5,
                max_tokens=60,
            )
            return {
                "success": True,
                "message": f"{provider.get('name', provider_type)} responded successfully",
                "details": {
                    "response": response,
                    "model": model,
                    "provider": provider_type,
                    "provider_id": provider.get("id"),
                },
            }
        except Exception as e:
            from app.modules.ai.chat import format_ai_error

            logger.error(f"AI test failed: {e}")
            return {"success": False, "message": format_ai_error(e)}

    # ── AUDIT LOGS ───────────────────────────────────

    async def get_audit_logs(
        self, skip: int = 0, limit: int = 50
    ) -> Dict[str, Any]:
        """Paginated audit-log query with admin user info."""
        total = await self.db.auditlog.count()
        rows = await self.db.auditlog.find_many(
            skip=skip,
            take=limit,
            order={"createdAt": "desc"},
            include={"adminUser": True},
        )

        logs = []
        for row in rows:
            logs.append({
                "id": row.id,
                "admin_name": row.adminUser.name if row.adminUser else "Unknown",
                "admin_email": row.adminUser.email if row.adminUser else "",
                "action": row.action,
                "category": row.category,
                "old_value": row.oldValue,
                "new_value": row.newValue,
                "created_at": row.createdAt.isoformat(),
            })

        return {"logs": logs, "total": total, "skip": skip, "limit": limit}

    # ── helpers ──────────────────────────────────────

    async def _create_audit_log(
        self,
        admin_user_id: int,
        action: str,
        category: str,
        old_value: Optional[Dict] = None,
        new_value: Optional[Dict] = None,
    ):
        """Insert an audit log entry."""
        await self.db.auditlog.create(
            data={
                "adminUserId": admin_user_id,
                "action": action,
                "category": category,
                "oldValue": Json(old_value) if old_value else None,
                "newValue": Json(new_value) if new_value else None,
            }
        )

    @staticmethod
    def _mask_sensitive(data: Dict[str, str]) -> Dict[str, str]:
        """Replace sensitive values with asterisks for audit storage."""
        masked = {}
        for k, v in data.items():
            if not v:
                masked[k] = v
                continue

            if k in ("whatsapp_accounts", "ai_providers", "email_accounts"):
                try:
                    import json
                    accounts = json.loads(v)
                    for acc in accounts:
                        if "config" in acc:
                            for ck in acc["config"]:
                                # Mask any key containing secret, token, key, password
                                if any(s in ck.lower() for s in ["token", "secret", "key", "password"]):
                                    val = str(acc["config"][ck])
                                    acc["config"][ck] = val[:4] + "••••" if len(val) > 4 else "••••"
                    masked[k] = json.dumps(accounts)
                except Exception:
                    masked[k] = "••••••••"
            elif k in SENSITIVE_KEYS:
                masked[k] = v[:4] + "••••" if len(v) > 4 else "••••"
            else:
                masked[k] = v
        return masked
