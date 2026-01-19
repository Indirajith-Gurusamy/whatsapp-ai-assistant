"""WhatsApp messaging service using Twilio API."""
import logging
from twilio.rest import Client
from app.core.config import settings

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Service for sending WhatsApp messages via Twilio."""
    
    @staticmethod
    async def send_message(phone_number: str, message_text: str) -> bool:
        """
        Send a WhatsApp message via Twilio API.
        
        Args:
            phone_number: Recipient's phone number (can be with or without 'whatsapp:' prefix)
            message_text: Message to send
            
        Returns:
            True if sent successfully, False otherwise
        """
        logger.info(f"Attempting to send WhatsApp message to {phone_number}")
        
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_WHATSAPP_NUMBER:
            logger.error("[ERROR] Twilio credentials not configured")
            return False
        
        try:
            # Initialize Twilio client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            
            # Clean and format phone numbers
            clean_number = phone_number.replace("+", "").replace(" ", "").replace("whatsapp:", "")
            
            # Ensure numbers have whatsapp: prefix
            from_number = settings.TWILIO_WHATSAPP_NUMBER if settings.TWILIO_WHATSAPP_NUMBER.startswith("whatsapp:") else f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}"
            to_number = f"whatsapp:+{clean_number}" if not phone_number.startswith("whatsapp:") else phone_number
            
            logger.info(f"Sending from {from_number} to {to_number}")
            
            # Send message via Twilio
            message = client.messages.create(
                from_=from_number,
                body=message_text,
                to=to_number
            )
            
            logger.info(f"[OK] WhatsApp message sent successfully - SID: {message.sid}")
            logger.debug(f"Message status: {message.status}")
            return True
            
        except Exception as e:
            logger.error(f"[ERROR] Twilio send failed: {e}", exc_info=True)
            return False
