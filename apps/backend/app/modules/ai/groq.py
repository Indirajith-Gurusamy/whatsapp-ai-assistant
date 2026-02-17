"""Groq AI service for generating responses."""
import logging
from typing import Optional, List, Dict
from groq import Groq
from app.core.config import settings

logger = logging.getLogger(__name__)

# Max recent messages to include for context (user + assistant pairs)
CONTEXT_MESSAGE_LIMIT = 10


class GroqService:
    """Service for interacting with Groq API."""

    @staticmethod
    async def _get_conversation_history(conversation_id: int) -> List[Dict[str, str]]:
        """Load recent messages for a specific conversation from DB.
        
        Returns a list of {"role": "user"|"assistant", "content": "..."} dicts
        scoped to this conversation only — no cross-user leakage.
        """
        try:
            from app.db.client import get_db
            db = await get_db()
            messages = await db.message.find_many(
                where={"conversationId": conversation_id},
                order_by={"timestamp": "desc"},
                take=CONTEXT_MESSAGE_LIMIT,
            )
            # Reverse to chronological order
            messages.reverse()
            return [
                {
                    "role": "user" if msg.role == "USER" else "assistant",
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
        if not settings.GROQ_API_KEY:
            raise Exception("GROQ_API_KEY not configured")

        logger.info(f"Generating AI response for conversation {conversation_id}...")

        try:
            client = Groq(api_key=settings.GROQ_API_KEY)

            system_instruction = """You are a knowledgeable, professional Loan officer. Your role is to:
- Provide informative answers when asked specific questions.
- Be helpful, friendly, and professional.
- Keep responses concise but comprehensive (2-4 sentences).
- If a question is complex, provide clear bullet points."""

            # Build messages: system + conversation history + current message
            chat_messages = [{"role": "system", "content": system_instruction}]

            # Load per-conversation history (scoped to this user's conversation)
            if conversation_id:
                history = await GroqService._get_conversation_history(conversation_id)
                chat_messages.extend(history)

            # Add current message (may duplicate last history entry, but that's
            # fine — the history was fetched before this message was saved)
            chat_messages.append({"role": "user", "content": message})

            chat_completion = client.chat.completions.create(
                messages=chat_messages,
                model=settings.GROQ_MODEL,
                temperature=0.7,
                max_tokens=300,
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
            return "Thank you for your message. We'll get back to you soon!"
