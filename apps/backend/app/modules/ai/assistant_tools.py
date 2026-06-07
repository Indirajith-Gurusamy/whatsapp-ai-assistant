"""Vivafy actions — parsed from assistant replies and executed immediately."""
from __future__ import annotations

import json
import re
import logging
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException

from app.core.constants import MESSAGE_ROLE_AGENT, MESSAGE_STATUS_FAILED, MESSAGE_STATUS_SENT
from app.db.client import get_db
from app.modules.conversations.service import ConversationService
from app.modules.whatsapp.sender import WhatsAppService

logger = logging.getLogger(__name__)

ACTIONS_BLOCK_RE = re.compile(r"```actions\s*([\s\S]*?)```", re.IGNORECASE)

ALLOWED_ACTION_TYPES = frozenset({
    "navigate",
    "open_lead",
    "toggle_ai",
    "open_customer",
    "change_user_role",
    "refresh_page",
    "assign_lead",
    "update_lead_status",
    "send_message",
    "toggle_user_status",
    "verify_user",
    "delete_user",
    "open_user",
    "logout",
    "create_user",
    "reset_user_password",
    "update_user_profile",
    "update_settings",
    "switch_ai_provider",
    "get_analytics",
    "create_task",
    "update_task",
    "delete_task",
    "create_customer",
    "bulk_delete_users",
    "bulk_delete_customers",
    "ui_action",
})

_INLINE_ACTION_TYPES = "|".join(sorted(ALLOWED_ACTION_TYPES))
INLINE_ACTION_JSON_RE = re.compile(
    rf"\{{[^{{}}]*\"type\"\s*:\s*\"(?:{_INLINE_ACTION_TYPES})\"[^{{}}]*\}}",
    re.IGNORECASE,
)

_REQUIRED_FIELDS: Dict[str, Tuple[str, ...]] = {
    "navigate": ("path",),
    "open_lead": ("conversation_uuid",),
    "open_customer": ("customer_uuid",),
    "toggle_ai": ("conversation_uuid", "enabled"),
    "change_user_role": ("user_id", "role"),
    "assign_lead": ("conversation_uuid", "user_email"),
    "update_lead_status": ("conversation_uuid", "lead_status"),
    "send_message": ("conversation_uuid", "message"),
    "toggle_user_status": ("user_id", "active"),
    "verify_user": ("user_id",),
    "delete_user": ("user_id",),
    "open_user": ("user_id",),
    "logout": (),
    "create_user": ("email", "password"),
    "reset_user_password": ("user_id",),
    "update_user_profile": ("user_id",),
    "update_settings": ("settings_category",),
    "switch_ai_provider": ("provider_id",),
    "get_analytics": (),
    "create_task": ("task_title",),
    "update_task": ("task_uuid",),
    "delete_task": ("task_uuid",),
    "create_customer": ("phone",),
    "bulk_delete_users": ("user_ids",),
    "bulk_delete_customers": ("customer_uuids",),
    "ui_action": ("ui_target",),
}


def _action_valid(action: Dict[str, Any]) -> bool:
    t = action.get("type")
    if t not in ALLOWED_ACTION_TYPES:
        return False
    if t == "create_task" and not (action.get("task_title") or action.get("title")):
        return False
    if t == "update_settings":
        if not (action.get("settings_category") or action.get("category")):
            return False
        if not (action.get("settings") or action.get("settings_json")):
            return False
    if t == "ui_action" and not (action.get("ui_target") or action.get("target")):
        return False
    required = _REQUIRED_FIELDS.get(t, ())
    for field in required:
        val = action.get(field)
        if field == "task_title" and not val:
            val = action.get("title")
        if field == "settings_category" and not val:
            val = action.get("category")
        if field == "ui_target" and not val:
            val = action.get("target")
        if val is None or val == "" or (isinstance(val, list) and len(val) == 0):
            return False
    if t == "change_user_role" and str(action.get("role", "")).upper() not in ("USER", "ADMIN"):
        return False
    return True


