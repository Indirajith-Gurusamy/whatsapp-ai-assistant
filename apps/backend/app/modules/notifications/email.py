"""Email notification service."""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications."""
    
    @staticmethod
    def send_message_notification(phone: str, message: str, timestamp: str) -> bool:
        """
        Send email notification for incoming WhatsApp message.
        
        Args:
            phone: Sender's WhatsApp phone number
            message: Message text
            timestamp: Message timestamp
            
        Returns:
            True if sent successfully, False otherwise
        """
        
        if not all([settings.SENDER_EMAIL, settings.SENDER_PASSWORD, settings.RECIPIENT_EMAIL]):
            logger.warning("Email credentials not configured")
            return False
        
        try:
            # Create email
            msg = MIMEMultipart()
            msg["From"] = settings.SENDER_EMAIL
            msg["To"] = settings.RECIPIENT_EMAIL
            msg["Subject"] = f"WhatsApp Message from +{phone}"
            
            # Email body
            body = f"""Phone: +{phone}
Timestamp: {timestamp}

user enquiry: {message}"""
            
            msg.attach(MIMEText(body, "plain"))
            
            # Send email
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SENDER_EMAIL, settings.SENDER_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Email sent for message from +{phone}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
