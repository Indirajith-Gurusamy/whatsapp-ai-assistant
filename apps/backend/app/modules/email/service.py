"""Email ingest orchestration — save inbound emails to CRM."""
import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Any, Callable, Dict, List, Optional, TypeVar

from app.core.config import settings as app_settings
from app.core.constants import (
    LEAD_STATUS_INBOX,
    LEAD_STATUS_LEADS_ONLY,
    LEAD_STATUS_NEW,
    MESSAGE_ROLE_USER,
    MESSAGE_STATUS_RECEIVED,
)
from app.db.client import get_db
from app.db.prisma.enums import Channel
from app.modules.conversations.service import ConversationService
from app.modules.email.fetcher import (
    EmailAccountConfig,
    FetchedEmail,
    fetch_unseen_emails,
    mark_email_seen_by_message_id,
    test_imap_connection,
)
from app.modules.email.keyword_rules import match_keyword_lead_status, parse_keyword_rules
from app.modules.email.parser import ParsedEmail, format_crm_message
from app.core.auth_activity import auth_activity_active
from app.modules.settings.service import SettingsService

logger = logging.getLogger(__name__)

INGEST_NEW = "new"
INGEST_EXISTING = "existing"
INGEST_SKIPPED = "skipped"

T = TypeVar("T")

# Dedicated pool so long IMAP work cannot starve the default executor.
_imap_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="email-imap")


async def _run_sync(func: Callable[..., T], *args, **kwargs) -> T:
    """Run blocking IMAP code off the asyncio event loop."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_imap_executor, partial(func, *args, **kwargs))


def _parse_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in ("true", "1", "yes", "on")


def _default_email_accounts() -> List[Dict[str, Any]]:
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


async def load_email_settings() -> Dict[str, Any]:
    """Load email settings from DB (with env fallbacks)."""
    db = await get_db()
    svc = SettingsService(db)
    data = await svc.get_settings("EMAIL")

    enabled = _parse_bool(data.get("email_enabled"), default=False)
    try:
        poll_interval = int(data.get("poll_interval_seconds") or app_settings.GMAIL_POLL_INTERVAL_SECONDS or 60)
    except (TypeError, ValueError):
        poll_interval = 60

    accounts_raw = data.get("email_accounts") or "[]"
    try:
        accounts = json.loads(accounts_raw)
    except json.JSONDecodeError:
        accounts = []

    if not accounts:
        accounts = _default_email_accounts()

    create_customers = _parse_bool(data.get("email_create_customers"), default=False)
    assign_to_leads = _parse_bool(data.get("email_assign_to_leads"), default=False)
    keyword_rules = parse_keyword_rules(data.get("email_keyword_rules"))

    return {
        "enabled": enabled,
        "create_customers": create_customers,
        "assign_to_leads": assign_to_leads,
        "keyword_rules": keyword_rules,
        "poll_interval_seconds": max(15, poll_interval),
        "accounts": accounts,
    }


def _resolve_email_lead_status(
    create_customers: bool,
    assign_to_leads: bool,
) -> Optional[str]:
    """Map independent email settings to conversation visibility."""
    if not create_customers and not assign_to_leads:
        return None
    if create_customers and assign_to_leads:
        return LEAD_STATUS_NEW
    if create_customers:
        return LEAD_STATUS_INBOX
    return LEAD_STATUS_LEADS_ONLY


def _apply_keyword_lead_status(
    visibility_status: str,
    *,
    assign_to_leads: bool,
    parsed: ParsedEmail,
    keyword_rules: List[Dict[str, Any]],
) -> str:
    """Apply keyword rules when emails are tracked as leads."""
    if not assign_to_leads or not keyword_rules:
        return visibility_status

    matched = match_keyword_lead_status(parsed, keyword_rules)
    if matched:
        logger.info(
            "Email keyword rule matched — status %r for message %s",
            matched,
            parsed.message_id,
        )
        return matched

    return visibility_status


def _to_account_config(raw: Dict[str, Any]) -> Optional[EmailAccountConfig]:
    email_addr = (raw.get("email") or "").strip()
    password = (raw.get("app_password") or "").strip()
    if not email_addr or not password or password == "••••••••":
        return None
    try:
        port = int(raw.get("imap_port") or 993)
    except (TypeError, ValueError):
        port = 993
    return EmailAccountConfig(
        id=raw.get("id") or email_addr,
        name=raw.get("name") or email_addr,
        email=email_addr,
        app_password=password,
        imap_host=(raw.get("imap_host") or "imap.gmail.com").strip(),
        imap_port=port,
        active=raw.get("active", True),
    )


async def ingest_fetched_email(
    fetched: FetchedEmail,
    account: EmailAccountConfig,
    *,
    create_customers: bool = False,
    assign_to_leads: bool = False,
    keyword_rules: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Save one email to CRM. Returns ingest outcome (new/existing/skipped)."""
    parsed = fetched.parsed
    db = await get_db()
    existing = await db.message.find_unique(where={"externalId": parsed.message_id})
    if existing:
        logger.debug("Email %s already ingested", parsed.message_id)
        return INGEST_EXISTING

    visibility_status = _resolve_email_lead_status(create_customers, assign_to_leads)
    if not visibility_status:
        logger.debug(
            "Skipping email %s — no CRM destination enabled (left unread in Gmail)",
            parsed.message_id,
        )
        return INGEST_SKIPPED

    email_lead_status = _apply_keyword_lead_status(
        visibility_status,
        assign_to_leads=assign_to_leads,
        parsed=parsed,
        keyword_rules=keyword_rules or [],
    )

    customer_id = await ConversationService.get_or_create_customer(
        channel=Channel.EMAIL,
        email=parsed.sender_email,
        name=parsed.sender_name,
    )
    conversation_id = await ConversationService.get_or_create_conversation(
        customer_id,
        channel=Channel.EMAIL,
        email_lead_status=email_lead_status,
        auto_assign=False,
    )
    await ConversationService._maybe_auto_assign_email(conversation_id)

    from app.modules.conversations.repository import ConversationRepository

    repo = ConversationRepository()
    if email_lead_status in (LEAD_STATUS_INBOX, LEAD_STATUS_LEADS_ONLY):
        await repo.sync_email_conversation_visibility(conversation_id, email_lead_status)
    elif assign_to_leads and keyword_rules and match_keyword_lead_status(parsed, keyword_rules):
        await ConversationService.update_status(conversation_id, email_lead_status, None)

    body = format_crm_message(parsed)
    message_id, created = await ConversationService.save_message(
        phone=parsed.sender_email,
        message=body,
        name=parsed.sender_name,
        whatsapp_id=None,
        conversation_id=conversation_id,
        role=MESSAGE_ROLE_USER,
        status=MESSAGE_STATUS_RECEIVED,
        channel=Channel.EMAIL,
        external_id=parsed.message_id,
        timestamp=parsed.date,
        html_body=parsed.html_body,
    )

    if created:
        logger.info(
            "Ingested email from %s (conversation %s, message %s)",
            parsed.sender_email,
            conversation_id,
            message_id,
        )
        return INGEST_NEW

    return INGEST_EXISTING


