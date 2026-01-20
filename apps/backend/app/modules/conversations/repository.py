"""Conversation repository for database operations."""
from typing import Optional, List, Dict, Any
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
        db = await self.get_db()
        
        # Find active conversation
        conversation = await db.conversation.find_first(
            where={"customerId": customer_id, "status": CONVERSATION_STATUS_ACTIVE}
        )
        
        if conversation:
            return conversation.id
        
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
        
        return conversation.id
    
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
    
    async def get_messages(self, limit: int = 50) -> List[Dict]:
        """Get recent messages."""
        db = await self.get_db()
        
        messages = await db.message.find_many(
            where={"role": MESSAGE_ROLE_USER},
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
    
    async def get_responses(self, limit: int = 50) -> List[Dict]:
        """Get recent AI responses."""
        db = await self.get_db()
        
        messages = await db.message.find_many(
            where={"role": MESSAGE_ROLE_ASSISTANT},
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
    
    async def get_messages_with_responses(self, limit: int = 50) -> List[Dict]:
        """Get conversations with messages and responses."""
        db = await self.get_db()
        
        conversations = await db.conversation.find_many(
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
                    "phone": conv.customer.phone,
                    "name": conv.customer.name,
                    "message": latest_message.message,
                    "message_time": latest_message.timestamp.isoformat(),  # OLD API used message_time
                    "lead_status": conv.leadStatus,
                    "comments": conv.comments,
                    "assigned_to": conv.assignedTo,
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
                history.append({
                    "name": customer.name if msg.role == MESSAGE_ROLE_USER else "System",
                    "content": msg.message,
                    "timestamp": msg.timestamp.isoformat(),
                    "role": "customer" if msg.role == MESSAGE_ROLE_USER else "system"
                })
        
        # Already sorted by timestamp due to order_by in query
        return history
