"""Meta (WhatsApp Cloud API) webhook provider."""
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from app.modules.conversations.service import ConversationService
from app.modules.ai.groq import GroqService
from app.modules.whatsapp.sender import WhatsAppService
from app.core.constants import (
    MESSAGE_ROLE_USER,
    MESSAGE_ROLE_ASSISTANT,
    MESSAGE_STATUS_RECEIVED,
    MESSAGE_STATUS_SENT,
    MESSAGE_STATUS_DELIVERED,
    MESSAGE_STATUS_READ,
    MESSAGE_STATUS_FAILED,
)

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
                        contacts = value.get("contacts", [])
                        for message in value.get("messages", []):
                            await MetaWebhookProvider._process_message(
                                message,
                                value.get("metadata", {}),
                                contacts,
                            )
                    
                    # Handle message status updates
                    elif "statuses" in value:
                        for status_evt in value.get("statuses", []):
                            wa_id = status_evt.get("id", "")
                            wa_status = status_evt.get("status", "")
                            errors = status_evt.get("errors", [])
                            logger.info(
                                f"[META STATUS] Message {wa_id} - {wa_status}"
                                + (f" errors={errors}" if errors else "")
                            )
                            status_map = {
                                "sent": MESSAGE_STATUS_SENT,
                                "delivered": MESSAGE_STATUS_DELIVERED,
                                "read": MESSAGE_STATUS_READ,
                                "failed": MESSAGE_STATUS_FAILED,
                            }
                            mapped = status_map.get(wa_status)
                            if wa_id and mapped:
                                await ConversationService.update_message_status_by_whatsapp_id(
                                    wa_id, mapped
                                )
            
            return True
        except Exception as e:
            logger.error(f"[ERROR] Error processing Meta webhook: {e}", exc_info=True)
            return False
    
    @staticmethod
    async def _process_message(
        message: Dict[str, Any],
        metadata: Dict[str, Any],
        contacts: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
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

            sender_name = "User"
            for contact in contacts or []:
                if contact.get("wa_id") == from_phone:
                    sender_name = contact.get("profile", {}).get("name") or sender_name
                    break
            
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

            ai_enabled = await ConversationService.is_ai_enabled(conversation_id)
            if not ai_enabled:
                logger.info(
                    f"[AI] AI disabled for conversation {conversation_id} - waiting for human agent"
                )
                return

            # Generate LLM response
            response_text = await GroqService.generate_response_safe(text, conversation_id)
            
            # Send reply
            send_success, wamid = await WhatsAppService.send_message(from_phone, response_text)
            
            # Save response
            status = MESSAGE_STATUS_SENT if send_success else MESSAGE_STATUS_FAILED
            await ConversationService.save_message(
                phone=from_phone,
                message=response_text,
                name=sender_name,
                whatsapp_id=wamid,
                conversation_id=conversation_id,
                role=MESSAGE_ROLE_ASSISTANT,
                status=status
            )

        except Exception as e:
            logger.error(f"[ERROR] Error processing individual Meta message: {e}", exc_info=True)
