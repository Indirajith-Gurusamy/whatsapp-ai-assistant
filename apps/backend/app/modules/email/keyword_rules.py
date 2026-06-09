"""Match inbound email content to CRM lead statuses via keyword rules."""
import json
import logging
from typing import Any, Dict, List, Optional

from app.modules.email.parser import ParsedEmail

logger = logging.getLogger(__name__)


def parse_keyword_rules(raw: Optional[str]) -> List[Dict[str, Any]]:
    """Parse stored email_keyword_rules JSON."""
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Invalid email_keyword_rules JSON — ignoring")
        return []
    if not isinstance(data, list):
        return []
    return [r for r in data if isinstance(r, dict)]


def _keywords_from_rule(rule: Dict[str, Any]) -> List[str]:
    raw = rule.get("keywords")
    if isinstance(raw, list):
        return [str(k).strip() for k in raw if str(k).strip()]
    if isinstance(raw, str):
        return [k.strip() for k in raw.split(",") if k.strip()]
    return []


def match_keyword_lead_status(
    parsed: ParsedEmail,
    rules: List[Dict[str, Any]],
) -> Optional[str]:
    """Return the first matching lead status from keyword rules (case-insensitive)."""
    if not rules:
        return None

    haystack = f"{parsed.subject}\n{parsed.plain_body}".lower()

    for rule in rules:
        status = (rule.get("lead_status") or "").strip()
        if not status:
            continue
        for keyword in _keywords_from_rule(rule):
            if keyword.lower() in haystack:
                return status

    return None
