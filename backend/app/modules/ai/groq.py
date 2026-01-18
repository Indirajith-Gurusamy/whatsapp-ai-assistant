"""Groq AI service for generating responses."""
import logging
from groq import Groq
from app.core.config import settings

logger = logging.getLogger(__name__)


class GroqService:
    """Service for interacting with Groq API."""
    
    @staticmethod
    def generate_response(message: str) -> str:
        """
        Generate a response using Groq AI.
        
        Args:
            message: User's message
            
        Returns:
            AI-generated response
            
        Raises:
            Exception: If Groq API fails
        """
        if not settings.GROQ_API_KEY:
            raise Exception("GROQ_API_KEY not configured")
        
        logger.info("Generating AI response...")
        
        try:
            client = Groq(api_key=settings.GROQ_API_KEY)
            
            # System instruction for loan officer persona
            system_instruction = """You are a knowledgeable, professional Loan officer. Your role is to:
- Provide informative answers when asked specific questions.
- Be helpful, friendly, and professional.
- Keep responses concise but comprehensive (2-4 sentences).
- If a question is complex, provide clear bullet points."""
            
            # Generate response
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": system_instruction
                    },
                    {
                        "role": "user",
                        "content": message
                    }
                ],
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
    def generate_response_safe(message: str) -> str:
        """
        Generate response with fallback to generic message.
        
        Args:
            message: User's message
            
        Returns:
            AI-generated response or fallback message
        """
        try:
            return GroqService.generate_response(message)
        except Exception as e:
            logger.warning(f"[AI] Using fallback response: {e}")
            return "Thank you for your message. We'll get back to you soon!"
