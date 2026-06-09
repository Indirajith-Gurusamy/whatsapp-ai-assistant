"""Live CRM context for Vivafy — customer lookup, message counts, action inference."""
from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.core.constants import MESSAGE_ROLE_USER
from app.db.client import get_db

logger = logging.getLogger(__name__)

_EMOJI_RE = re.compile(
    r"[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0000FE00-\U0000FEFF]",
    re.UNICODE,
)
_NAME_NOISE = frozenset({
    "the", "a", "an", "to", "and", "or", "for", "me", "my", "it", "is", "this",
    "that", "name", "customer", "customers", "lead", "leads", "guy", "person",
    "first", "open", "go", "find", "out", "count", "messages", "message", "then",
    "just", "do", "please", "ok", "oper", "fisrt", "iut", "tomcustomers",
    "user", "management", "admin", "settings", "dashboard", "profile", "audit",
    "automation", "crm", "system", "sessions", "management",
    "members", "member", "role", "roles", "accounts", "account", "many", "how",
    "find", "with", "update", "status", "follow", "mark", "assign", "send",
    "toggle", "each", "every", "per", "all", "received", "instead", "them",
    "instead", "can", "you", "said", "got", "there", "stupid", "just",
})

_INFO_QUERY_RE = re.compile(
    r"\b(?:how many|count|number of|total|find|list|show|who|what)\b",
    re.IGNORECASE,
)
_ROLE_CHANGE_RE = re.compile(
    r"\b(?:make|promote|set|change|turn|revert|demote)\b",
    re.IGNORECASE,
)
_ROLE_SQUISH_RE = re.compile(
    r"(?:make|promote|set|change|turn|revert|demote)(\w{2,24}?)(admin|user)$",
    re.IGNORECASE,
)
_ROLE_VERBS = r"(?:make|promote|set|change|turn|revert|demote)"


def _squish_alnum(text: str) -> str:
    s = re.sub(r"[^a-z0-9]", "", (text or "").lower())
    if s.startswith("mak") and not s.startswith("make"):
        s = "make" + s[3:]
    if s.startswith("rev") and not s.startswith("revert"):
        s = "revert" + s[3:]
    return s

_ROLE_TARGET_RE = [
    re.compile(
        rf"\b{_ROLE_VERBS}\s+(?:the\s+)?(?:role\s+)?(?:for\s+)?(?:user\s+)?(\w{{2,24}})\s+(?:as\s+|to\s+)?(?:an?\s+)?(admin|user)\b",
        re.I,
    ),
    re.compile(
        rf"\b(?:role\s+)?(?:for|of)\s+(?:the\s+)?(?:user\s+)?(\w{{2,24}})\s+from\s+admin\s+to\s+user\b",
        re.I,
    ),
    re.compile(
        rf"\b(?:role\s+)?(?:for|of)\s+(?:the\s+)?(?:user\s+)?(\w{{2,24}})\s+from\s+user\s+to\s+admin\b",
        re.I,
    ),
    re.compile(
        rf"\b{_ROLE_VERBS}\s+(?:the\s+)?role\s+(?:for|of)\s+(\w{{2,24}})\b.*\bto\s+user\b",
        re.I,
    ),
    re.compile(
        rf"\b{_ROLE_VERBS}\s+(?:the\s+)?role\s+(?:for|of)\s+(\w{{2,24}})\b.*\bto\s+admin\b",
        re.I,
    ),
    re.compile(
        rf"\b(\w{{2,24}})\s+from\s+admin\s+to\s+user\b",
        re.I,
    ),
    re.compile(
        rf"\b(\w{{2,24}})\s+from\s+user\s+to\s+admin\b",
        re.I,
    ),
]

_TEAM_QUERY_RE = re.compile(
    r"\b(?:"
    r"(?:how many|count|number of|total|find|list).*(?:members?|users?|admins?|accounts?)|"
    r"(?:members?|users?|admins?|accounts?).*(?:role|count|how many)|"
    r"role\s+(?:user|admin)s?|team\s+members?"
    r")\b",
    re.IGNORECASE,
)

# App pages — not customer names (e.g. "user management" ≠ customer "User")
_PAGE_NAV_RE = re.compile(
    r"\b(?:"
    r"user\s*management|admin\s+users?|system\s+settings|settings|"
    r"dashboard|leads?|conversations|messages?|customers?(?:\s+(?:list|page))?|"
    r"tasks?|task\s+(?:page|list|board)|"
    r"email\s+settings?|settings\s+email|knowledge\s+base|quick\s+replies?|"
    r"profile|audit(?:\s+log)?|automation|crm|active\s+sessions"
    r")\b",
    re.IGNORECASE,
)

_PAGE_PATH_RULES: List[tuple] = [
    (re.compile(r"\buser\s*management\b", re.I), "/admin/users", "User Management"),
    (re.compile(r"\badmin\s+users?\b", re.I), "/admin/users", "User Management"),
    (re.compile(r"\b(?:ai\s+settings?|settings\s+ai)\b", re.I), "/settings?tab=ai", "AI Settings"),
    (re.compile(r"\b(?:whatsapp\s+settings?|settings\s+whatsapp)\b", re.I), "/settings?tab=whatsapp", "WhatsApp Settings"),
    (re.compile(r"\b(?:email\s+settings?|settings\s+email)\b", re.I), "/settings?tab=email", "Email Settings"),
    (re.compile(r"\b(?:knowledge\s+base|kb)\b", re.I), "/settings?tab=ai", "Knowledge Base"),
    (re.compile(r"\bquick\s+replies?\b", re.I), "/settings?tab=ai", "Quick Replies"),
    (re.compile(r"\b(?:automation(?:\s+settings?)?|settings\s+automation)\b", re.I), "/settings?tab=automation", "Automation"),
    (re.compile(r"\b(?:crm\s+settings?|settings\s+crm)\b", re.I), "/settings?tab=crm", "CRM Settings"),
    (re.compile(r"\b(?:audit(?:\s+log)?|settings\s+audit)\b", re.I), "/settings?tab=audit", "Audit log"),
    (re.compile(r"\b(?:system\s+)?settings\b", re.I), "/settings", "Settings"),
    (re.compile(r"\bdashboard\b", re.I), "/dashboard", "Dashboard"),
    (re.compile(r"\b(?:leads?|conversations)\b", re.I), "/conversations", "Leads"),
    (re.compile(r"\bmessages?\b", re.I), "/messages", "Messages"),
    (re.compile(r"\bcustomers?\b", re.I), "/customers", "Customers"),
    (re.compile(r"\btasks\b", re.I), "/tasks", "Tasks"),
    (re.compile(r"\bprofile\b", re.I), "/profile", "Profile"),
    (re.compile(r"\bactive\s+sessions\b", re.I), "/settings/sessions", "Active Sessions"),
]

