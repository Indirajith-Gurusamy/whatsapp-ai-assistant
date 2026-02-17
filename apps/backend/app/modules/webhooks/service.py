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
            # 1. Try to parse as JSON (Meta)
            try:
                import json
                decoded = raw_body.decode('utf-8')
                data = json.loads(decoded)
                
                # Check if it looks like a Meta webhook (has entry field)
                if "entry" in data:
                    from app.modules.webhooks.providers.meta import MetaWebhookProvider
                    logger.info("[WEBHOOK] Routing to Meta provider")
                    await MetaWebhookProvider.process(raw_body)
                    return
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass

            # 2. Fallback to Twilio provider
            logger.info("[WEBHOOK] Routing to Twilio provider")
            await TwilioWebhookProvider.process(raw_body)
            
        except Exception as e:
            logger.error(f"Webhook processing error: {e}", exc_info=True)
