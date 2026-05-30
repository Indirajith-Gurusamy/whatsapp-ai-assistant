"""Service layer for admin settings — CRUD, encryption, testing, defaults."""
import logging
from typing import Dict, List, Optional, Any

from app.db.prisma import Prisma, Json
from app.core.encryption import encrypt_value, decrypt_value, SENSITIVE_KEYS
from app.core.config import settings as app_settings

logger = logging.getLogger(__name__)

# ── Default settings per category (seeded from env vars) ─


import json

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
            "groq_api_key": app_settings.GROQ_API_KEY or "",
            "groq_model": app_settings.GROQ_MODEL or "llama-3.3-70b-versatile",
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
            "status_workflow": "new lead,contacted,qualified,proposal,negotiation,won,lost",
        },
    }


DEFAULT_SETTINGS: Dict[str, Dict[str, str]] = _build_defaults()


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
            val = decrypt_value(row.value) if row.isEncrypted else row.value
            result[row.key] = val

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
        filtered_data = {k: v for k, v in data.items() if k in known_keys or cat == "WHATSAPP"}

        # Capture old values for audit
        old_values = await self.get_settings(cat)

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
                    phone_id = config.get("phone_number_id")
                    token = config.get("access_token")
                    if phone_id and token:
                        return await self._test_meta(phone_id, token)
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
        is_template: bool = False
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
                success = await WhatsAppService._send_meta(phone_number, message_text, config, is_template)
            elif platform == "twilio":
                success = await WhatsAppService._send_twilio(phone_number, message_text, config)
            
            return {
                "success": success,
                "message": f"Test message {'sent successfully' if success else 'failed to send'} via {platform.capitalize()}",
                "details": {"account_id": target_acc.get("id"), "platform": platform, "template": is_template}
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

    async def _test_meta(self, phone_id: str, token: str) -> Dict[str, Any]:
        """Helper to test Meta WhatsApp Cloud API credentials."""
        try:
            import httpx
            url = f"https://graph.facebook.com/v17.0/{phone_id}"
            headers = {"Authorization": f"Bearer {token}"}
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                display_name = data.get("verified_name") or data.get("display_phone_number") or "Meta Account"
                return {
                    "success": True,
                    "message": f"Connected to Meta: {display_name}",
                    "details": data
                }
            else:
                return {"success": False, "message": f"Meta API error: {response.status_code} - {response.text}"}
        except Exception as e:
            logger.error(f"Meta test failed: {e}")
            return {"success": False, "message": f"Meta connection failed: {str(e)}"}

    # ── TEST AI ──────────────────────────────────────

    async def test_ai(self) -> Dict[str, Any]:
        """Send a test prompt to Groq and return the response."""
        settings_data = await self.get_settings("AI")
        api_key = settings_data.get("groq_api_key", "")
        model = settings_data.get("groq_model", "llama-3.3-70b-versatile")

        # Fall back to env vars if DB settings are empty
        if not api_key:
            from app.core.config import settings as app_settings
            api_key = app_settings.GROQ_API_KEY

        if not api_key:
            return {"success": False, "message": "Groq API key not configured"}

        try:
            from groq import Groq
            client = Groq(api_key=api_key)
            completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "Reply in one short sentence."},
                    {"role": "user", "content": "Say hello and confirm you are working."},
                ],
                model=model,
                temperature=0.5,
                max_tokens=60,
            )
            response = completion.choices[0].message.content.strip()
            return {
                "success": True,
                "message": "AI responded successfully",
                "details": {"response": response, "model": model},
            }
        except Exception as e:
            logger.error(f"AI test failed: {e}")
            return {"success": False, "message": f"AI test failed: {str(e)}"}

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

            if k == "whatsapp_accounts":
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
                except:
                    masked[k] = "••••••••"
            elif k in SENSITIVE_KEYS:
                masked[k] = v[:4] + "••••" if len(v) > 4 else "••••"
            else:
                masked[k] = v
        return masked