_THIS_PAGE_RE = re.compile(r"\b(this page|that page|current page|here)\b", re.I)
_TOGGLE_AI_RE = re.compile(
    r"\b(?:turn\s+off|disable|stop)\b.*\bai\b|\b(?:turn\s+on|enable|start)\b.*\bai\b|\bai\s+(?:off|on)\b",
    re.I,
)
_ASSIGN_LEAD_RE = re.compile(
    r"\bassign\b.*\b(?:to|lead)\b|\bassign\s+(?:this\s+)?lead\b",
    re.I,
)
_STATUS_CHANGE_RE = re.compile(
    r"\b(?:mark|set|update)\b.*\b(?:as|to|status)\b|\bstatus\s+(?:to|as)\b",
    re.I,
)
_SEND_MSG_RE = re.compile(
    r"\b(?:send|reply|message)\b.*(?::|to\s+\w|\bwith\b)",
    re.I,
)
_USER_DISABLE_RE = re.compile(r"\b(?:disable|deactivate|enable|activate)\b.*\b(?:user|account)\b", re.I)
_USER_VERIFY_RE = re.compile(r"\bverify\b.*\b(?:email|user|account)\b", re.I)
_USER_DELETE_RE = re.compile(r"\bdelete\b.*\buser\b", re.I)

_LEAD_STATUSES = [
    "application sent", "application in", "new lead", "assigned", "follow up",
    "on hold", "nurture", "duplicate", "closed", "lost",
    "inbox", "lead only",
]

_FIRST_PERSON_RE = re.compile(
    r"\b(?:first|1st)\s+(?:guy|customer|lead|person|one|entry)\b",
    re.IGNORECASE,
)
_NAME_HINT_RE = [
    re.compile(r"this is the name[:\s]+(.+)", re.I),
    re.compile(r"(?:named?|called)\s+[\"']?([^\"'\n,]+)", re.I),
    re.compile(r"~\s*([a-z][\w\s]{1,30})", re.I),
    re.compile(r"\bopen\s+(?:the\s+)?(?:customer\s+)?([a-z][\w]{2,24})\b", re.I),
    re.compile(r"\bcustomer\s+([a-z][\w]{2,24})\b", re.I),
]


@dataclass
class CustomerSnapshot:
    uuid: str
    name: str
    phone: str
    message_count: int
    conversation_uuid: Optional[str]
    list_index: int  # 1-based position in default customer list order


@dataclass
class TeamStats:
    total: int
    admins: int
    users: int
    active: int
    verified: int
    members: List[Dict[str, Any]]


@dataclass
class AssistantLiveContext:
    customers: List[CustomerSnapshot] = field(default_factory=list)
    total_customers: int = 0
    team_stats: Optional[TeamStats] = None
    active_conversation_uuid: Optional[str] = None
    active_customer_uuid: Optional[str] = None
    pathname: Optional[str] = None
    prompt_block: str = ""


def _combined_user_text(
    message: str, history: Optional[List[Dict[str, str]]]
) -> str:
    parts = [message]
    if history:
        for item in reversed(history[-6:]):
            if item.get("role") == "user":
                parts.append(item.get("content") or "")
    return " ".join(parts)


def _is_informational_query(message: str) -> bool:
    """Count/list questions — not open/go/show navigation to an app page."""
    if _wants_count(message):
        return True
    if (_is_page_navigation(message) or _wants_go_command(message)) and not _wants_team_query(
        message, None, None
    ):
        return False
    return bool(_INFO_QUERY_RE.search(message or ""))


def _wants_analytics(message: str) -> bool:
    return bool(
        re.search(
            r"\b(?:analytics|dashboard\s+stats?|pipeline\s+stats?|show\s+stats|summary)\b",
            message or "",
            re.I,
        )
    )


def _wants_logout(message: str) -> bool:
    lower = (message or "").lower()
    if re.search(r"\b(?:logout|log\s*out|sign\s*out|log\s*off|sign\s*off)\b", lower):
        return True
    squish = re.sub(r"[^a-z]", "", lower)
    if re.search(r"(?:logout|lkogout|logut|signout|logoff)", squish):
        return True
    if re.search(r"log[o0]?out", squish):
        return True
    return False


def _wants_refresh(message: str) -> bool:
    lower = (message or "").lower()
    if re.search(r"\b(?:refresh|reload)\b", lower):
        return True
    if re.search(r"refre{1,2}sh|refrsh|rfresh", lower):
        return True
    if re.search(r"\b(?:reload|hard\s+refresh)\b", lower):
        return True
    return False


def _wants_role_change(message: str, history: Optional[List[Dict[str, str]]]) -> bool:
    """Role intent from the **current** message only — avoids bleed from prior turns."""
    if _wants_refresh(message):
        return False
    msg = message or ""
    if re.search(r"\bfrom\s+admin\s+to\s+user\b", msg, re.I):
        return True
    if re.search(r"\bfrom\s+user\s+to\s+admin\b", msg, re.I):
        return True
    if _ROLE_CHANGE_RE.search(msg) and re.search(r"\b(?:admin|user)\b", msg, re.I):
        return True
    if re.search(r"\brevert\b.*\brole\b", msg, re.I):
        return True
    if _ROLE_SQUISH_RE.search(_squish_alnum(msg)):
        return True
    return False


