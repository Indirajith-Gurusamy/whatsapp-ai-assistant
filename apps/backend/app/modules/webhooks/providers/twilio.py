"""Twilio webhook provider."""
import json
import logging
from datetime import datetime
from typing import Dict, Any
from urllib.parse import parse_qs
from app.modules.conversations.service import ConversationService
from app.modules.ai.service import AIService
from app.modules.whatsapp.sender import WhatsAppService
from app.modules.webhooks.dedup import conversation_lock_key, inbound_processing_lock
from app.core.constants import MESSAGE_ROLE_USER, MESSAGE_ROLE_ASSISTANT, MESSAGE_STATUS_RECEIVED, MESSAGE_STATUS_SENT, MESSAGE_STATUS_FAILED

logger = logging.getLogger(__name__)


class TwilioWebhookProvider:
    """Handler for Twilio WhatsApp webhooks."""
    
    @staticmethod
    def parse_webhook_body(raw_body: bytes) -> Dict[str, Any]:
        """
        Parse Twilio webhook body (form-encoded data).
        
        Args:
            raw_body: Raw request body from Twilio (form-encoded)
            
        Returns:
            Parsed webhook data as dictionary
        """
        try:
            # Decode if bytes
            if isinstance(raw_body, bytes):
                body_text = raw_body.decode('utf-8')
            else:
                body_text = str(raw_body)
            
            # Parse form-encoded data
            parsed = parse_qs(body_text)
            
            # Convert from lists to single values
            result = {key: values[0] if len(values) == 1 else values 
                     for key, values in parsed.items()}
            
            logger.debug(f"Parsed Twilio webhook: {result}")
            return result
        
        except Exception as e:
            logger.error(f"Error parsing Twilio webhook body: {e}")
            raise ValueError(f"Invalid Twilio webhook body: {e}")
    
    @staticmethod
    async def process(raw_body: bytes) -> bool:
        """
        Process incoming Twilio webhook data.
        
        Args:
            raw_body: Raw webhook body
            
        Returns:
            True if processed successfully
        """
        try:
            # Parse webhook body
            body = TwilioWebhookProvider.parse_webhook_body(raw_body)
            
            # Twilio sends a flat structure
            # Incoming messages have Body field, status updates don't
            if body.get("Body"):
                # This is an incoming message
                await TwilioWebhookProvider._process_message(body)
            elif body.get("SmsStatus"):
                # This is a status update (delivery receipt)
                logger.info(f"[STATUS] Message {body.get('MessageSid')} - {body.get('SmsStatus')}")
            else:
                logger.warning(f"[WARN] Unknown webhook type - Available fields: {list(body.keys())}")
            
            return True
        except Exception as e:
            logger.error(f"[ERROR] Error processing Twilio webhook: {e}", exc_info=True)
            return False
    
    @staticmethod
    async def _process_message(body: Dict[str, Any]) -> None:
        """
        Process individual Twilio message.
        
        Twilio webhook fields:
        - From: Sender's WhatsApp number (format: whatsapp:+1234567890)
        - To: Your Twilio WhatsApp number
        - Body: Message text
        - MessageSid: Twilio's message ID
        - ChannelMetadata: JSON containing ProfileName and WaId
        """
        try:
            msg_id = body.get("MessageSid", "")
            
            # Extract data from Twilio's flat structure
            phone = body.get("From", "").replace("whatsapp:", "").replace("+", "")
            to_number = body.get("To", "")  # Which Twilio number received this message
            text = body.get("Body", "")
            
            # Log which number received the message
            logger.info(f"[MESSAGE] Received on Twilio number: {to_number}")
            
            # Extract ProfileName and WaId from ChannelMetadata
            sender_name = "User"
            wa_id = phone
            
            channel_metadata = body.get("ChannelMetadata", "")
            if channel_metadata:
                try:
                    metadata = json.loads(channel_metadata)
                    context = metadata.get("data", {}).get("context", {})
                    sender_name = context.get("ProfileName", "User")
                    wa_id = context.get("WaId", phone)
                except Exception as e:
                    logger.warning(f"Could not parse ChannelMetadata: {e}")
            
            if not phone or not text:
                logger.warning(f"[WARN] Missing required fields (From or Body)")
                return

            # Get timestamp
            formatted_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            logger.info(f"[MESSAGE] From: {sender_name} ({phone})")
            logger.info(f"[MESSAGE] Text: {text[:100]}.")
            logger.info(f"[MESSAGE] WaId: {wa_id}, MessageSid: {msg_id}")
            
            # Get or create customer and conversation
            customer_id = await ConversationService.get_or_create_customer(wa_id, phone, sender_name)
            conversation_id = await ConversationService.get_or_create_conversation(customer_id)
            logger.info(f"[DB] Customer ID: {customer_id}, Conversation ID: {conversation_id}")

            # Update which Twilio number received this message (for reply routing)
            await ConversationService.update_last_received_on(conversation_id, to_number)
            
            async with inbound_processing_lock(conversation_lock_key(conversation_id)):
                message_id, created = await ConversationService.save_message(
                    phone=phone,
                    message=text,
                    name=sender_name,
                    whatsapp_id=msg_id,
                    conversation_id=conversation_id,
                    role=MESSAGE_ROLE_USER,
                    status=MESSAGE_STATUS_RECEIVED,
                )
                if not created:
                    logger.info(f"[SKIP] Duplicate Twilio webhook for MessageSid {msg_id}")
                    return
                logger.info(f"[DB] Message saved (ID: {message_id})")

                ai_enabled = await ConversationService.is_ai_enabled(conversation_id)
                if not ai_enabled:
                    logger.info(
                        f"[AI] AI disabled for conversation {conversation_id} - waiting for human agent"
                    )
                    return

                if await ConversationService.has_reply_after_message(conversation_id, message_id):
                    logger.info(f"[SKIP] Reply already sent for message {message_id}")
                    return

                logger.info(f"[AI] Generating response for conversation {conversation_id}...")
                response_text = await AIService.generate_response_safe(text, conversation_id)

                logger.info(f"[SEND] Sending reply to {phone} from {to_number}")
                send_success, provider_id = await WhatsAppService.send_message(
                    phone,
                    response_text,
                    incoming_to_number=to_number,
                )

                status = MESSAGE_STATUS_SENT if send_success else MESSAGE_STATUS_FAILED
                await ConversationService.save_message(
                    phone=phone,
                    message=response_text,
                    name=sender_name,
                    whatsapp_id=provider_id,
                    conversation_id=conversation_id,
                    role=MESSAGE_ROLE_ASSISTANT,
                    status=status,
                )

                if send_success:
                    logger.info(f"[OK] Reply sent successfully (status: {status})")
                else:
                    logger.warning(f"[ERROR] WhatsApp delivery failed (status: {status})")

        except Exception as e:
            logger.error(f"[ERROR] Error processing Twilio message: {e}", exc_info=True)
