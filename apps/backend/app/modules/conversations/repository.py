"""Conversation repository for database operations."""
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from app.db.base import BaseRepository
from app.db.client import get_db
from app.core.constants import *
import logging

logger = logging.getLogger(__name__)


class ConversationRepository(BaseRepository):
    """Repository for conversation-related database operations."""
    
    def __init__(self):
        super().__init__("conversation")
    
    async def get_or_create_customer(self, wa_id: str, phone: str, name: str) -> int:
        """Get or create customer by WhatsApp ID."""
        db = await self.get_db()
        
        customer = await db.customer.upsert(
            where={"waId": wa_id},
            data={
                "create": {
                    "waId": wa_id,
                    "phone": phone,
                    "name": name,
                    "createdAt": datetime.now(),
                    "updatedAt": datetime.now()
                },
                "update": {
                    "phone": phone,
                    "name": name,
                    "updatedAt": datetime.now()
                }
            }
        )
        
        return customer.id
    
    async def get_or_create_conversation(self, customer_id: int) -> int:
        """Get or create active conversation for customer."""
        # This old method signature is kept for compatibility if used elsewhere, 
        # but Service uses it. To support notification, we need to know if it was created.
        # Let's create a new method or modify this if we can update call sites.
        # Determining call sites: Service calls this.
        return (await self.get_or_create_conversation_with_status_check(customer_id))[0]

    async def get_or_create_conversation_with_status_check(self, customer_id: int) -> Tuple[int, bool]:
        """Get or create active conversation returning (id, created)."""
        db = await self.get_db()
        
        # Find active conversation
        conversation = await db.conversation.find_first(
            where={"customerId": customer_id, "status": CONVERSATION_STATUS_ACTIVE}
        )
        
        if conversation:
            return conversation.id, False
        
        # Create new conversation
        conversation = await db.conversation.create(
            data={
                "customerId": customer_id,
                "status": CONVERSATION_STATUS_ACTIVE,
                "leadStatus": LEAD_STATUS_NEW,
                "createdAt": datetime.now(),
                "updatedAt": datetime.now()
            }
        )
        
        return conversation.id, True
    
    async def save_message(
        self,
        phone: str,
        message: str,
        name: str,
        whatsapp_id: Optional[str],
        conversation_id: int,
        role: str,
        status: str
    ) -> int:
        """Save a message to the database."""
        db = await self.get_db()
        
        # Check for duplicate
        if whatsapp_id:
            existing = await db.message.find_unique(where={"whatsappId": whatsapp_id})
            if existing:
                logger.info(f"Message {whatsapp_id} already exists")
                return existing.id
        
        # Create message
        msg = await db.message.create(
            data={
                "conversationId": conversation_id,
                "whatsappId": whatsapp_id,
                "message": message,
                "role": role,
                "timestamp": datetime.now(),
                "status": status
            }
        )
        
        return msg.id
    
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
                "updatedAt": datetime.now()
            }
        )
    
    async def update_assignment(self, conversation_id: int, email: str):
        """Update conversation assignment."""
        db = await self.get_db()
        
        await db.conversation.update(
            where={"id": conversation_id},
            data={
                "assignedTo": email,
                "updatedAt": datetime.now()
            }
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
            "phone": conversation.customer.phone,
            "name": conversation.customer.name,
            "message": first_msg.message if first_msg else "",
            "message_time": first_msg.timestamp.isoformat() if first_msg else None, # Legacy key
            "timestamp": first_msg.timestamp.isoformat() if first_msg else None, # New key
            "response": first_resp.message if first_resp else None,
            "response_time": first_resp.timestamp.isoformat() if first_resp else None, # Legacy key
            "response_timestamp": first_resp.timestamp.isoformat() if first_resp else None, # New key
            "lead_status": conversation.leadStatus,
            "comments": conversation.comments,
            "assigned_to": conversation.assignedTo,
            "ai_enabled": conversation.aiEnabled,
            "updated_at": conversation.updatedAt.isoformat(),
            # Include full messages for advanced view if needed, but keeping flat structure primarily
            "messages_list": [
                {
                    "role": msg.role,
                    "message": msg.message,
                    "timestamp": msg.timestamp.isoformat()
                }
                for msg in conversation.messages
            ]
        }
    
    async def get_messages(self, limit: int = 50, user: Any = None) -> List[Dict]:
        """Get recent messages."""
        db = await self.get_db()
        
        where_clause = {"role": MESSAGE_ROLE_USER}
        
        # Filter by assigned user if not admin
        if user and user.role != "ADMIN":
            where_clause["conversation"] = {"assignedTo": user.email}
        
        messages = await db.message.find_many(
            where=where_clause,
            include={"conversation": {"include": {"customer": True}}},
            order={"timestamp": "desc"},
            take=limit
        )
        
        return [
            {
                "id": msg.id,
                "phone": msg.conversation.customer.phone,
                "name": msg.conversation.customer.name,
                "message": msg.message,
                "timestamp": msg.timestamp.isoformat(),
                "whatsapp_id": msg.whatsappId,
                "status": msg.status
            }
            for msg in messages
        ]
    
    async def get_responses(self, limit: int = 50, user: Any = None) -> List[Dict]:
        """Get recent AI responses."""
        db = await self.get_db()
        
        where_clause = {"role": MESSAGE_ROLE_ASSISTANT}
        
        # Filter by assigned user if not admin
        if user and user.role != "ADMIN":
            where_clause["conversation"] = {"assignedTo": user.email}
        
        messages = await db.message.find_many(
            where=where_clause,
            include={"conversation": {"include": {"customer": True}}},
            order={"timestamp": "desc"},
            take=limit
        )
        
        return [
            {
                "id": msg.id,
                "phone": msg.conversation.customer.phone,
                "name": msg.conversation.customer.name,
                "response": msg.message,
                "timestamp": msg.timestamp.isoformat(),
                "status": msg.status
            }
            for msg in messages
        ]
    
    async def get_messages_with_responses(self, limit: int = 50, user: Any = None) -> List[Dict]:
        """Get conversations with messages and responses."""
        db = await self.get_db()
        
        where_clause = {}
        
        # Filter by assigned user if not admin
        if user and user.role != "ADMIN":
            where_clause["assignedTo"] = user.email
        
        conversations = await db.conversation.find_many(
            where=where_clause,
            include={
                "customer": True,
                "messages": {"order_by": {"timestamp": "asc"}}
            },
            order={"updatedAt": "desc"},
            take=limit
        )
        
        result = []
        for conv in conversations:
            customer_messages = [m for m in conv.messages if m.role == MESSAGE_ROLE_USER]
            ai_messages = [m for m in conv.messages if m.role == MESSAGE_ROLE_ASSISTANT]
            
            if customer_messages:
                # Show the LATEST customer message instead of the first one
                latest_message = customer_messages[-1]
                last_response = ai_messages[-1] if ai_messages else None
                
                result.append({
                    "message_id": conv.id,  # OLD API used message_id
                    "uuid": conv.uuid,
                    "phone": conv.customer.phone,
                    "name": conv.customer.name,
                    "message": latest_message.message,
                    "message_time": latest_message.timestamp.isoformat(),  # OLD API used message_time
                    "lead_status": conv.leadStatus,
                    "comments": conv.comments,
                    "assigned_to": conv.assignedTo,
                    "ai_enabled": conv.aiEnabled,
                    "response": last_response.message if last_response else None,
                    "response_time": last_response.timestamp.isoformat() if last_response else None,  # OLD API used response_time
                    "response_status": "sent" if last_response else None  # OLD API used response_status
                })
        
        return result
    
    async def get_customers(self, limit: int = 50) -> List[Dict]:
        """Get unique customers."""
        db = await self.get_db()
        
        conversations = await db.conversation.find_many(
            include={
                "customer": True,
                "messages": {
                    "where": {"role": MESSAGE_ROLE_USER},
                    "order_by": {"timestamp": "asc"},
                    "take": 1
                }
            },
            order={"updatedAt": "desc"},
            take=limit
        )
        
        return [
            {
                "customer_id": conv.id,  # OLD API used customer_id
                "uuid": conv.customer.uuid,
                "phone": conv.customer.phone,
                "name": conv.customer.name,
                "message": conv.messages[0].message if conv.messages else "",
                "message_time": conv.createdAt.isoformat(),  # OLD API used message_time
                "lead_status": conv.leadStatus,
                "comments": conv.comments,
                "status_updated_at": conv.updatedAt.isoformat()  # OLD API used status_updated_at
            }
            for conv in conversations
        ]
    
    async def get_customer_history(self, phone: str) -> list:
        """Get full conversation history for a customer (OLD API format)."""
        db = await self.get_db()
        
        customer = await db.customer.find_first(where={"phone": phone})
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
                if msg.role == MESSAGE_ROLE_USER:
                    role, name = "customer", customer.name
                elif msg.role == MESSAGE_ROLE_AGENT:
                    role, name = "agent", "Human Agent"
                else:
                    role, name = "agent", "AI Assistant"
                history.append({
                    "name": name,
                    "content": msg.message,
                    "timestamp": msg.timestamp.isoformat(),
                    "role": role
                })
        
        # Already sorted by timestamp due to order_by in query
        return history

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
                    "where": {"role": "user"},
                    "order_by": {"timestamp": "asc"},
                    "take": 1
                }
            },
            order={"updatedAt": "desc"}
        )
        
        return {
            "customer_id": customer.id,
            "uuid": customer.uuid,
            "phone": customer.phone,
            "name": customer.name,
            "message": conversation.messages[0].message if conversation and conversation.messages else "",
            "message_time": conversation.createdAt.isoformat() if conversation else None,
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
                if msg.role == MESSAGE_ROLE_USER:
                    role, name = "customer", customer.name
                elif msg.role == MESSAGE_ROLE_AGENT:
                    role, name = "agent", "Human Agent"
                else:
                    role, name = "agent", "AI Assistant"
                history.append({
                    "name": name,
                    "content": msg.message,
                    "timestamp": msg.timestamp.isoformat(),
                    "role": role
                })
        
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
            "phone": conversation.customer.phone,
            "name": conversation.customer.name,
            "message": first_msg.message if first_msg else "",
            "message_time": first_msg.timestamp.isoformat() if first_msg else None,
            "timestamp": first_msg.timestamp.isoformat() if first_msg else None,
            "response": first_resp.message if first_resp else None,
            "response_time": first_resp.timestamp.isoformat() if first_resp else None,
            "response_timestamp": first_resp.timestamp.isoformat() if first_resp else None,
            "lead_status": conversation.leadStatus,
            "comments": conversation.comments,
            "assigned_to": conversation.assignedTo,
            "ai_enabled": conversation.aiEnabled,
            "updated_at": conversation.updatedAt.isoformat(),
            "messages_list": [
                {
                    "role": msg.role,
                    "message": msg.message,
                    "timestamp": msg.timestamp.isoformat()
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
                "updatedAt": datetime.now()
            }
        )
        return True

    async def update_assignment_by_uuid(self, uuid: str, email: str):
        """Update conversation assignment by UUID."""
        db = await self.get_db()
        
        await db.conversation.update(
            where={"uuid": uuid},
            data={
                "assignedTo": email,
                "updatedAt": datetime.now()
            }
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
                "updatedAt": datetime.now()
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
