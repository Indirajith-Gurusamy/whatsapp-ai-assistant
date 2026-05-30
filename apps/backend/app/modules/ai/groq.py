"""Groq AI service for generating responses."""
import logging
from typing import Any, Dict, List, Optional

from groq import Groq

from app.core.config import settings as app_settings
from app.db.client import get_db
from app.modules.settings.service import DEFAULT_SETTINGS, SettingsService

logger = logging.getLogger(__name__)

# Max recent messages to include for context (user + assistant pairs)
CONTEXT_MESSAGE_LIMIT = 10


class GroqService:
    """Service for interacting with Groq API."""

    @staticmethod
    async def _get_ai_settings() -> Dict[str, Any]:
        """Load AI settings from DB (Admin UI), with env var fallbacks."""
        defaults = DEFAULT_SETTINGS.get("AI", {})
        db = await get_db()
        settings_svc = SettingsService(db)
        data = await settings_svc.get_settings("AI")

        api_key = data.get("groq_api_key") or app_settings.GROQ_API_KEY
        model = data.get("groq_model") or app_settings.GROQ_MODEL or "llama-3.3-70b-versatile"
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

        return {
            "api_key": api_key,
            "model": model,
            "system_prompt": system_prompt,
            "fallback_message": fallback_message,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

    @staticmethod
    async def _get_conversation_history(conversation_id: int) -> List[Dict[str, str]]:
        """Load recent messages for a specific conversation from DB.
        
        Returns a list of {"role": "user"|"assistant", "content": "..."} dicts
        scoped to this conversation only — no cross-user leakage.
        """
        try:
            db = await get_db()
            messages = await db.message.find_many(
                where={"conversationId": conversation_id},
                order={"timestamp": "desc"},
                take=CONTEXT_MESSAGE_LIMIT,
            )
            # Reverse to chronological order
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
    async def generate_response(message: str, conversation_id: Optional[int] = None) -> str:
        """
        Generate a response using Groq AI with per-conversation context.
        
        Args:
            message: User's current message
            conversation_id: The specific conversation to load history from
            
        Returns:
            AI-generated response
        """
        ai_settings = await GroqService._get_ai_settings()
        api_key = ai_settings["api_key"]
        if not api_key:
            raise Exception("Groq API key not configured")

        logger.info(f"Generating AI response for conversation {conversation_id}...")

        try:
            client = Groq(api_key=api_key)

            # Build messages: system + conversation history + current message
            chat_messages = [{"role": "system", "content": ai_settings["system_prompt"]}]

            # Load per-conversation history (scoped to this user's conversation)
            if conversation_id:
                history = await GroqService._get_conversation_history(conversation_id)
                chat_messages.extend(history)

            # Add current message (may duplicate last history entry, but that's
            # fine — the history was fetched before this message was saved)
            chat_messages.append({"role": "user", "content": message})

            chat_completion = client.chat.completions.create(
                messages=chat_messages,
                model=ai_settings["model"],
                temperature=ai_settings["temperature"],
                max_tokens=ai_settings["max_tokens"],
            )

            response_text = chat_completion.choices[0].message.content.strip()

            if not response_text:
                raise Exception("Empty response from Groq")

            logger.info(f"[AI] Response generated ({len(response_text)} chars)")
            return response_text

        except Exception as e:
            logger.error(f"[AI] Groq error: {str(e)}")
            raise Exception(f"Groq API error: {str(e)}")

    @staticmethod
    async def generate_response_safe(message: str, conversation_id: Optional[int] = None) -> str:
        """
        Generate response with fallback to generic message.
        
        Args:
            message: User's message
            conversation_id: The specific conversation for context isolation
            
        Returns:
            AI-generated response or fallback message
        """
        try:
            return await GroqService.generate_response(message, conversation_id)
        except Exception as e:
            logger.warning(f"[AI] Using fallback response: {e}")
            ai_settings = await GroqService._get_ai_settings()
            return ai_settings["fallback_message"] or (
                "Thank you for your message. I'll get back to you shortly!"
            )
