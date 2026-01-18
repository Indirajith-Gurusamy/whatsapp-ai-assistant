"""Webhook service for orchestrating webhook processing."""
from app.modules.webhooks.providers.twilio import TwilioWebhookProvider
import logging

logger = logging.getLogger(__name__)


class WebhookService:
    """Service for processing webhooks."""
    
    @staticmethod
    async def process_webhook(raw_body: bytes):
        """
        Process incoming webhook.
        
        Args:
            raw_body: Raw webhook body
        """
        try:
            # Process Twilio webhook
            await TwilioWebhookProvider.process(raw_body)
        except Exception as e:
            logger.error(f"Webhook processing error: {e}", exc_info=True)
