"""WhatsApp messaging service supporting multiple platforms (Twilio, Meta)."""
import logging
import json
import re
import httpx
from twilio.rest import Client
from app.core.config import settings as app_settings
from app.db.client import get_db
from app.modules.settings.service import SettingsService

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Service for sending WhatsApp messages via various providers."""
    
    @staticmethod
    async def send_message(phone_number: str, message_text: str, is_template: bool = False, incoming_to_number: str = None) -> bool:
        """
        Send a WhatsApp message using the correct account configuration.

        Args:
            phone_number: Recipient's phone number
            message_text: Message content
            is_template: Whether to send as template (Meta only)
            incoming_to_number: The Twilio number that received the incoming message (used to route reply from correct number)
        """
        logger.info(f"Attempting to send WhatsApp message to {phone_number} (template={is_template}), incoming_to={incoming_to_number}")

        try:
            db = await get_db()
            settings_svc = SettingsService(db)
            settings_data = await settings_svc.get_settings("WHATSAPP")

            # 1. Try to find active account from multi-account list
            accounts_json = settings_data.get("whatsapp_accounts", "[]")
            accounts = json.loads(accounts_json)

            # Helper to normalize numbers for comparison
            def normalize(num):
                return re.sub(r"\D", "", num) if num else ""

            # If we know which number received the message, find that account
            if incoming_to_number:
                incoming_norm = normalize(incoming_to_number)
                for acc in accounts:
                    config_num = acc.get("config", {}).get("whatsapp_number", "")
                    if normalize(config_num) == incoming_norm:
                        platform = acc.get("platform")
                        config = acc.get("config", {})
                        logger.info(f"[SEND] Using account matching number: {config_num}")
                        if platform == "meta":
                            return await WhatsAppService._send_meta(phone_number, message_text, config, is_template)
                        elif platform == "twilio":
                            return await WhatsAppService._send_twilio(phone_number, message_text, config)

            # Fallback: use "active" account
            active_acc = next((a for a in accounts if a.get("active")), None)

            if active_acc:
                platform = active_acc.get("platform")
                config = active_acc.get("config", {})

                if platform == "meta":
                    return await WhatsAppService._send_meta(phone_number, message_text, config, is_template)
                elif platform == "twilio":
                    return await WhatsAppService._send_twilio(phone_number, message_text, config)

            # 2. Fallback to legacy env vars (Twilio)
            legacy_config = {
                "account_sid": settings_data.get("twilio_account_sid") or app_settings.TWILIO_ACCOUNT_SID,
                "auth_token": settings_data.get("twilio_auth_token") or app_settings.TWILIO_AUTH_TOKEN,
                "whatsapp_number": settings_data.get("twilio_whatsapp_number") or app_settings.TWILIO_WHATSAPP_NUMBER
            }

            if legacy_config["account_sid"] and legacy_config["auth_token"]:
                return await WhatsAppService._send_twilio(phone_number, message_text, legacy_config)

            logger.error("No active WhatsApp account configured")
            return False

        except Exception as e:
            logger.error(f"[ERROR] send_message failed: {e}", exc_info=True)
            return False

    @staticmethod
    async def _send_twilio(phone_number: str, message_text: str, config: dict) -> bool:
        """Internal helper for Twilio sending."""
        try:
            sid = config.get("account_sid")
            token = config.get("auth_token")
            from_number = config.get("whatsapp_number")
            
            if not sid or not token or not from_number:
                logger.error("Incomplete Twilio configuration")
                return False
                
            client = Client(sid, token)
            
            # Clean number: remove non-digits, then add whatsapp: prefix
            import re
            clean_number = re.sub(r"\D", "", phone_number)
            to_number = f"whatsapp:+{clean_number}" if not phone_number.startswith("whatsapp:") else phone_number
            
            send_from = from_number if from_number.startswith("whatsapp:") else f"whatsapp:{from_number}"
            
            logger.info(f"Twilio sending from {send_from} to {to_number}")
            message = client.messages.create(
                from_=send_from,
                body=message_text,
                to=to_number
            )
            logger.info(f"[OK] Twilio sent - SID: {message.sid}")
            return True
        except Exception as e:
            logger.error(f"Twilio send failed: {e}")
            return False

    @staticmethod
    async def _send_meta(phone_number: str, message_text: str, config: dict, is_template: bool = False) -> bool:
        """Internal helper for Meta (WhatsApp Cloud API) sending."""
        try:
            phone_id = config.get("phone_number_id")
            token = config.get("access_token")
            
            if not phone_id or not token:
                logger.error("Incomplete Meta configuration")
                return False
            
            import re
            clean_number = re.sub(r"\D", "", phone_number)
            
            url = f"https://graph.facebook.com/v17.0/{phone_id}/messages"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            
            if is_template:
                # Use template registry for cleaner management
                from app.modules.whatsapp.templates import WhatsAppTemplates
                
                # Default to order_confirmation template
                # You can make this configurable later
                payload = WhatsAppTemplates.get_template_payload(
                    template_key="order_confirmation",
                    recipient=clean_number,
                    params=[
                        message_text or "Test User",  # Customer name
                        "123456",                      # Order ID
                        "Feb 17, 2026"                # Delivery date
                    ]
                )
            else:
                payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": clean_number,
                    "type": "text",
                    "text": {"body": message_text}
                }
            
            logger.info(f"Meta sending (template={is_template}) to {clean_number} via {phone_id}")
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload)
                
            if response.status_code in [200, 201]:
                logger.info(f"[OK] Meta sent - ID: {response.json().get('messages', [{}])[0].get('id')}")
                return True
            else:
                logger.error(f"Meta send failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Meta send failed exception: {e}")
            return False