def action_valid(action: Dict[str, Any]) -> bool:
    """Public validator for /assistant/execute and action parsing."""
    return _action_valid(action)


def _parse_action_json(raw: str) -> List[Dict[str, Any]]:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if isinstance(data, list):
        items = data
    elif isinstance(data, dict):
        items = data.get("actions", [data])
    else:
        return []
    return [a for a in items if isinstance(a, dict) and _action_valid(a)]


def parse_actions_from_reply(reply: str) -> Tuple[str, List[Dict[str, Any]]]:
    """Strip actions JSON from reply and return clean text + actions list."""
    text = reply or ""
    actions: List[Dict[str, Any]] = []

    match = ACTIONS_BLOCK_RE.search(text)
    if match:
        actions.extend(_parse_action_json(match.group(1).strip()))
        text = (text[: match.start()] + text[match.end() :]).strip()

    for inline in INLINE_ACTION_JSON_RE.finditer(text):
        actions.extend(_parse_action_json(inline.group(0)))
    text = INLINE_ACTION_JSON_RE.sub("", text).strip()
    text = re.sub(r"```actions\s*```", "", text, flags=re.I).strip()

    seen = set()
    unique: List[Dict[str, Any]] = []
    for a in actions:
        key = json.dumps(a, sort_keys=True)
        if key not in seen:
            seen.add(key)
            unique.append(a)

    return text or reply.strip(), unique


def build_actions_prompt_suffix(user_role: str, pathname: Optional[str]) -> str:
    return f"""
## Actions (required when user asks you to DO something)
Append a fenced block AFTER your short reply. **All actions run automatically** — no confirmation.

```actions
[{{"type": "navigate", "path": "/conversations", "label": "Open Leads"}}]
```

Allowed types:
- navigate: {{"type": "navigate", "path": "/admin/users", "label": "..."}} — pages or `/settings?tab=ai`
- open_lead: {{"type": "open_lead", "conversation_uuid": "<uuid>", "label": "Open lead"}}
- open_customer: {{"type": "open_customer", "customer_uuid": "<uuid>", "label": "Open customer"}}
- open_user: {{"type": "open_user", "user_id": 2, "label": "Open user profile"}}
- toggle_ai: {{"type": "toggle_ai", "conversation_uuid": "<uuid>", "enabled": false, "label": "Turn off AI"}}
- assign_lead: {{"type": "assign_lead", "conversation_uuid": "<uuid>", "user_email": "agent@co.com", "label": "Assign lead"}}
- update_lead_status: {{"type": "update_lead_status", "conversation_uuid": "<uuid>", "lead_status": "follow up", "comments": "optional"}}
- send_message: {{"type": "send_message", "conversation_uuid": "<uuid>", "message": "text to send on WhatsApp"}}
- change_user_role: {{"type": "change_user_role", "user_id": 2, "role": "ADMIN", "label": "..."}}
- toggle_user_status: {{"type": "toggle_user_status", "user_id": 2, "active": false, "label": "Disable user"}}
- verify_user: {{"type": "verify_user", "user_id": 2, "label": "Verify email"}}
- delete_user: {{"type": "delete_user", "user_id": 2, "label": "Delete user"}}
- refresh_page: {{"type": "refresh_page", "label": "Refresh"}}
- logout: {{"type": "logout", "label": "Sign out"}}
- create_user: {{"type": "create_user", "name": "...", "email": "...", "password": "...", "role": "USER"}}
- reset_user_password: {{"type": "reset_user_password", "user_id": 2}}
- update_user_profile: {{"type": "update_user_profile", "user_id": 2, "profile_name": "..."}}
- update_settings: {{"type": "update_settings", "settings_category": "AI", "settings": {{"temperature": "0.5"}}}}
- switch_ai_provider: {{"type": "switch_ai_provider", "provider_id": "groq-default"}}
- get_analytics: {{"type": "get_analytics", "label": "Dashboard stats"}}
- create_task: {{"type": "create_task", "task_title": "...", "task_priority": "high"}}
- update_task / delete_task: task_uuid required
- create_customer: {{"type": "create_customer", "phone": "+1...", "customer_name": "..."}}
- bulk_delete_users: {{"type": "bulk_delete_users", "user_ids": [2,3]}}
- bulk_delete_customers: {{"type": "bulk_delete_customers", "customer_uuids": ["..."]}}
- ui_action: {{"type": "ui_action", "ui_target": "profile_menu"}} — profile_menu | profile_logout | open_settings

Rules:
- Reply in **one or two short sentences**. Never repeat your intro every turn.
- Use UUIDs and user_id **only** from Live CRM / team data — never invent IDs.
- User role: {user_role}. Admin-only: /settings, /admin/*, /customers, user mutations, send_message.
- Current path: {pathname or "unknown"}. "Open this page" → navigate to current path.
- When user says GO, OPEN, ASSIGN, SEND, TOGGLE, MAKE, DISABLE, VERIFY, DELETE — include the action(s).
- For counts/questions only, answer from live data — no navigate actions.
- Lead statuses: new lead, assigned, application sent, application in, nurture, follow up, on hold, lost, duplicate, closed.
"""


