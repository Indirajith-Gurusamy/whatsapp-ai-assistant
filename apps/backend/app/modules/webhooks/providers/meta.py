"""Meta (WhatsApp Cloud API) webhook provider."""
import json
import logging
from datetime import datetime
from typing import Dict, Any
from app.modules.conversations.service import ConversationService
from app.modules.ai.groq import GroqService
from app.modules.whatsapp.sender import WhatsAppService
from app.core.constants import MESSAGE_ROLE_USER, MESSAGE_ROLE_ASSISTANT, MESSAGE_STATUS_RECEIVED, MESSAGE_STATUS_SENT, MESSAGE_STATUS_FAILED

logger = logging.getLogger(__name__)


class MetaWebhookProvider:
    """Handler for Meta WhatsApp Cloud API webhooks."""
    
    @staticmethod
    async def process(raw_body: bytes) -> bool:
        """
        Process incoming Meta webhook data.
        
        Args:
            raw_body: Raw webhook body (JSON)
            
        Returns:
            True if processed successfully
        """
        try:
            body = json.loads(raw_body)
            logger.debug(f"Incoming Meta webhook: {json.dumps(body)}")
            
            # Meta structure: entry[] -> changes[] -> value -> messages[]
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    
                    # Handle incoming messages
                    if "messages" in value:
                        for message in value.get("messages", []):
                            await MetaWebhookProvider._process_message(message, value.get("metadata", {}))
                    
                    # Handle message status updates
                    elif "statuses" in value:
                        for status in value.get("statuses", []):
                            logger.info(f"[META STATUS] Message {status.get('id')} - {status.get('status')}")
            
            return True
        except Exception as e:
            logger.error(f"[ERROR] Error processing Meta webhook: {e}", exc_info=True)
            return False
    
    @staticmethod
    async def _process_message(message: Dict[str, Any], metadata: Dict[str, Any]) -> None:
        """Process individual Meta message."""
        try:
            msg_id = message.get("id", "")
            from_phone = message.get("from", "") # Customer's phone
            
            # Extract text
            text = ""
            if message.get("type") == "text":
                text = message.get("text", {}).get("body", "")
            
            if not from_phone or not text:
                return

            # Meta doesn't always provide a name in the message object, 
            # it might be in contacts[] in the same value object but we process per message
            sender_name = "User"
            
            logger.info(f"[META MESSAGE] From: {from_phone}, ID: {msg_id}")
            logger.info(f"[META MESSAGE] Text: {text[:100]}")
            
            # Get or create customer and conversation
            customer_id = await ConversationService.get_or_create_customer(from_phone, from_phone, sender_name)
            conversation_id = await ConversationService.get_or_create_conversation(customer_id)
            
            # Save incoming message
            await ConversationService.save_message(
                phone=from_phone,
                message=text,
                name=sender_name,
                whatsapp_id=msg_id,
                conversation_id=conversation_id,
                role=MESSAGE_ROLE_USER,
                status=MESSAGE_STATUS_RECEIVED
            )
            
            # Generate LLM response
            response_text = await GroqService.generate_response_safe(text, conversation_id)
            
            # Send reply
            send_success = await WhatsAppService.send_message(from_phone, response_text)
            
            # Save response
            status = MESSAGE_STATUS_SENT if send_success else MESSAGE_STATUS_FAILED
            await ConversationService.save_message(
                phone=from_phone,
                message=response_text,
                name=sender_name,
                whatsapp_id=None,
                conversation_id=conversation_id,
                role=MESSAGE_ROLE_ASSISTANT,
                status=status
            )

        except Exception as e:
            logger.error(f"[ERROR] Error processing individual Meta message: {e}", exc_info=True)
