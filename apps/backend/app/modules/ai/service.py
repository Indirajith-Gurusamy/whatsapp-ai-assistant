"""Unified AI service — routes to the active configured provider."""
import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings as app_settings
from app.db.client import get_db
from app.modules.ai.chat import complete_chat
from app.modules.ai.prompts import APP_ASSISTANT_SYSTEM_PROMPT
from app.modules.ai.providers_util import (
    get_active_provider,
    get_provider_by_id,
    normalize_ai_settings,
    parse_ai_providers,
)
from app.modules.settings.service import DEFAULT_SETTINGS, SettingsService

logger = logging.getLogger(__name__)

CONTEXT_MESSAGE_LIMIT = 10
ASSISTANT_HISTORY_LIMIT = 12
ASSISTANT_MAX_TOKENS = 600


class AIService:
    """Generate replies using the active AI provider from admin settings."""

    @staticmethod
    async def _get_ai_settings() -> Dict[str, Any]:
        defaults = DEFAULT_SETTINGS.get("AI", {})
        db = await get_db()
        settings_svc = SettingsService(db)
        data = await settings_svc.get_settings("AI")
        data = normalize_ai_settings(data)

        system_prompt = (data.get("system_prompt") or defaults.get("system_prompt", "")).strip()
        fallback_message = (
            data.get("fallback_message") or defaults.get("fallback_message", "")
        ).strip()

        try:
            temperature = float(data.get("temperature") or defaults.get("temperature", "0.7"))
        except (TypeError, ValueError):
            temperature = 0.7

        try:
            max_tokens = int(data.get("max_tokens") or defaults.get("max_tokens", "300"))
        except (TypeError, ValueError):
            max_tokens = 300

        providers = parse_ai_providers(data.get("ai_providers", ""))

        return {
            "providers": providers,
            "system_prompt": system_prompt,
            "fallback_message": fallback_message,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

    @staticmethod
    async def _get_conversation_history(conversation_id: int) -> List[Dict[str, str]]:
        try:
            db = await get_db()
            messages = await db.message.find_many(
                where={"conversationId": conversation_id},
                order={"timestamp": "desc"},
                take=CONTEXT_MESSAGE_LIMIT,
            )
            messages.reverse()
            return [
                {
                    "role": "user" if msg.role == "user" else "assistant",
                    "content": msg.message,
                }
                for msg in messages
            ]
        except Exception as e:
            logger.warning(f"[AI] Could not load conversation history: {e}")
            return []

    @staticmethod
    async def generate_response(
        message: str,
        conversation_id: Optional[int] = None,
        provider_id: Optional[str] = None,
    ) -> str:
        ai_settings = await AIService._get_ai_settings()
        provider = get_provider_by_id(ai_settings["providers"], provider_id)
        if not provider:
            raise Exception("No AI provider configured. Add one in Settings → AI.")

        provider_type = provider.get("provider", "")
        config = provider.get("config") or {}
        logger.info(
            f"Generating AI response via {provider_type} ({provider.get('name')}) "
            f"for conversation {conversation_id}..."
        )

        chat_messages = [{"role": "system", "content": ai_settings["system_prompt"]}]
        if conversation_id:
            chat_messages.extend(
                await AIService._get_conversation_history(conversation_id)
            )
        chat_messages.append({"role": "user", "content": message})

        response_text = await complete_chat(
            provider_type=provider_type,
            config=config,
            messages=chat_messages,
            temperature=ai_settings["temperature"],
            max_tokens=ai_settings["max_tokens"],
        )
        logger.info(f"[AI] Response generated ({len(response_text)} chars)")
        return response_text

    @staticmethod
    async def generate_response_safe(
        message: str,
        conversation_id: Optional[int] = None,
    ) -> str:
        try:
            return await AIService.generate_response(message, conversation_id)
        except Exception as e:
            logger.warning(f"[AI] Using fallback response: {e}")
            ai_settings = await AIService._get_ai_settings()
            return ai_settings["fallback_message"] or (
                "Thank you for your message. I'll get back to you shortly!"
            )

    @staticmethod
    def _build_assistant_system_prompt(
        user_role: str,
        pathname: Optional[str] = None,
    ) -> str:
        role = (user_role or "USER").upper()
        parts = [APP_ASSISTANT_SYSTEM_PROMPT.strip(), f"\nCurrent user role: {role}."]
        if pathname:
            parts.append(f"Current page path: {pathname}.")
        return "\n".join(parts)

    @staticmethod
    async def chat_assistant(
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        user_role: str = "USER",
        pathname: Optional[str] = None,
    ) -> Dict[str, str]:
        """In-app help chat using the same active provider as WhatsApp replies."""
        ai_settings = await AIService._get_ai_settings()
        provider = get_active_provider(ai_settings["providers"])
        if not provider:
            raise Exception(
                "No AI provider configured. An admin can add one under Settings → AI."
            )

        provider_type = provider.get("provider", "")
        config = provider.get("config") or {}
        provider_name = provider.get("name") or provider_type

        chat_messages: List[Dict[str, str]] = [
            {
                "role": "system",
                "content": AIService._build_assistant_system_prompt(user_role, pathname),
            }
        ]

        prior = history or []
        for item in prior[-ASSISTANT_HISTORY_LIMIT:]:
            role = item.get("role")
            content = (item.get("content") or "").strip()
            if role in ("user", "assistant") and content:
                chat_messages.append({"role": role, "content": content})

        chat_messages.append({"role": "user", "content": message.strip()})

        logger.info(
            f"[Assistant] Chat via {provider_type} ({provider_name}), "
            f"role={user_role}, path={pathname or '-'}"
        )

        response_text = await complete_chat(
            provider_type=provider_type,
            config=config,
            messages=chat_messages,
            temperature=min(ai_settings["temperature"], 0.8),
            max_tokens=ASSISTANT_MAX_TOKENS,
        )
        return {"reply": response_text, "provider_name": provider_name}
