"""Extended Vivafy actions — user admin, settings, tasks, customers, analytics, UI."""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

from fastapi import HTTPException

from app.db.client import get_db
from app.modules.admin.service import AdminService
from app.modules.analytics.service import AnalyticsService
from app.modules.auth.profile_schemas import UpdateProfileRequest
from app.modules.auth.profile_service import ProfileService
from app.modules.auth.schemas import SignupRequest
from app.modules.auth.service import AuthService
from app.modules.conversations.service import ConversationService
from app.modules.settings.service import SettingsService
from app.modules.tasks.service import TaskService
from app.modules.ai.providers_util import parse_ai_providers, normalize_ai_settings

logger = logging.getLogger(__name__)


async def execute_extended_action(action: Dict[str, Any], user) -> Optional[Dict[str, Any]]:
    """Return result dict if handled, else None."""
    t = action.get("type")
    role = (user.role or "USER").upper()

    if t == "ui_action":
        target = action.get("ui_target") or action.get("target")
        if not target:
            return {"success": False, "error": "ui_target required"}
        return {"success": True, "type": "ui_action", "ui_target": target}

    if t == "get_analytics":
        if role != "ADMIN":
            return {"success": False, "error": "Admin access required"}
        data = await AnalyticsService.get_analytics()
        pipeline = data.get("pipeline", {})
        reply = (
            f"Messages: **{data.get('total_messages', 0)}** | "
            f"Responses: **{data.get('total_responses', 0)}** | "
            f"Success rate: **{data.get('success_rate', 0)}%** | "
            f"Today: **{data.get('messages_today', 0)}** | "
            f"Avg response: **{data.get('average_response_time', '—')}**"
        )
        if pipeline.get("funnel"):
            stages = ", ".join(
                f"{s.get('stage', '?')}: {s.get('count', 0)}" for s in pipeline["funnel"][:6]
            )
            reply += f"\nPipeline: {stages}"
        return {"success": True, "type": "get_analytics", "analytics": data, "summary": reply}

    if role != "ADMIN":
        return {"success": False, "error": "Admin access required"}

    db = await get_db()

    if t == "create_user":
        password = (action.get("password") or "").strip()
        if not password:
            return {"success": False, "error": "password required when creating users"}
        try:
            signup = SignupRequest(
                name=action.get("name") or "New User",
                email=action.get("email"),
                password=password,
                role=(action.get("role") or "USER").upper(),
            )
            await AuthService(db).signup(signup)
            return {
                "success": True,
                "type": "create_user",
                "email": signup.email,
                "name": signup.name,
                "role": signup.role,
            }
        except HTTPException as exc:
            return {"success": False, "error": exc.detail}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    if t == "reset_user_password":
        user_id = int(action.get("user_id"))
        try:
            temp = await AdminService(db).reset_user_password(user_id, user.id)
            target = await db.user.find_unique(where={"id": user_id})
            return {
                "success": True,
                "type": "reset_user_password",
                "user_id": user_id,
                "email": target.email if target else None,
                "message": "Password reset. Retrieve the temporary password from User Management.",
            }
        except HTTPException as exc:
            return {"success": False, "error": exc.detail}

    if t == "update_user_profile":
        user_id = int(action.get("user_id"))
        try:
            payload = UpdateProfileRequest(
                name=action.get("profile_name") or action.get("name"),
                bio=action.get("bio"),
                phone=action.get("phone"),
            )
            updated = await ProfileService(db).update_user_profile(user_id, payload)
            return {
                "success": True,
                "type": "update_user_profile",
                "user_id": user_id,
                "name": updated.name,
            }
        except HTTPException as exc:
            return {"success": False, "error": exc.detail}

    if t == "update_settings":
        category = (action.get("settings_category") or action.get("category") or "AI").upper()
        raw = action.get("settings") or action.get("settings_json")
        if isinstance(raw, str):
            try:
                settings_map = json.loads(raw)
            except json.JSONDecodeError:
                return {"success": False, "error": "Invalid settings JSON"}
        elif isinstance(raw, dict):
            settings_map = {}
            for k, v in raw.items():
                if isinstance(v, (dict, list)):
                    settings_map[str(k)] = json.dumps(v)
                elif v is None:
                    settings_map[str(k)] = ""
                else:
                    settings_map[str(k)] = str(v)
        else:
            return {"success": False, "error": "settings dict or settings_json required"}
        svc = SettingsService(db)
        await svc.update_settings(category, settings_map, admin_user_id=user.id)
        return {"success": True, "type": "update_settings", "category": category}

    if t == "switch_ai_provider":
        provider_id = action.get("provider_id")
        if not provider_id:
            return {"success": False, "error": "provider_id required"}
        svc = SettingsService(db)
        data = await svc.get_settings("AI")
        data = normalize_ai_settings(data)
        providers = parse_ai_providers(data.get("ai_providers", ""))
        found = False
        for p in providers:
            p["active"] = p.get("id") == provider_id
            if p["active"]:
                found = True
        if not found:
            return {"success": False, "error": f"Provider {provider_id} not found"}
        await svc.update_settings(
            "AI",
            {"ai_providers": json.dumps(providers)},
            admin_user_id=user.id,
        )
        active = next(p for p in providers if p.get("active"))
        return {
            "success": True,
            "type": "switch_ai_provider",
            "provider_id": provider_id,
            "provider_name": active.get("name"),
        }

    if t == "create_task":
        try:
            created = await TaskService.create_task(
                {
                    "title": action.get("task_title") or action.get("title"),
                    "description": action.get("task_description") or action.get("description"),
                    "status": action.get("task_status") or action.get("status") or "todo",
                    "priority": action.get("task_priority") or action.get("priority") or "medium",
                    "assigned_to": action.get("assigned_to"),
                },
                created_by_id=user.id,
                creator_name=user.name,
            )
            return {"success": True, "type": "create_task", **created}
        except HTTPException as exc:
            return {"success": False, "error": exc.detail}

    if t == "update_task":
        task_uuid = action.get("task_uuid")
        if not task_uuid:
            return {"success": False, "error": "task_uuid required"}
        payload: Dict[str, Any] = {}
        if action.get("task_title") or action.get("title"):
            payload["title"] = action.get("task_title") or action.get("title")
        if action.get("task_description") or action.get("description"):
            payload["description"] = action.get("task_description") or action.get("description")
        if action.get("task_status") or action.get("status"):
            payload["status"] = action.get("task_status") or action.get("status")
        if action.get("task_priority") or action.get("priority"):
            payload["priority"] = action.get("task_priority") or action.get("priority")
        if action.get("assigned_to") is not None:
            payload["assigned_to"] = action.get("assigned_to")
        try:
            updated = await TaskService.update_task(task_uuid, payload)
            return {"success": True, "type": "update_task", **updated}
        except HTTPException as exc:
            return {"success": False, "error": exc.detail}

    if t == "delete_task":
        task_uuid = action.get("task_uuid")
        if not task_uuid:
            return {"success": False, "error": "task_uuid required"}
        try:
            result = await TaskService.delete_task(task_uuid)
            return {"success": True, "type": "delete_task", **result}
        except HTTPException as exc:
            return {"success": False, "error": exc.detail}

    if t == "create_customer":
        phone = action.get("phone")
        if not phone:
            return {"success": False, "error": "phone required"}
        try:
            result = await ConversationService.create_customer(phone, action.get("customer_name") or action.get("name"))
            return {"success": True, "type": "create_customer", **result}
        except ValueError as exc:
            return {"success": False, "error": str(exc)}

    if t == "bulk_delete_users":
        ids = action.get("user_ids") or []
        if not ids:
            return {"success": False, "error": "user_ids required"}
        result = await AdminService(db).bulk_delete_users(ids, user.id)
        return {"success": True, "type": "bulk_delete_users", **result}

    if t == "bulk_delete_customers":
        uuids = action.get("customer_uuids") or []
        if not uuids:
            return {"success": False, "error": "customer_uuids required"}
        result = await ConversationService.bulk_delete_customers(uuids)
        return {"success": True, "type": "bulk_delete_customers", **result}

    return None