def _find_team_member(name_hint: str, members: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    hint = name_hint.lower()
    if hint in _NAME_NOISE:
        return None
    for m in members:
        n = (m.get("name") or "").lower()
        e = (m.get("email") or "").lower().split("@")[0]
        if hint == n or hint == e:
            return m
        if hint in n or n.startswith(hint) or hint in e or e.startswith(hint):
            return m
    if len(hint) >= 4:
        prefix = hint[:4]
        for m in members:
            n = (m.get("name") or "").lower()
            e = (m.get("email") or "").lower().split("@")[0]
            if n.startswith(prefix) or e.startswith(prefix) or prefix in n:
                return m
    return None


def _parse_role_change(
    message: str,
    history: Optional[List[Dict[str, str]]],
    members: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Parse role change from current message; squish handles typos like 'mak ejithey user'."""
    sources = [message]
    if history and len(message.strip()) < 20:
        sources.append(_combined_user_text(message, history))

    for src in sources:
        for pattern in _ROLE_TARGET_RE:
            match = pattern.search(src)
            if not match:
                continue
            name_hint = match.group(1)
            snippet = match.group(0).lower()
            if match.lastindex and match.lastindex >= 2 and match.group(2):
                role_word = match.group(2).upper()
            elif "from admin to user" in snippet or "to user" in snippet:
                role_word = "USER"
            else:
                role_word = "ADMIN"
            member = _find_team_member(name_hint, members)
            if member:
                return _role_action(member, role_word)

        squish = _squish_alnum(src)
        match = _ROLE_SQUISH_RE.search(squish)
        if match:
            name_hint, role_word = match.group(1), match.group(2).upper()
            member = _find_team_member(name_hint, members)
            if member:
                return _role_action(member, role_word)
    return None


def _role_action(member: Dict[str, Any], role_word: str) -> Dict[str, Any]:
    return {
        "type": "change_user_role",
        "user_id": member["id"],
        "role": role_word,
        "label": f"Set {member['name']} to {role_word}",
    }


def _wants_team_query(
    message: str,
    history: Optional[List[Dict[str, str]]],
    pathname: Optional[str] = None,
) -> bool:
    combined = _combined_user_text(message, history)
    if _TEAM_QUERY_RE.search(combined):
        return True
    if _wants_role_change(message, history):
        return True
    if (
        pathname
        and pathname.startswith("/admin/users")
        and _is_informational_query(message)
    ):
        return True
    return False


def _normalize_nav_text(text: str) -> str:
    t = (text or "").lower()
    t = re.sub(r"user\s*management|usermanagement|user-management", "user management", t)
    t = re.sub(r"dashbaord|dashbord|dashb\s*oard", "dashboard", t)
    return t


def _wants_go_command(message: str) -> bool:
    return bool(
        re.search(
            r"\b(?:go|goto|got|open|take me|navigate|bring me|show me|then|just)\b",
            message or "",
            re.I,
        )
    )


def _is_affirmation(message: str) -> bool:
    t = (message or "").strip()
    if re.match(
        r"^(yes|yeah|yep|yup|ok|okay|sure|do it|go|go ahead|please|correct|just go|go there)\.?$",
        t,
        re.I,
    ):
        return True
    return bool(re.search(r"\b(?:just\s+go|go\s+there|do\s+it\s+now)\b", t, re.I))


_EXPLICIT_PATH_RE = re.compile(
    r"/(?:dashboard|admin/users(?:/\d+)?|settings(?:/sessions)?(?:\?[^\s)>]+)?|"
    r"conversations|messages|customers(?:/[^\s)>]+)?|tasks|profile)",
    re.I,
)

_PATH_LABELS: Dict[str, str] = {
    "/dashboard": "Dashboard",
    "/admin/users": "User Management",
    "/settings": "Settings",
    "/settings/sessions": "Active Sessions",
    "/conversations": "Leads",
    "/messages": "Messages",
    "/customers": "Customers",
    "/tasks": "Tasks",
    "/profile": "Profile",
}


def _label_for_path(path: str) -> str:
    base = path.split("?")[0].rstrip("/") or path
    if base in _PATH_LABELS:
        return _PATH_LABELS[base]
    if base.startswith("/admin/users/"):
        return "User profile"
    if base.startswith("/customers/"):
        return "Customer"
    if path.startswith("/settings?"):
        return "Settings"
    return path


_ENABLE_SETTING_RE = re.compile(
    r"\b(?:enable|turn on|switch on|activate)\b", re.I
)
_DISABLE_SETTING_RE = re.compile(
    r"\b(?:disable|turn off|switch off|deactivate)\b", re.I
)

# (pattern, category, setting_key, human label)
_SETTINGS_TOGGLE_RULES: List[tuple] = [
    (
        re.compile(
            r"\b(?:email\s+ingestion|email\s+polling|gmail\s+(?:inbox|polling)|imap(?:\s+polling)?)\b",
            re.I,
        ),
        "EMAIL",
        "email_enabled",
        "email ingestion",
    ),
    (
        re.compile(r"\b(?:create\s+customers?\s+from\s+emails?|email\s+customers?)\b", re.I),
        "EMAIL",
        "email_create_customers",
        "create customers from email",
    ),
    (
        re.compile(r"\b(?:assign\s+emails?\s+to\s+leads?|email\s+leads?)\b", re.I),
        "EMAIL",
        "email_assign_to_leads",
        "assign emails to leads",
    ),
    (
        re.compile(r"\b(?:auto[\-\s]?assign\s+leads?|automatic\s+lead\s+assign)\b", re.I),
        "CRM",
        "auto_assign_lead",
        "auto-assign leads",
    ),
    (
        re.compile(r"\b(?:human\s+handover|agent\s+handover)\b", re.I),
        "AUTOMATION",
        "human_handover",
        "human handover",
    ),
    (
        re.compile(r"\b(?:customer\s+service\s+window|service\s+window)\b", re.I),
        "AUTOMATION",
        "customer_service_window",
        "customer service window",
    ),
]


def _parse_settings_update_command(message: str) -> Optional[Dict[str, Any]]:
    """Deterministic enable/disable for known Settings toggles."""
    text = message or ""
    enable = bool(_ENABLE_SETTING_RE.search(text))
    disable = bool(_DISABLE_SETTING_RE.search(text))
    if enable == disable:
        return None
    value = "true" if enable else "false"
    for pattern, category, key, label in _SETTINGS_TOGGLE_RULES:
        if pattern.search(text):
            return {
                "type": "update_settings",
                "settings_category": category,
                "settings": {key: value},
                "label": f"{'Enable' if enable else 'Disable'} {label}",
            }
    return None


def _pending_actions_from_history(history: Optional[List[Dict[str, str]]]) -> List[Dict[str, Any]]:
    """Recover executable actions from the last assistant turn (content-only history)."""
    from app.modules.ai.assistant_tools import parse_actions_from_reply

    if not history:
        return []
    for msg in reversed(history):
        if msg.get("role") != "assistant":
            continue
        content = msg.get("content") or ""
        _, parsed = parse_actions_from_reply(content)
        if parsed:
            return parsed
        seen: set = set()
        actions: List[Dict[str, Any]] = []
        for match in _EXPLICIT_PATH_RE.finditer(content):
            path = match.group(0)
            if path in seen:
                continue
            seen.add(path)
            label = _label_for_path(path)
            actions.append({"type": "navigate", "path": path, "label": f"Open {label}"})
        if actions:
            return actions
        pages = _resolve_all_page_paths(content)
        if pages:
            return [
                {"type": "navigate", "path": path, "label": f"Open {label}"}
                for path, label in pages
            ]
    return []


def _pending_nav_from_history(history: Optional[List[Dict[str, str]]]) -> List[Dict[str, Any]]:
    """Backward-compatible alias — returns any pending actions from assistant history."""
    return _pending_actions_from_history(history)


def _resolve_all_page_paths(message: str) -> List[tuple]:
    """All pages mentioned in message, in order of appearance."""
    normalized = _normalize_nav_text(message)
    hits: List[tuple] = []
    for pattern, path, label in _PAGE_PATH_RULES:
        for match in pattern.finditer(normalized):
            hits.append((match.start(), path, label))
    hits.sort(key=lambda x: x[0])
    seen: set = set()
    out: List[tuple] = []
    for _, path, label in hits:
        if path not in seen:
            seen.add(path)
            out.append((path, label))
    return _dedupe_settings_nav_paths(out)


def _dedupe_settings_nav_paths(paths: List[tuple]) -> List[tuple]:
    """Bare /settings after a tab URL would reset the tab — keep the specific tab only."""
    has_tab = any(p.startswith("/settings?tab=") for p, _ in paths)
    if not has_tab:
        return paths
    return [(p, l) for p, l in paths if p != "/settings"]


def _is_page_navigation(text: str) -> bool:
    if _wants_role_change(text, None):
        return False
    if _wants_logout(text):
        return False
    if _wants_crm_conversation_action(text):
        return False
    return bool(_PAGE_NAV_RE.search(_normalize_nav_text(text)))


async def _conversation_uuid_from_pathname(pathname: Optional[str]) -> tuple:
    """Return (conversation_uuid, customer_uuid) from current page URL if on a detail view."""
    if not pathname:
        return None, None
    customer_match = re.search(r"/customers/([^/?#]+)", pathname)
    if customer_match:
        customer_uuid = customer_match.group(1)
        db = await get_db()
        customer = await db.customer.find_first(where={"uuid": customer_uuid})
        if customer:
            conv_uuid = await _latest_conversation_uuid(customer.id)
            return conv_uuid, customer_uuid
    return None, None


def _parse_lead_status(message: str) -> Optional[str]:
    lower = (message or "").lower()
    for status in _LEAD_STATUSES:
        if status in lower:
            return status
    return None


def _parse_send_message(message: str) -> Optional[str]:
    for pattern in (
        re.compile(r"\b(?:send|reply|message)\s*(?:to\s+\w+)?[:\s]+(.+)", re.I | re.S),
        re.compile(r"\bsay\s+(.+)", re.I | re.S),
    ):
        match = pattern.search(message or "")
        if match:
            text = match.group(1).strip().strip('"\'')
            if len(text) >= 1:
                return text[:2000]
    return None


def _parse_assignee_email(message: str, members: List[Dict[str, Any]]) -> Optional[str]:
    msg = message or ""
    email_match = re.search(r"[\w.+-]+@[\w.-]+\.\w+", msg)
    if email_match:
        return email_match.group(0)
    for pattern in (
        re.compile(r"\bassign\b.*?\bto\s+([a-z][\w]{1,24})\b", re.I),
        re.compile(r"\blead\s+to\s+([a-z][\w]{1,24})\b", re.I),
        re.compile(r"\bto\s+([a-z][\w]{1,24})\s*$", re.I),
    ):
        match = pattern.search(msg)
        if match:
            hint = match.group(1).lower()
            if hint in _NAME_NOISE:
                continue
            member = _find_team_member(hint, members)
            if member and member.get("email"):
                return member["email"]
    for word in reversed(_clean_token(msg).split()):
        if word in _NAME_NOISE:
            continue
        member = _find_team_member(word, members)
        if member and member.get("email"):
            return member["email"]
    return None


def _member_name_for_email(email: str, members: List[Dict[str, Any]]) -> str:
    email_lower = (email or "").lower()
    for m in members:
        if (m.get("email") or "").lower() == email_lower:
            return m.get("name") or email
    return email


def _wants_toggle_ai(message: str) -> bool:
    return bool(_TOGGLE_AI_RE.search(message or ""))


def _ai_enabled_from_message(message: str) -> bool:
    lower = (message or "").lower()
    if re.search(r"\b(?:turn\s+on|enable|start|on)\b", lower):
        return True
    return False


def _wants_user_status_toggle(message: str) -> bool:
    return bool(_USER_DISABLE_RE.search(message or ""))


def _wants_verify_user(message: str) -> bool:
    return bool(_USER_VERIFY_RE.search(message or ""))


def _wants_delete_user(message: str) -> bool:
    return bool(_USER_DELETE_RE.search(message or ""))


def _user_active_from_message(message: str) -> bool:
    lower = (message or "").lower()
    return bool(re.search(r"\b(?:enable|activate)\b", lower))


def _resolve_page_path(message: str) -> Optional[tuple]:
    """Return (path, label) for a known app page mention."""
    pages = _resolve_all_page_paths(message)
    return pages[0] if pages else None


def _clean_token(text: str) -> str:
    text = _EMOJI_RE.sub("", text or "")
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    return " ".join(text.lower().split())


def _extract_name_hints(message: str, history: Optional[List[Dict[str, str]]]) -> List[str]:
    hints: List[str] = []
    sources = [message]
    if history:
        for item in reversed(history[-8:]):
            if item.get("role") == "user":
                sources.append(item.get("content") or "")

    for src in sources:
        if _is_page_navigation(src):
            continue
        if _FIRST_PERSON_RE.search(src):
            hints.append("__first__")
        for pattern in _NAME_HINT_RE:
            for match in pattern.finditer(src):
                raw = match.group(1).strip()
                token = _clean_token(raw)
                if token and token not in _NAME_NOISE and len(token) >= 2:
                    hints.append(token)
        # Standalone name after stripping noise words
        for word in _clean_token(src).split():
            if len(word) >= 3 and word not in _NAME_NOISE and word.isalpha():
                hints.append(word)

    seen: set[str] = set()
    unique: List[str] = []
    for h in hints:
        if h not in seen:
            seen.add(h)
            unique.append(h)
    return unique[:6]


async def _message_count(customer_id: int) -> int:
    """Inbound WhatsApp messages received from this customer."""
    db = await get_db()
    convs = await db.conversation.find_many(where={"customerId": customer_id})
    if not convs:
        return 0
    conv_ids = [c.id for c in convs]
    return await db.message.count(
        where={"conversationId": {"in": conv_ids}, "role": MESSAGE_ROLE_USER},
    )


async def _latest_conversation_uuid(customer_id: int) -> Optional[str]:
    db = await get_db()
    conv = await db.conversation.find_first(
        where={"customerId": customer_id},
        order={"updatedAt": "desc"},
    )
    return conv.uuid if conv else None


async def _build_snapshot(customer, list_index: int) -> CustomerSnapshot:
    count = await _message_count(customer.id)
    conv_uuid = await _latest_conversation_uuid(customer.id)
    return CustomerSnapshot(
        uuid=str(customer.uuid),
        name=(customer.name or "Unknown").strip(),
        phone=customer.phone or "",
        message_count=count,
        conversation_uuid=conv_uuid,
        list_index=list_index,
    )


async def _search_by_name(name_hint: str, limit: int = 5) -> List[CustomerSnapshot]:
    db = await get_db()
    customers = await db.customer.find_many(
        where={"name": {"contains": name_hint, "mode": "insensitive"}},
        order={"createdAt": "asc"},
        take=limit,
    )
    results: List[CustomerSnapshot] = []
    for i, c in enumerate(customers, start=1):
        results.append(await _build_snapshot(c, i))
    return results


async def _load_team_stats() -> TeamStats:
    from app.db.prisma.enums import UserRole

    db = await get_db()
    total = await db.user.count()
    admins = await db.user.count(where={"role": UserRole.ADMIN})
    users = await db.user.count(where={"role": UserRole.USER})
    active = await db.user.count(where={"isActive": True})
    verified = await db.user.count(where={"emailVerified": True})
    rows = await db.user.find_many(order={"name": "asc"}, take=30)
    members = [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": str(u.role),
            "active": u.isActive,
            "verified": u.emailVerified,
        }
        for u in rows
    ]
    return TeamStats(
        total=total,
        admins=admins,
        users=users,
        active=active,
        verified=verified,
        members=members,
    )


def _format_team_prompt(stats: TeamStats, pathname: Optional[str]) -> str:
    lines = [
        "## Live team data (dashboard accounts — NOT WhatsApp customers)",
        f"Total accounts: **{stats.total}** | USER role: **{stats.users}** | "
        f"ADMIN role: **{stats.admins}** | Active: **{stats.active}** | "
        f"Verified: **{stats.verified}**",
        "Answer count questions using these numbers. Do NOT tell the user to check the page manually.",
        "Do NOT use `open_customer` for team members — they are not WhatsApp customers.",
        "For role changes use `change_user_role` with numeric `user_id` from this list.",
    ]
    if pathname:
        lines.append(f"Current page: {pathname}")
    lines.append("")
    for m in stats.members:
        lines.append(
            f"- user_id: **{m['id']}** | **{m['name']}** ({m['email']}) — role {m['role']}, "
            f"active={'yes' if m['active'] else 'no'}"
        )
    return "\n".join(lines)


async def _first_customer() -> Optional[CustomerSnapshot]:
    db = await get_db()
    customer = await db.customer.find_first(order={"createdAt": "asc"})
    if not customer:
        return None
    return await _build_snapshot(customer, 1)


async def build_live_context(
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
    user_role: str = "USER",
    pathname: Optional[str] = None,
) -> AssistantLiveContext:
    """Query CRM for data relevant to the user's question."""
    role = (user_role or "USER").upper()
    if role != "ADMIN":
        conv_uuid, cust_uuid = await _conversation_uuid_from_pathname(pathname)
        return AssistantLiveContext(
            active_conversation_uuid=conv_uuid,
            active_customer_uuid=cust_uuid,
            pathname=pathname,
            prompt_block=(
                "## Live CRM data\n"
                "User is not ADMIN — customer list and message counts are not available. "
                "Direct them to Leads (/conversations) or ask an admin."
            ),
        )

    conv_uuid, cust_uuid = await _conversation_uuid_from_pathname(pathname)

    if _wants_refresh(message):
        return AssistantLiveContext(
            active_conversation_uuid=conv_uuid,
            active_customer_uuid=cust_uuid,
            pathname=pathname,
            prompt_block=(
                "## Instruction\n"
                "User wants to refresh/reload the current page. "
                "Use `refresh_page` action only. One short confirmation sentence."
            ),
        )

    blocks: List[str] = []
    team_stats: Optional[TeamStats] = None

    if pathname:
        blocks.append(f"## Current page\nPath: `{pathname}`")
        if conv_uuid:
            blocks.append(
                f"Active conversation on this page: `{conv_uuid}` "
                f"(use for toggle_ai, send_message, assign_lead, update_lead_status)."
            )

    if (
        _wants_team_query(message, history, pathname)
        or _wants_role_change(message, history)
        or _ASSIGN_LEAD_RE.search(message)
    ):
        team_stats = await _load_team_stats()
        blocks.append(_format_team_prompt(team_stats, pathname))

    if (
        _is_page_navigation(message)
        and not _is_informational_query(message)
        and not _wants_team_query(message, history, pathname)
    ):
        resolved = _resolve_page_path(message)
        page_hint = (
            f"User wants app page **{resolved[1]}** → use `navigate` to `{resolved[0]}` immediately."
            if resolved
            else "User wants an app page — use `navigate`, not `open_customer`. Do not give manual click instructions."
        )
        blocks.append(f"## Navigation\n{page_hint}")

    if team_stats and _wants_role_change(message, history):
        blocks.append(
            "## Instruction\n"
            "User wants a role change — include `change_user_role` with user_id from team data. "
            "Runs automatically; do not only give manual UI steps."
        )
        return AssistantLiveContext(
            team_stats=team_stats,
            active_conversation_uuid=conv_uuid,
            active_customer_uuid=cust_uuid,
            pathname=pathname,
            prompt_block="\n\n".join(blocks),
        )

    if team_stats and _ASSIGN_LEAD_RE.search(message):
        blocks.append(
            "## Instruction\n"
            "User wants to ASSIGN a lead — use `assign_lead` with conversation_uuid from customer "
            "data and user_email from team data. Do NOT navigate to /conversations."
        )

    if _wants_team_query(message, history, pathname) and _is_informational_query(message):
        blocks.append(
            "## Instruction\n"
            "This is an informational question — answer with team stats above. "
            "Do NOT propose navigate actions."
        )
        return AssistantLiveContext(
            team_stats=team_stats,
            active_conversation_uuid=conv_uuid,
            active_customer_uuid=cust_uuid,
            pathname=pathname,
            prompt_block="\n\n".join(blocks),
        )

    if _is_page_navigation(message) and not _is_informational_query(message):
        if blocks:
            return AssistantLiveContext(
                team_stats=team_stats,
                active_conversation_uuid=conv_uuid,
                active_customer_uuid=cust_uuid,
                pathname=pathname,
                prompt_block="\n\n".join(blocks),
            )
        resolved = _resolve_page_path(message)
        page_hint = (
            f"User wants app page **{resolved[1]}** → navigate to `{resolved[0]}`."
            if resolved
            else "User wants an app page — use `navigate`, not `open_customer`."
        )
        return AssistantLiveContext(
            active_conversation_uuid=conv_uuid,
            active_customer_uuid=cust_uuid,
            pathname=pathname,
            prompt_block=f"## Live CRM data\n{page_hint}",
        )

    db = await get_db()
    total = await db.customer.count()
    hints = _extract_name_hints(message, history)
    matched: List[CustomerSnapshot] = []
    seen_uuids: set[str] = set()

    def add_unique(items: List[CustomerSnapshot]) -> None:
        for item in items:
            if item.uuid not in seen_uuids:
                seen_uuids.add(item.uuid)
                matched.append(item)

    if "__first__" in hints:
        first = await _first_customer()
        if first:
            add_unique([first])

    for hint in hints:
        if hint == "__first__":
            continue
        add_unique(await _search_by_name(hint))

    combined = _combined_user_text(message, history)
    text_lower = message.lower()
    wants_breakdown = _wants_customer_message_breakdown(combined)
    if (
        not matched
        and not _wants_team_query(message, history, pathname)
        and (
            re.search(r"\b(customers?|first)\b", text_lower)
            or wants_breakdown
            or _wants_crm_conversation_action(message)
            or (_wants_count(combined) and re.search(r"\bcustomers?\b", combined.lower()))
        )
    ):
        limit = 25 if wants_breakdown else 8
        rows = await db.customer.find_many(order={"createdAt": "asc"}, take=limit)
        for i, c in enumerate(rows, start=1):
            add_unique([await _build_snapshot(c, i)])

    if not matched and total == 0 and not blocks:
        return AssistantLiveContext(
            total_customers=0,
            prompt_block="## Live CRM data\nNo customers in the database yet.",
        )

    if matched:
        lines = [
            "## Live CRM data (WhatsApp customers — use these exact UUIDs)",
            f"Total customers: {total}.",
            "When the user asks for message counts, answer using `message_count` below.",
            "Always use each customer's **name** in your answer — never say Customer #1 or customer #2.",
            "When opening a customer, use `open_customer` with `customer_uuid` from below.",
            "",
        ]
        display_limit = 25 if wants_breakdown else 8
        for c in matched[:display_limit]:
            display = _customer_display_name(c)
            lines.append(
                f"- **{display}** | customer_uuid: `{c.uuid}` | "
                f"conversation_uuid: `{c.conversation_uuid or 'none'}` | "
                f"phone: {c.phone} | inbound_message_count: **{c.message_count}**"
            )
        blocks.append("\n".join(lines))

    if not blocks:
        blocks.append("## Live CRM data\nNo matching records for this question.")

    ctx = AssistantLiveContext(
        customers=matched[: (25 if wants_breakdown else 8)],
        total_customers=total,
        team_stats=team_stats,
        active_conversation_uuid=conv_uuid,
        active_customer_uuid=cust_uuid,
        pathname=pathname,
        prompt_block="\n\n".join(blocks),
    )
    return ctx


def _wants_open_person(message: str) -> bool:
    if _is_page_navigation(message):
        return False
    t = message.lower()
    if _FIRST_PERSON_RE.search(t):
        return True
    if re.search(r"\bopen\s+(?:the\s+)?customer\b", t):
        return True
    if re.search(r"\bopen\s+(?:the\s+)?(?:customer\s+)?[a-z]{3,}\b", t) and not _is_page_navigation(t):
        return True
    if re.search(r"\b(go|take me)\s+to\s+customers?\b", t) and not re.search(
        r"\b(list|page)\b", t
    ):
        return True
    return False


def _wants_count(message: str) -> bool:
    t = message.lower()
    if re.search(r"\b(count|how many|number of|total)\b.*\b(messages?|msgs?)\b", t):
        return True
    return bool(re.search(r"\b(messages?|msgs?)\b.*\b(count|how many|number of|total)\b", t))


def _customer_display_name(snapshot: CustomerSnapshot) -> str:
    name = (snapshot.name or "").strip()
    if name and name.lower() != "unknown":
        return name
    if snapshot.phone:
        return snapshot.phone
    return "Unknown customer"


def _wants_customer_message_breakdown(combined: str) -> bool:
    """Per-customer inbound message counts (incl. follow-ups like 'name them')."""
    t = (combined or "").lower()
    if re.search(r"\b(?:name them|use (?:their )?names?|real names?|instead of #|not #\d)\b", t):
        return True
    if re.search(r"customer\s*#\d", t):
        return True
    if re.search(r"\b(?:how many|count|number of|total)\b", t) and re.search(
        r"\b(?:messages?|msgs?)\b", t
    ):
        if re.search(r"\b(?:each|every|all|per)\b.*\bcustomers?\b", t):
            return True
        if re.search(r"\bcustomers?\b.*\b(?:each|every|all)\b", t):
            return True
    if re.search(r"\b(?:messages?|msgs?)\b.*\b(?:from|by|per)\b.*\bcustomers?\b", t):
        return True
    return False


def _format_customer_message_breakdown(customers: List[CustomerSnapshot]) -> str:
    if not customers:
        return "No customers found in the CRM yet."
    parts = [
        f"**{_customer_display_name(c)}** has sent **{c.message_count}** message"
        f"{'' if c.message_count == 1 else 's'}"
        for c in customers
    ]
    if len(parts) == 1:
        return f"{parts[0]}."
    return f"{', '.join(parts[:-1])}, and {parts[-1]}."


def infer_actions(
    message: str,
    history: Optional[List[Dict[str, str]]],
    actions: List[Dict[str, Any]],
    ctx: AssistantLiveContext,
) -> List[Dict[str, Any]]:
    """Server-side action inference overrides flaky LLM action blocks."""
    if _wants_logout(message):
        return [{"type": "logout", "label": "Sign out"}]

    if _wants_refresh(message):
        return [{"type": "refresh_page", "label": "Refresh page"}]

    if _is_affirmation(message) and history:
        pending = _pending_actions_from_history(history)
        if pending:
            return pending

    settings_action = _parse_settings_update_command(message)
    if settings_action and not _is_informational_query(message):
        return [settings_action]

    if _THIS_PAGE_RE.search(message) and ctx.pathname:
        return [{"type": "navigate", "path": ctx.pathname, "label": "Open this page"}]

    out = [a for a in actions if a.get("type") != "refresh_page"]
    norm_message = _normalize_nav_text(message)

    if ctx.team_stats and _wants_role_change(message, history):
        inferred = _parse_role_change(message, history, ctx.team_stats.members)
        if inferred:
            return [inferred]

    if _is_informational_query(message) and not _wants_role_change(message, history):
        return [
            a for a in out
            if a.get("type") not in ("navigate", "open_customer")
        ]

    conv_uuid = _resolve_conversation_uuid(message, history, ctx)

    if conv_uuid and _ASSIGN_LEAD_RE.search(message) and ctx.team_stats:
        email = _parse_assignee_email(message, ctx.team_stats.members)
        if email:
            assignee = _member_name_for_email(email, ctx.team_stats.members)
            target = _find_customer_by_hints(message, history, ctx.customers or [])
            label = (
                f"Assign {_customer_display_name(target)} to {assignee}"
                if target
                else f"Assign to {assignee}"
            )
            return [{
                "type": "assign_lead",
                "conversation_uuid": conv_uuid,
                "user_email": email,
                "label": label,
            }]

    if conv_uuid and _STATUS_CHANGE_RE.search(message):
        status = _parse_lead_status(message)
        if status:
            return [{
                "type": "update_lead_status",
                "conversation_uuid": conv_uuid,
                "lead_status": status,
                "label": f"Set {status}",
            }]

    if conv_uuid and _TOGGLE_AI_RE.search(message):
        enabled = _ai_enabled_from_message(message)
        return [{
            "type": "toggle_ai",
            "conversation_uuid": conv_uuid,
            "enabled": enabled,
            "label": f"AI {'on' if enabled else 'off'}",
        }]

    if conv_uuid and _SEND_MSG_RE.search(message):
        text = _parse_send_message(message)
        if text:
            return [{
                "type": "send_message",
                "conversation_uuid": conv_uuid,
                "message": text,
                "label": "Send message",
            }]

    if (_is_page_navigation(norm_message) or _wants_go_command(message)) and not _is_informational_query(message):
        out = [a for a in out if a.get("type") != "open_customer"]
        all_pages = _resolve_all_page_paths(message)
        if all_pages:
            server_nav = [a for a in out if a.get("type") == "navigate"]
            if len(server_nav) < len(all_pages):
                out = [a for a in out if a.get("type") != "navigate"]
                for path, label in all_pages:
                    out.append({"type": "navigate", "path": path, "label": f"Open {label}"})
        elif not any(a.get("type") == "navigate" for a in out):
            resolved = _resolve_page_path(norm_message)
            if resolved:
                path, label = resolved
                out.insert(0, {"type": "navigate", "path": path, "label": f"Open {label}"})
        return out

    if not ctx.customers:
        return out

    hints = _extract_name_hints(message, history)
    has_open_customer = any(a.get("type") == "open_customer" for a in actions)
    wants_open = _wants_open_person(message) or bool(
        [h for h in hints if h != "__first__"]
    )

    target: Optional[CustomerSnapshot] = None
    if "__first__" in hints or _FIRST_PERSON_RE.search(message):
        target = ctx.customers[0]
    elif len(ctx.customers) == 1:
        target = ctx.customers[0]
    elif wants_open:
        name_hints = [h for h in hints if h != "__first__"]
        for hint in name_hints:
            for c in ctx.customers:
                if hint in _clean_token(c.name):
                    target = c
                    break
            if target:
                break

    if wants_open and target and not has_open_customer:
        # Drop generic navigate-to-list if we're opening a specific customer
        out = [a for a in out if not (
            a.get("type") == "navigate" and a.get("path") == "/customers"
        )]
        out.insert(
            0,
            {
                "type": "open_customer",
                "customer_uuid": target.uuid,
                "label": f"Open {target.name}",
            },
        )

    return out


def _wants_team_count(combined: str) -> bool:
    t = combined.lower()
    if not _INFO_QUERY_RE.search(t):
        return False
    return bool(
        re.search(r"\b(?:members?|users?|admins?|accounts?|role)\b", t)
    )


def _find_customer_by_hints(
    message: str,
    history: Optional[List[Dict[str, str]]],
    customers: List[CustomerSnapshot],
) -> Optional[CustomerSnapshot]:
    if not customers:
        return None
    if "__first__" in _extract_name_hints(message, history) or _FIRST_PERSON_RE.search(message):
        return customers[0]
    for hint in _extract_name_hints(message, history):
        if hint == "__first__":
            continue
        for c in customers:
            clean_name = _clean_token(c.name)
            if hint in clean_name or hint in _clean_token(c.phone):
                return c
    for match in re.finditer(
        r"\bfor\s+([a-z][\w]{1,24})\s+(?:to|as)\b", message or "", re.I
    ):
        hint = match.group(1).lower()
        if hint in _NAME_NOISE:
            continue
        for c in customers:
            if hint in _clean_token(c.name):
                return c
    return None


def _resolve_conversation_uuid(
    message: str,
    history: Optional[List[Dict[str, str]]],
    ctx: AssistantLiveContext,
) -> Optional[str]:
    if ctx.active_conversation_uuid:
        return ctx.active_conversation_uuid
    if ctx.customers:
        target = _find_customer_by_hints(message, history, ctx.customers)
        if target and target.conversation_uuid:
            return target.conversation_uuid
        for c in ctx.customers:
            if c.conversation_uuid:
                return c.conversation_uuid
    return None


def _wants_crm_conversation_action(message: str) -> bool:
    return bool(
        _STATUS_CHANGE_RE.search(message)
        or _ASSIGN_LEAD_RE.search(message)
        or _SEND_MSG_RE.search(message)
        or _TOGGLE_AI_RE.search(message)
    )


def try_deterministic_reply(
    message: str,
    history: Optional[List[Dict[str, str]]],
    ctx: AssistantLiveContext,
) -> Optional[Dict[str, Any]]:
    """Skip the LLM for unambiguous commands — runs immediately."""
    if _wants_logout(message):
        return {
            "reply": "Signing you out now.",
            "actions": [{"type": "logout", "label": "Sign out"}],
        }

    if _wants_refresh(message):
        return {
            "reply": "Refreshing the page now.",
            "actions": [{"type": "refresh_page", "label": "Refresh page"}],
        }

    combined = _combined_user_text(message, history)
    if _wants_customer_message_breakdown(combined) and ctx.customers:
        return {
            "reply": _format_customer_message_breakdown(ctx.customers),
            "actions": [],
        }

    if _is_affirmation(message):
        pending = _pending_actions_from_history(history)
        if pending:
            if all(a.get("type") == "navigate" for a in pending):
                labels = " → ".join(
                    a.get("label", "").replace("Open ", "") for a in pending
                )
                return {
                    "reply": f"Opening **{labels}**.",
                    "actions": pending,
                }
            return {"reply": "On it.", "actions": pending}
        for item in reversed(history or []):
            if item.get("role") != "assistant":
                continue
            content = item.get("content") or ""
            status = _parse_lead_status(content)
            if status:
                conv_uuid = _resolve_conversation_uuid(message, history, ctx)
                if conv_uuid:
                    return {
                        "reply": f"Updating status to **{status}**.",
                        "actions": [{
                            "type": "update_lead_status",
                            "conversation_uuid": conv_uuid,
                            "lead_status": status,
                            "label": f"Set {status}",
                        }],
                    }
            break

    if _THIS_PAGE_RE.search(message) and ctx.pathname and not _wants_refresh(message):
        return {
            "reply": f"Opening **{ctx.pathname}**.",
            "actions": [{"type": "navigate", "path": ctx.pathname, "label": "Open this page"}],
        }

    if ctx.team_stats and _wants_role_change(message, history):
        inferred = _parse_role_change(message, history, ctx.team_stats.members)
        if inferred:
            label = inferred.get("label", "Updating role")
            name = label.replace("Set ", "").split(" to ")[0] if "Set " in label else "User"
            return {
                "reply": f"Setting **{name}** to role **{inferred['role']}**.",
                "actions": [inferred],
            }

    if ctx.team_stats and _wants_user_status_toggle(message):
        for hint in _extract_name_hints(message, history):
            if hint == "__first__":
                continue
            member = _find_team_member(hint, ctx.team_stats.members)
            if member:
                active = _user_active_from_message(message)
                return {
                    "reply": f"{'Enabling' if active else 'Disabling'} **{member['name']}**.",
                    "actions": [{
                        "type": "toggle_user_status",
                        "user_id": member["id"],
                        "active": active,
                        "label": f"{'Enable' if active else 'Disable'} {member['name']}",
                    }],
                }

    if ctx.team_stats and _wants_verify_user(message):
        for hint in _extract_name_hints(message, history):
            member = _find_team_member(hint, ctx.team_stats.members)
            if member:
                return {
                    "reply": f"Verifying **{member['name']}**.",
                    "actions": [{
                        "type": "verify_user",
                        "user_id": member["id"],
                        "label": f"Verify {member['name']}",
                    }],
                }

    if ctx.team_stats and _wants_delete_user(message):
        for hint in _extract_name_hints(message, history):
            member = _find_team_member(hint, ctx.team_stats.members)
            if member:
                return {
                    "reply": f"Deleting **{member['name']}**.",
                    "actions": [{
                        "type": "delete_user",
                        "user_id": member["id"],
                        "label": f"Delete {member['name']}",
                    }],
                }

    conv_uuid = _resolve_conversation_uuid(message, history, ctx)
    if conv_uuid and _wants_toggle_ai(message):
        enabled = _ai_enabled_from_message(message)
        return {
            "reply": f"Turning AI **{'on' if enabled else 'off'}**.",
            "actions": [{
                "type": "toggle_ai",
                "conversation_uuid": conv_uuid,
                "enabled": enabled,
                "label": f"AI {'on' if enabled else 'off'}",
            }],
        }

    if conv_uuid and _ASSIGN_LEAD_RE.search(message) and ctx.team_stats:
        email = _parse_assignee_email(message, ctx.team_stats.members)
        if email:
            assignee = _member_name_for_email(email, ctx.team_stats.members)
            target = _find_customer_by_hints(message, history, ctx.customers)
            who = f"**{_customer_display_name(target)}** " if target else "lead "
            return {
                "reply": f"Assigning {who}to **{assignee}** (status → **assigned**).",
                "actions": [{
                    "type": "assign_lead",
                    "conversation_uuid": conv_uuid,
                    "user_email": email,
                    "label": f"Assign to {assignee}",
                }],
            }

    if conv_uuid and _STATUS_CHANGE_RE.search(message):
        status = _parse_lead_status(message)
        if status:
            target = _find_customer_by_hints(message, history, ctx.customers)
            who = f"**{_customer_display_name(target)}** " if target else ""
            return {
                "reply": f"Updating {who}status to **{status}**.",
                "actions": [{
                    "type": "update_lead_status",
                    "conversation_uuid": conv_uuid,
                    "lead_status": status,
                    "label": f"Set {status}",
                }],
            }

    if conv_uuid and _SEND_MSG_RE.search(message):
        text = _parse_send_message(message)
        if text:
            return {
                "reply": "Sending your message on WhatsApp.",
                "actions": [{
                    "type": "send_message",
                    "conversation_uuid": conv_uuid,
                    "message": text,
                    "label": "Send message",
                }],
            }

    settings_action = _parse_settings_update_command(message)
    if settings_action and not _is_informational_query(message):
        label = (settings_action.get("label") or "settings").replace("Enable ", "").replace("Disable ", "")
        enabled = next(iter(settings_action["settings"].values())) == "true"
        return {
            "reply": f"{'Enabling' if enabled else 'Disabling'} **{label}**.",
            "actions": [settings_action],
        }

    all_pages = _resolve_all_page_paths(message)
    if all_pages and (
        _is_page_navigation(message)
        or _wants_go_command(message)
    ) and not _is_informational_query(message):
        actions = [
            {"type": "navigate", "path": path, "label": f"Open {label}"}
            for path, label in all_pages
        ]
        labels = " → ".join(label for _, label in all_pages)
        return {
            "reply": f"Opening **{labels}**.",
            "actions": actions,
        }

    return None


def enrich_reply_with_counts(
    message: str,
    history: Optional[List[Dict[str, str]]],
    reply: str,
    ctx: AssistantLiveContext,
) -> str:
    """Prepend factual counts from live CRM / team data when available."""
    combined = _combined_user_text(message, history)

    if ctx.team_stats and _wants_team_count(combined):
        stats = ctx.team_stats
        t = combined.lower()
        if re.search(r"\badmin", t):
            fact = f"There are **{stats.admins}** accounts with role **ADMIN**."
        elif re.search(r"\buser(?:s)?\b", t) and "customer" not in t:
            fact = (
                f"There are **{stats.users}** team members with role **USER** "
                f"(**{stats.total}** accounts total, **{stats.admins}** ADMIN)."
            )
        else:
            fact = (
                f"Team accounts: **{stats.total}** total — "
                f"**{stats.users}** USER, **{stats.admins}** ADMIN."
            )
        if str(stats.users) not in reply and str(stats.admins) not in reply:
            return f"{fact}\n\n{reply}".strip()

    if _wants_customer_message_breakdown(combined) and ctx.customers:
        formatted = _format_customer_message_breakdown(ctx.customers)
        if re.search(r"customer\s*#\d", reply, re.I) or formatted != reply:
            return formatted

    if not _wants_count(combined) or not ctx.customers:
        return reply

    if len(ctx.customers) > 1 and _wants_customer_message_breakdown(combined):
        return _format_customer_message_breakdown(ctx.customers)

    target = ctx.customers[0] if len(ctx.customers) == 1 else None
    if not target:
        hints = [h for h in _extract_name_hints(combined, None) if h != "__first__"]
        for hint in hints:
            for c in ctx.customers:
                if hint in _clean_token(c.name):
                    target = c
                    break
            if target:
                break

    if target:
        display = _customer_display_name(target)
        fact = (
            f"**{display}** has sent **{target.message_count}** "
            f"message{'s' if target.message_count != 1 else ''}."
        )
        if str(target.message_count) not in reply or re.search(r"customer\s*#\d", reply, re.I):
            return f"{fact}\n\n{reply}".strip()
    return reply