async def mark_crm_message_read_in_gmail(crm_message_id: int) -> Dict[str, Any]:
    """Mark the Gmail message as read when a user opens it in the CRM."""
    db = await get_db()
    msg = await db.message.find_unique(where={"id": crm_message_id})
    if not msg:
        return {"success": False, "reason": "not_found"}
    if msg.channel != Channel.EMAIL:
        return {"success": False, "reason": "not_email"}
    if not msg.externalId:
        return {"success": False, "reason": "no_external_id"}

    config = await load_email_settings()
    if not config["enabled"]:
        return {"success": False, "reason": "email_disabled"}

    for raw in config["accounts"]:
        if not raw.get("active", True):
            continue
        account = _to_account_config(raw)
        if not account:
            continue
        marked = await _run_sync(mark_email_seen_by_message_id, account, msg.externalId)
        if marked:
            logger.info("Marked CRM message %s as read in Gmail (%s)", crm_message_id, account.email)
            return {"success": True}

    return {"success": False, "reason": "not_found_in_gmail"}


async def poll_all_accounts() -> Dict[str, int]:
    """Poll all active email accounts. Returns fetch/ingest stats for this cycle."""
    config = await load_email_settings()
    stats = {"fetched": 0, INGEST_NEW: 0, INGEST_EXISTING: 0, INGEST_SKIPPED: 0}

    if not config["enabled"]:
        return stats

    if not config["create_customers"] and not config["assign_to_leads"]:
        # Do not touch Gmail — fetching skipped emails used to mark them read via IMAP.
        return stats

    for raw in config["accounts"]:
        if not raw.get("active", True):
            continue
        account = _to_account_config(raw)
        if not account:
            logger.warning("Skipping email account with missing credentials: %s", raw.get("id"))
            continue

        fetched_list = await _run_sync(fetch_unseen_emails, account)
        stats["fetched"] += len(fetched_list)
        for fetched in fetched_list:
            if await auth_activity_active():
                logger.info("Stopping email ingest batch — login/auth in progress")
                break
            try:
                outcome = await ingest_fetched_email(
                    fetched,
                    account,
                    create_customers=config["create_customers"],
                    assign_to_leads=config["assign_to_leads"],
                    keyword_rules=config.get("keyword_rules"),
                )
                stats[outcome] = stats.get(outcome, 0) + 1
                # Yield so login/API handlers are not starved during large backlogs.
                await asyncio.sleep(0)
            except Exception as exc:
                logger.error(
                    "Failed to ingest email %s: %s",
                    fetched.parsed.message_id,
                    exc,
                    exc_info=True,
                )

    return stats


async def test_email_connection(account_id: Optional[str] = None) -> Dict[str, Any]:
    """Test IMAP connection for an email account."""
    config = await load_email_settings()
    accounts = config["accounts"]
    if not accounts:
        return {"success": False, "message": "No email accounts configured"}

    target = None
    if account_id:
        target = next((a for a in accounts if a.get("id") == account_id), None)
    else:
        target = next((a for a in accounts if a.get("active", True)), None)

    if not target:
        return {"success": False, "message": "Email account not found"}

    account = _to_account_config(target)
    if not account:
        return {"success": False, "message": "Email or app password missing"}

    success, message = await _run_sync(test_imap_connection, account)
    return {"success": success, "message": message}
