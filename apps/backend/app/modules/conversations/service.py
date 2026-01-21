"""Conversation service for business logic."""
from typing import Optional, List, Dict
from app.modules.conversations.repository import ConversationRepository

repository = ConversationRepository()


class ConversationService:
    """Service layer for conversation operations."""
    
    @staticmethod
    async def get_or_create_customer(wa_id: str, phone: str, name: str) -> int:
        """Get or create customer."""
        return await repository.get_or_create_customer(wa_id, phone, name)
    
    @staticmethod
    async def get_or_create_conversation(customer_id: int) -> int:
        """Get or create conversation."""
        return await repository.get_or_create_conversation(customer_id)
    
    @staticmethod
    async def save_message(
        phone: str,
        message: str,
        name: str,
        whatsapp_id: Optional[str],
        conversation_id: int,
        role: str,
        status: str
    ) -> int:
        """Save message."""
        return await repository.save_message(
            phone, message, name, whatsapp_id, conversation_id, role, status
        )
    
    @staticmethod
    async def update_status(conversation_id: int, lead_status: str, comments: Optional[str] = None):
        """Update conversation status."""
        await repository.update_conversation_status(conversation_id, lead_status, comments)
    
    @staticmethod
    async def get_detail(conversation_id: int) -> Optional[Dict]:
        """Get conversation detail."""
        return await repository.get_conversation_detail(conversation_id)
    
    @staticmethod
    async def get_messages(limit: int = 50) -> List[Dict]:
        """Get messages."""
        return await repository.get_messages(limit)
    
    @staticmethod
    async def get_responses(limit: int = 50) -> List[Dict]:
        """Get responses."""
        return await repository.get_responses(limit)
    
    @staticmethod
    async def get_conversations(limit: int = 50) -> List[Dict]:
        """Get conversations."""
        return await repository.get_messages_with_responses(limit)
    
    @staticmethod
    async def get_customers(limit: int = 50) -> List[Dict]:
        """Get customers."""
        return await repository.get_customers(limit)
    
    @staticmethod
    async def get_customer_history(phone: str) -> Dict:
        """Get customer history."""
        return await repository.get_customer_history(phone)
