"""Conversation repository for database operations."""
from typing import Optional, List, Dict, Any, Tuple, Union
from datetime import datetime
from app.db.base import BaseRepository
from app.db.client import get_db
from app.db.prisma.enums import Channel
from app.core.constants import *
from app.core.datetime_utils import utc_now, format_api_datetime
import logging

logger = logging.getLogger(__name__)


def _channel_filter(channel: Optional[str]) -> Optional[Channel]:
    if not channel:
        return None
    key = channel.strip().lower()
    if key == "email":
        return Channel.EMAIL
    if key == "whatsapp":
        return Channel.WHATSAPP
    return None


def _channel_label(channel: Optional[Union[Channel, str]]) -> str:
    if channel is None:
        return "whatsapp"
    val = str(channel).upper()
    if "EMAIL" in val:
        return "email"
    return "whatsapp"


class ConversationRepository(BaseRepository):
    """Repository for conversation-related database operations."""
    
    def __init__(self):
        super().__init__("conversation")
    
    async def get_or_create_customer(
        self,
        wa_id: str = "",
        phone: str = "",
        name: str = "",
        *,
        channel: Channel = Channel.WHATSAPP,
        email: Optional[str] = None,
    ) -> int:
        """Get or create customer by WhatsApp ID or email address."""
        db = await self.get_db()
        now = utc_now()

        if channel == Channel.EMAIL:
            normalized_email = (email or "").strip().lower()
            if not normalized_email:
                raise ValueError("Email address required for EMAIL channel customers")

            existing = await db.customer.find_first(
                where={"channel": Channel.EMAIL, "email": normalized_email}
            )
            if existing:
                await db.customer.update(
                    where={"id": existing.id},
                    data={"name": name or existing.name, "updatedAt": now},
                )
                return existing.id

            try:
                customer = await db.customer.create(
                    data={
                        "channel": Channel.EMAIL,
                        "email": normalized_email,
                        "name": name or normalized_email.split("@")[0],
                        "createdAt": now,
                        "updatedAt": now,
                    }
                )
                return customer.id
            except Exception as e:
                err = str(e).lower()
                if "unique" in err or "p2002" in err:
                    existing = await db.customer.find_first(
                        where={"channel": Channel.EMAIL, "email": normalized_email}
                    )
                    if existing:
                        await db.customer.update(
                            where={"id": existing.id},
                            data={"name": name or existing.name, "updatedAt": now},
                        )
                        return existing.id
                raise

        customer = await db.customer.upsert(
            where={"waId": wa_id},
            data={
                "create": {
                    "channel": Channel.WHATSAPP,
                    "waId": wa_id,
                    "phone": phone,
                    "name": name,
                    "createdAt": now,
                    "updatedAt": now,
                },
                "update": {
                    "phone": phone,
                    "name": name,
                    "updatedAt": now,
                },
            },
        )
        return customer.id
    
    async def get_or_create_conversation(self, customer_id: int, channel: Channel = Channel.WHATSAPP) -> int:
        """Get or create active conversation for customer."""
        return (await self.get_or_create_conversation_with_status_check(customer_id, channel))[0]

    async def get_or_create_conversation_with_status_check(
        self,
        customer_id: int,
        channel: Channel = Channel.WHATSAPP,
        *,
        lead_status: Optional[str] = None,
    ) -> Tuple[int, bool]:
        """Get or create active conversation returning (id, created)."""
        db = await self.get_db()
        
        conversation = await db.conversation.find_first(
            where={
                "customerId": customer_id,
                "status": CONVERSATION_STATUS_ACTIVE,
                "channel": channel,
            }
        )
        
        if conversation:
            return conversation.id, False
        
        conversation = await db.conversation.create(
            data={
                "customerId": customer_id,
                "channel": channel,
                "status": CONVERSATION_STATUS_ACTIVE,
                "leadStatus": lead_status or LEAD_STATUS_NEW,
                "createdAt": utc_now(),
                "updatedAt": utc_now(),
            }
        )
        
        return conversation.id, True

    async def sync_email_conversation_visibility(
        self, conversation_id: int, lead_status: str
    ) -> None:
        """Apply email ingest visibility (Customers vs Leads modules)."""
        db = await self.get_db()
        data: Dict[str, Any] = {"leadStatus": lead_status, "updatedAt": utc_now()}
        if lead_status == LEAD_STATUS_INBOX:
            data["assignedTo"] = None
        await db.conversation.update(where={"id": conversation_id}, data=data)

    @staticmethod
    def _email_customer_visible_filter() -> Dict[str, Any]:
        """Email conversations listed in Customers/Messages (exclude leads-only)."""
        return {
            "OR": [
                {"channel": Channel.WHATSAPP},
                {
                    "channel": Channel.EMAIL,
                    "leadStatus": {"not": LEAD_STATUS_LEADS_ONLY},
                },
            ]
        }

    async def update_last_received_on(self, conversation_id: int, to_number: str):
        """Update which Twilio number last received a message for this conversation."""
        db = await self.get_db()
        await db.conversation.update(
            where={"id": conversation_id},
            data={"lastReceivedOn": to_number, "updatedAt": utc_now()}
        )
    
    async def save_message(
        self,
        phone: str,
        message: str,
        name: str,
        whatsapp_id: Optional[str],
        conversation_id: int,
        role: str,
        status: str,
        channel: Channel = Channel.WHATSAPP,
        external_id: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        html_body: Optional[str] = None,
    ) -> Tuple[int, bool]:
        """Save a message. Returns (message_id, created). created=False for duplicate webhooks."""
        db = await self.get_db()

        if external_id:
            existing = await db.message.find_unique(where={"externalId": external_id})
            if existing:
                logger.info(f"Message {external_id} already exists (duplicate)")
                return existing.id, False

        if whatsapp_id:
            existing = await db.message.find_unique(where={"whatsappId": whatsapp_id})
            if existing:
                logger.info(f"Message {whatsapp_id} already exists (duplicate webhook)")
                return existing.id, False

        try:
            create_data: Dict[str, Any] = {
                "conversationId": conversation_id,
                "channel": channel,
                "whatsappId": whatsapp_id,
                "externalId": external_id,
                "message": message,
                "role": role,
                "timestamp": timestamp or utc_now(),
                "status": status,
            }
            if html_body:
                create_data["htmlBody"] = html_body
            msg = await db.message.create(data=create_data)
            await db.conversation.update(
                where={"id": conversation_id},
                data={"updatedAt": utc_now()},
            )
            return msg.id, True
        except Exception as e:
            err = str(e).lower()
            if external_id and ("unique" in err or "p2002" in err):
                existing = await db.message.find_unique(where={"externalId": external_id})
                if existing:
                    logger.info(f"Message {external_id} race duplicate — skipping")
                    return existing.id, False
            if whatsapp_id and ("unique" in err or "p2002" in err):
                existing = await db.message.find_unique(where={"whatsappId": whatsapp_id})
                if existing:
                    logger.info(f"Message {whatsapp_id} race duplicate — skipping")
                    return existing.id, False
            raise

    async def has_reply_after_message(self, conversation_id: int, inbound_message_id: int) -> bool:
        """True if an assistant/agent reply was already saved for this inbound message."""
        db = await self.get_db()
        inbound = await db.message.find_unique(where={"id": inbound_message_id})
        if not inbound:
            return False
        reply = await db.message.find_first(
            where={
                "conversationId": conversation_id,
                "role": {"in": [MESSAGE_ROLE_ASSISTANT, MESSAGE_ROLE_AGENT]},
                "id": {"not": inbound_message_id},
                "timestamp": {"gte": inbound.timestamp},
            },
            order={"timestamp": "asc"},
        )
        return reply is not None

    _STATUS_RANK = {
        "failed": 0,
        "received": 1,
        "sent": 2,
        "delivered": 3,
        "read": 4,
    }

    async def update_message_status_by_whatsapp_id(
        self, whatsapp_id: str, new_status: str
    ) -> Optional[int]:
        """Update delivery status from Meta/Twilio webhooks (never downgrade).

        Returns conversation_id when status was updated, else None.
        """
        db = await self.get_db()
        msg = await db.message.find_unique(where={"whatsappId": whatsapp_id})
        if not msg:
            return None

        current_rank = self._STATUS_RANK.get(msg.status, 0)
        new_rank = self._STATUS_RANK.get(new_status, 0)
        if new_rank <= current_rank:
            return None

        await db.message.update(
            where={"id": msg.id},
            data={"status": new_status},
        )
        return msg.conversationId
    
    async def update_conversation_status(
        self,
        conversation_id: int,
        lead_status: str,
        comments: Optional[str] = None
    ):
        """Update conversation lead status."""
        db = await self.get_db()
        
        await db.conversation.update(
            where={"id": conversation_id},
            data={
                "leadStatus": lead_status,
                "comments": comments,
                "updatedAt": utc_now()
            }
        )
    
    async def update_assignment(self, conversation_id: int, email: str):
        """Update conversation assignment and set lead status to assigned."""
        db = await self.get_db()

        await db.conversation.update(
            where={"id": conversation_id},
            data={
                "assignedTo": email,
                "leadStatus": LEAD_STATUS_ASSIGNED,
                "updatedAt": utc_now(),
            },
        )

    async def update_assignee_only(self, conversation_id: int, email: str):
        """Set assignee without changing lead status (e.g. email keyword rules)."""
        db = await self.get_db()
        await db.conversation.update(
            where={"id": conversation_id},
            data={"assignedTo": email, "updatedAt": utc_now()},
        )

    async def get_conversation_detail(self, conversation_id: int) -> Optional[Dict]:
        """Get conversation with all details."""
        db = await self.get_db()
        
        conversation = await db.conversation.find_unique(
            where={"id": conversation_id},
            include={
                "customer": True,
                "messages": {"order_by": {"timestamp": "asc"}}
            }
        )
        
        if not conversation:
            return None
        
        # Flatten for frontend compatibility
        customer_messages = [m for m in conversation.messages if m.role == MESSAGE_ROLE_USER]
        ai_messages = [m for m in conversation.messages if m.role == MESSAGE_ROLE_ASSISTANT]
        
        first_msg = customer_messages[0] if customer_messages else None
        first_resp = ai_messages[0] if ai_messages else None
        
        return {
            "id": conversation.id, # New key
            "uuid": conversation.uuid,
            "message_id": conversation.id, # Legacy key for compatibility
            "channel": _channel_label(conversation.channel),
            "phone": conversation.customer.phone or "",
            "email": conversation.customer.email,
            "name": conversation.customer.name,
            "message": first_msg.message if first_msg else "",
            "message_time": format_api_datetime(first_msg.timestamp) if first_msg else None, # Legacy key
            "timestamp": format_api_datetime(first_msg.timestamp) if first_msg else None, # New key
            "response": first_resp.message if first_resp else None,
            "response_time": format_api_datetime(first_resp.timestamp) if first_resp else None, # Legacy key
            "response_timestamp": format_api_datetime(first_resp.timestamp) if first_resp else None, # New key
            "lead_status": conversation.leadStatus,
            "comments": conversation.comments,
            "assigned_to": conversation.assignedTo,
            "ai_enabled": conversation.aiEnabled,
            "updated_at": format_api_datetime(conversation.updatedAt),
            # Include full messages for advanced view if needed, but keeping flat structure primarily
            "messages_list": [
                {
                    "role": msg.role,
                    "message": msg.message,
                    "timestamp": format_api_datetime(msg.timestamp)
                }
                for msg in conversation.messages
            ]
        }
    
    async def get_messages(
        self, limit: int = 50, user: Any = None, channel: Optional[str] = None
    ) -> List[Dict]:
        """Get recent messages."""
        db = await self.get_db()
        
        where_clause: Dict[str, Any] = {"role": MESSAGE_ROLE_USER}
        channel_enum = _channel_filter(channel)
        if channel_enum:
            where_clause["channel"] = channel_enum

        conv_filter: Dict[str, Any] = self._email_customer_visible_filter()
        if user and user.role != "ADMIN":
            conv_filter = {"AND": [conv_filter, {"assignedTo": user.email}]}
        where_clause["conversation"] = conv_filter
        
        messages = await db.message.find_many(
            where=where_clause,
            include={"conversation": {"include": {"customer": True}}},
            order={"id": "desc"},
            take=limit
        )
        
        return [
            {
                "id": msg.id,
                "channel": _channel_label(msg.channel),
                "phone": msg.conversation.customer.phone or "",
                "email": msg.conversation.customer.email,
                "name": msg.conversation.customer.name,
                "customer_uuid": str(msg.conversation.customer.uuid),
                "message": msg.message,
                "html_body": getattr(msg, "htmlBody", None),
                "timestamp": format_api_datetime(msg.timestamp),
                "whatsapp_id": msg.whatsappId,
                "external_id": msg.externalId,
                "status": msg.status
            }
            for msg in messages
        ]
    
    async def get_responses(
        self, limit: int = 50, user: Any = None, channel: Optional[str] = None
    ) -> List[Dict]:
        """Get recent AI responses."""
        db = await self.get_db()
        
        where_clause: Dict[str, Any] = {"role": MESSAGE_ROLE_ASSISTANT}
        channel_enum = _channel_filter(channel)
        if channel_enum:
            where_clause["channel"] = channel_enum

        conv_filter: Dict[str, Any] = self._email_customer_visible_filter()
        if user and user.role != "ADMIN":
            conv_filter = {"AND": [conv_filter, {"assignedTo": user.email}]}
        where_clause["conversation"] = conv_filter
        
        messages = await db.message.find_many(
            where=where_clause,
            include={"conversation": {"include": {"customer": True}}},
            order={"timestamp": "desc"},
            take=limit
        )
        
        return [
            {
                "id": msg.id,
                "channel": _channel_label(msg.channel),
                "phone": msg.conversation.customer.phone or "",
                "email": msg.conversation.customer.email,
                "name": msg.conversation.customer.name,
                "response": msg.message,
                "timestamp": format_api_datetime(msg.timestamp),
                "status": msg.status
            }
            for msg in messages
        ]
    
    async def get_messages_with_responses(
        self, limit: int = 50, user: Any = None, channel: Optional[str] = None
    ) -> List[Dict]:
        """Get conversations with messages and responses."""
        db = await self.get_db()
        
        where_clause: Dict[str, Any] = {"leadStatus": {"not": LEAD_STATUS_INBOX}}
        channel_enum = _channel_filter(channel)
        if channel_enum:
            where_clause["channel"] = channel_enum
        
        # Filter by assigned user if not admin
        if user and user.role != "ADMIN":
            where_clause["assignedTo"] = user.email
        
        conversations = await db.conversation.find_many(
            where=where_clause,
            include={
                "customer": True,
                "messages": {"order_by": {"id": "desc"}}
            },
            order={"updatedAt": "desc"},
            take=limit
        )
        
        result = []
        for conv in conversations:
            customer_messages = [m for m in conv.messages if m.role == MESSAGE_ROLE_USER]
            ai_messages = [m for m in conv.messages if m.role == MESSAGE_ROLE_ASSISTANT]
            
            if customer_messages:
                latest_message = customer_messages[0]
                last_response = ai_messages[0] if ai_messages else None
                
                result.append({
                    "message_id": conv.id,
                    "latest_message_id": latest_message.id,
                    "uuid": conv.uuid,
                    "channel": _channel_label(conv.channel),
                    "phone": conv.customer.phone or "",
                    "email": conv.customer.email,
                    "name": conv.customer.name,
                    "message": latest_message.message,
                    "message_time": format_api_datetime(latest_message.timestamp),
                    "lead_status": conv.leadStatus,
                    "comments": conv.comments,
                    "assigned_to": conv.assignedTo,
                    "ai_enabled": conv.aiEnabled,
                    "response": last_response.message if last_response else None,
                    "response_time": format_api_datetime(last_response.timestamp) if last_response else None,
                    "response_status": "sent" if last_response else None
                })
        
        result.sort(key=lambda row: row.get("latest_message_id") or 0, reverse=True)
        return result
    
    async def get_customers(self, limit: int = 50, channel: Optional[str] = None) -> List[Dict]:
        """Get unique customers."""
        db = await self.get_db()
        
        where_clause: Dict[str, Any] = self._email_customer_visible_filter()
        channel_enum = _channel_filter(channel)
        if channel_enum:
            where_clause = {"AND": [where_clause, {"channel": channel_enum}]}

        conversations = await db.conversation.find_many(
            where=where_clause,
            include={
                "customer": True,
                "messages": {
                    "where": {"role": MESSAGE_ROLE_USER},
                    "order_by": {"id": "desc"},
                    "take": 1
                }
            },
            order={"updatedAt": "desc"},
            take=limit
        )
        
        rows = [
            {
                "customer_id": conv.id,
                "latest_message_id": conv.messages[0].id if conv.messages else 0,
                "uuid": conv.customer.uuid,
                "channel": _channel_label(conv.channel),
                "phone": conv.customer.phone or "",
                "email": conv.customer.email,
                "name": conv.customer.name,
                "message": conv.messages[0].message if conv.messages else "",
                "message_time": format_api_datetime(conv.messages[0].timestamp)
                if conv.messages
                else format_api_datetime(conv.updatedAt),
                "lead_status": conv.leadStatus,
                "comments": conv.comments,
                "assigned_to": conv.assignedTo,
                "conversation_uuid": conv.uuid,
                "status_updated_at": format_api_datetime(conv.updatedAt)
            }
            for conv in conversations
        ]
        rows.sort(key=lambda row: row.get("latest_message_id") or 0, reverse=True)
        return rows
    
    async def get_customer_history(self, phone: str) -> list:
        """Get full conversation history for a customer by phone or email."""
        db = await self.get_db()

        identifier = (phone or "").strip()
        if "@" in identifier:
            customer = await db.customer.find_first(
                where={"channel": Channel.EMAIL, "email": identifier.lower()}
            )
        else:
            customer = await db.customer.find_first(where={"phone": identifier})
        if not customer:
            return []
        
        conversations = await db.conversation.find_many(
            where={"customerId": customer.id},
            include={"messages": {"order_by": {"timestamp": "asc"}}}
        )
        
        # Flatten all messages and format for old API
        history = []
        for conv in conversations:
            for msg in conv.messages:
                history.append(self._format_history_item(msg, customer.name))
        
        # Already sorted by timestamp due to order_by in query
        return history

    def _format_history_item(self, msg, customer_name: str) -> Dict[str, Any]:
        if msg.role == MESSAGE_ROLE_USER:
            role, name = "customer", customer_name
        elif msg.role == MESSAGE_ROLE_AGENT:
            role, name = "human_agent", "Human Agent"
        else:
            role, name = "agent", "AI Assistant"
        return {
            "id": msg.id,
            "name": name,
            "content": msg.message,
            "html_body": getattr(msg, "htmlBody", None),
            "timestamp": format_api_datetime(msg.timestamp),
            "role": role,
            "status": msg.status,
        }

    async def get_customer_by_uuid(self, uuid: str) -> Optional[Dict]:
        """Get customer details by UUID."""
        db = await self.get_db()
        
        customer = await db.customer.find_unique(where={"uuid": uuid})
        if not customer:
            return None
        
        # Get the latest conversation for this customer
        conversation = await db.conversation.find_first(
            where={"customerId": customer.id},
            include={
                "messages": {
                    "where": {"role": MESSAGE_ROLE_USER},
                    "order_by": {"timestamp": "asc"},
                }
            },
            order={"updatedAt": "desc"}
        )

        customer_messages = conversation.messages if conversation else []
        latest_msg = customer_messages[-1] if customer_messages else None

        return {
            "customer_id": customer.id,
            "uuid": customer.uuid,
            "channel": _channel_label(customer.channel),
            "phone": customer.phone or "",
            "email": customer.email,
            "name": customer.name,
            "message": latest_msg.message if latest_msg else "",
            "message_time": format_api_datetime(latest_msg.timestamp) if latest_msg else (
                format_api_datetime(conversation.createdAt) if conversation else None
            ),
            "lead_status": conversation.leadStatus if conversation else "new lead",
            "comments": conversation.comments if conversation else None,
            "conversation_uuid": conversation.uuid if conversation else None,
            "ai_enabled": conversation.aiEnabled if conversation else True,
        }

    async def get_customer_history_by_uuid(self, uuid: str) -> list:
        """Get full conversation history for a customer by UUID."""
        db = await self.get_db()
        
        customer = await db.customer.find_unique(where={"uuid": uuid})
        if not customer:
            return []
        
        conversations = await db.conversation.find_many(
            where={"customerId": customer.id},
            include={"messages": {"order_by": {"timestamp": "asc"}}}
        )
        
        history = []
        for conv in conversations:
            for msg in conv.messages:
                history.append(self._format_history_item(msg, customer.name))
        
        return history

    async def get_conversation_detail_by_uuid(self, uuid: str) -> Optional[Dict]:
        """Get conversation with all details by UUID."""
        db = await self.get_db()
        
        conversation = await db.conversation.find_unique(
            where={"uuid": uuid},
            include={
                "customer": True,
                "messages": {"order_by": {"timestamp": "asc"}}
            }
        )
        
        if not conversation:
            return None
        
        customer_messages = [m for m in conversation.messages if m.role == "user"]
        ai_messages = [m for m in conversation.messages if m.role == "assistant"]
        
        first_msg = customer_messages[0] if customer_messages else None
        first_resp = ai_messages[0] if ai_messages else None
        
        return {
            "id": conversation.id,
            "uuid": conversation.uuid,
            "message_id": conversation.id,
            "channel": _channel_label(conversation.channel),
            "phone": conversation.customer.phone or "",
            "email": conversation.customer.email,
            "name": conversation.customer.name,
            "message": first_msg.message if first_msg else "",
            "message_time": format_api_datetime(first_msg.timestamp) if first_msg else None,
            "timestamp": format_api_datetime(first_msg.timestamp) if first_msg else None,
            "response": first_resp.message if first_resp else None,
            "response_time": format_api_datetime(first_resp.timestamp) if first_resp else None,
            "response_timestamp": format_api_datetime(first_resp.timestamp) if first_resp else None,
            "lead_status": conversation.leadStatus,
            "comments": conversation.comments,
            "assigned_to": conversation.assignedTo,
            "ai_enabled": conversation.aiEnabled,
            "updated_at": format_api_datetime(conversation.updatedAt),
            "messages_list": [
                {
                    "role": msg.role,
                    "message": msg.message,
                    "timestamp": format_api_datetime(msg.timestamp)
                }
                for msg in conversation.messages
            ]
        }

    async def update_conversation_status_by_uuid(self, uuid: str, lead_status: str, comments: Optional[str] = None):
        """Update conversation lead status by UUID."""
        db = await self.get_db()
        
        conversation = await db.conversation.find_unique(where={"uuid": uuid})
        if not conversation:
            return False
        
        await db.conversation.update(
            where={"uuid": uuid},
            data={
                "leadStatus": lead_status,
                "comments": comments,
                "updatedAt": utc_now()
            }
        )
        return True

    async def update_assignment_by_uuid(self, uuid: str, email: str):
        """Update conversation assignment by UUID and set lead status to assigned."""
        db = await self.get_db()

        await db.conversation.update(
            where={"uuid": uuid},
            data={
                "assignedTo": email,
                "leadStatus": LEAD_STATUS_ASSIGNED,
                "updatedAt": utc_now(),
            },
        )

    async def is_ai_enabled(self, conversation_id: int) -> bool:
        """Check if AI is enabled for a conversation."""
        db = await self.get_db()
        conversation = await db.conversation.find_unique(where={"id": conversation_id})
        if not conversation:
            return True
        return conversation.aiEnabled

    async def toggle_ai_by_uuid(self, uuid: str, enabled: bool) -> Optional[bool]:
        """Toggle AI on/off for a conversation. Returns new state or None if not found."""
        db = await self.get_db()
        conversation = await db.conversation.find_unique(where={"uuid": uuid})
        if not conversation:
            return None
        
        await db.conversation.update(
            where={"uuid": uuid},
            data={
                "aiEnabled": enabled,
                "updatedAt": utc_now()
            }
        )
        return enabled

    async def get_conversation_by_uuid(self, uuid: str):
        """Get conversation record by UUID."""
        db = await self.get_db()
        return await db.conversation.find_unique(
            where={"uuid": uuid},
            include={"customer": True}
        )

    async def create_customer_manual(self, phone: str, name: Optional[str] = None) -> Dict[str, Any]:
        """Create customer with generated wa_id from phone."""
        import re
        import uuid as uuid_lib
        db = await self.get_db()
        clean = re.sub(r"\D", "", phone or "")
        if len(clean) < 8:
            raise ValueError("Valid phone number required")
        wa_id = f"manual_{clean}"
        display_name = (name or "Customer").strip()
        existing = await db.customer.find_first(where={"OR": [{"waId": wa_id}, {"phone": phone}]})
        if existing:
            return {
                "uuid": str(existing.uuid),
                "phone": existing.phone,
                "name": existing.name,
                "created": False,
            }
        customer = await db.customer.create(
            data={
                "channel": Channel.WHATSAPP,
                "waId": wa_id,
                "phone": phone,
                "name": display_name,
                "createdAt": utc_now(),
                "updatedAt": utc_now(),
            }
        )
        conversation = await db.conversation.create(
            data={
                "customerId": customer.id,
                "channel": Channel.WHATSAPP,
                "status": CONVERSATION_STATUS_ACTIVE,
                "leadStatus": LEAD_STATUS_NEW,
                "createdAt": utc_now(),
                "updatedAt": utc_now(),
            }
        )
        return {
            "uuid": str(customer.uuid),
            "phone": customer.phone,
            "name": customer.name,
            "created": True,
            "conversation_id": conversation.id,
        }

    async def delete_customer_by_uuid(self, customer_uuid: str) -> bool:
        db = await self.get_db()
        customer = await db.customer.find_first(where={"uuid": customer_uuid})
        if not customer:
            return False
        await db.customer.delete(where={"id": customer.id})
        return True