class AssistantActionExecutor:
    @staticmethod
    def _require_admin(role: str) -> Optional[Dict[str, Any]]:
        if role != "ADMIN":
            return {"success": False, "error": "Admin access required"}
        return None

    @staticmethod
    async def execute(action: Dict[str, Any], user) -> Dict[str, Any]:
        t = action.get("type")
        role = (user.role or "USER").upper()

        if t == "navigate":
            path = action.get("path", "/dashboard")
            if path.startswith("/admin") or path.startswith("/settings") or path.startswith("/customers"):
                denied = AssistantActionExecutor._require_admin(role)
                if denied:
                    return denied
            return {"success": True, "type": "navigate", "path": path}

        if t == "open_lead":
            uuid = action.get("conversation_uuid")
            return {
                "success": True,
                "type": "navigate",
                "path": f"/conversations?open={uuid}",
            }

        if t == "open_customer":
            denied = AssistantActionExecutor._require_admin(role)
            if denied:
                return denied
            uuid = action.get("customer_uuid")
            return {"success": True, "type": "navigate", "path": f"/customers/{uuid}"}

        if t == "open_user":
            denied = AssistantActionExecutor._require_admin(role)
            if denied:
                return denied
            user_id = action.get("user_id")
            return {"success": True, "type": "navigate", "path": f"/admin/users/{user_id}"}

        if t == "refresh_page":
            return {"success": True, "type": "refresh_page"}

        if t == "logout":
            return {"success": True, "type": "logout"}

        if t == "toggle_ai":
            denied = AssistantActionExecutor._require_admin(role)
            if denied:
                return denied
            uuid = action.get("conversation_uuid")
            enabled = action.get("enabled")
            result = await ConversationService.toggle_ai_by_uuid(uuid, bool(enabled))
            if result is None:
                return {"success": False, "error": "Conversation not found"}
            return {
                "success": True,
                "type": "toggle_ai",
                "conversation_uuid": uuid,
                "ai_enabled": result,
            }

        if t == "assign_lead":
            denied = AssistantActionExecutor._require_admin(role)
            if denied:
                return denied
            uuid = action.get("conversation_uuid")
            user_email = action.get("user_email")
            await ConversationService.assign_lead_by_uuid(uuid, user_email)
            return {
                "success": True,
                "type": "assign_lead",
                "conversation_uuid": uuid,
                "assigned_to": user_email,
                "lead_status": "assigned",
            }

        if t == "update_lead_status":
            denied = AssistantActionExecutor._require_admin(role)
            if denied:
                return denied
            uuid = action.get("conversation_uuid")
            lead_status = action.get("lead_status")
            comments = action.get("comments")
            ok = await ConversationService.update_status_by_uuid(uuid, lead_status, comments)
            if not ok:
                return {"success": False, "error": "Conversation not found"}
            return {
                "success": True,
                "type": "update_lead_status",
                "conversation_uuid": uuid,
                "lead_status": lead_status,
            }

        if t == "send_message":
            denied = AssistantActionExecutor._require_admin(role)
            if denied:
                return denied
            uuid = action.get("conversation_uuid")
            message_text = (action.get("message") or "").strip()
            conversation = await ConversationService.get_conversation_by_uuid(uuid)
            if not conversation:
                return {"success": False, "error": "Conversation not found"}
            phone = conversation.customer.phone
            last_received_on = getattr(conversation, "lastReceivedOn", None)
            send_success, provider_id = await WhatsAppService.send_message(
                phone, message_text, incoming_to_number=last_received_on
            )
            status = MESSAGE_STATUS_SENT if send_success else MESSAGE_STATUS_FAILED
            message_id, _ = await ConversationService.save_message(
                phone=phone,
                message=message_text,
                name=user.name,
                whatsapp_id=provider_id,
                conversation_id=conversation.id,
                role=MESSAGE_ROLE_AGENT,
                status=status,
            )
            if not send_success:
                return {"success": False, "error": "Failed to send WhatsApp message"}
            return {
                "success": True,
                "type": "send_message",
                "conversation_uuid": uuid,
                "message_id": message_id,
            }

        if t in ("change_user_role", "toggle_user_status", "verify_user", "delete_user"):
            denied = AssistantActionExecutor._require_admin(role)
            if denied:
                return denied
            from app.modules.admin.service import AdminService

            db = await get_db()
            svc = AdminService(db)
            user_id = int(action.get("user_id"))

            try:
                if t == "change_user_role":
                    updated = await svc.change_user_role(
                        user_id=user_id,
                        new_role=str(action.get("role")).upper(),
                        admin_id=user.id,
                    )
                    return {
                        "success": True,
                        "type": "change_user_role",
                        "user_id": updated.id,
                        "role": str(updated.role),
                        "name": updated.name,
                    }
                if t == "toggle_user_status":
                    updated = await svc.toggle_user_status(
                        user_id=user_id,
                        is_active=bool(action.get("active")),
                        admin_id=user.id,
                    )
                    return {
                        "success": True,
                        "type": "toggle_user_status",
                        "user_id": updated.id,
                        "active": updated.isActive,
                        "name": updated.name,
                    }
                if t == "verify_user":
                    updated = await svc.verify_user_manually(user_id=user_id, admin_id=user.id)
                    return {
                        "success": True,
                        "type": "verify_user",
                        "user_id": updated.id,
                        "name": updated.name,
                    }
                if t == "delete_user":
                    result = await svc.delete_user(user_id=user_id, admin_id=user.id)
                    return {
                        "success": True,
                        "type": "delete_user",
                        "deleted_user_id": result.get("deleted_user_id"),
                        "message": result.get("message"),
                    }
            except HTTPException as exc:
                return {"success": False, "error": exc.detail}

        from app.modules.ai.assistant_exec_extended import execute_extended_action

        extended = await execute_extended_action(action, user)
        if extended is not None:
            return extended

        return {"success": False, "error": f"Unknown action type: {t}"}

    @staticmethod
    async def resolve_conversation_by_phone(phone: str) -> Optional[str]:
        db = await get_db()
        clean = re.sub(r"\D", "", phone)
        customer = await db.customer.find_first(
            where={"phone": {"contains": clean[-10:] if len(clean) >= 10 else clean}}
        )
        if not customer:
            return None
        conv = await db.conversation.find_first(
            where={"customerId": customer.id, "status": "active"},
            order={"updatedAt": "desc"},
        )
        return conv.uuid if conv else None
