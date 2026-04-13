"""Conversation service for business logic."""
from typing import Optional, List, Dict, Any
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
        conversation_id, created = await repository.get_or_create_conversation_with_status_check(customer_id)
        
        return conversation_id
    
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
    async def assign_lead(conversation_id: int, user_email: str):
        """Assign lead to user."""
        await repository.update_assignment(conversation_id, user_email)
    
    @staticmethod
    async def get_detail(conversation_id: int) -> Optional[Dict]:
        """Get conversation detail."""
        return await repository.get_conversation_detail(conversation_id)
    
    @staticmethod
    async def get_messages(limit: int = 50, user: Any = None) -> List[Dict]:
        """Get messages."""
        return await repository.get_messages(limit, user)
    
    @staticmethod
    async def get_responses(limit: int = 50, user: Any = None) -> List[Dict]:
        """Get responses."""
        return await repository.get_responses(limit, user)
    
    @staticmethod
    async def get_conversations(limit: int = 50, user: Any = None) -> List[Dict]:
        """Get conversations."""
        return await repository.get_messages_with_responses(limit, user)
    
    @staticmethod
    async def get_customers(limit: int = 50) -> List[Dict]:
        """Get customers."""
        return await repository.get_customers(limit)
    
    @staticmethod
    async def get_customer_history(phone: str) -> Dict:
        """Get customer history."""
        return await repository.get_customer_history(phone)

    @staticmethod
    async def get_customer_by_uuid(uuid: str) -> Optional[Dict]:
        """Get customer by UUID."""
        return await repository.get_customer_by_uuid(uuid)

    @staticmethod
    async def get_customer_history_by_uuid(uuid: str) -> list:
        """Get customer history by UUID."""
        return await repository.get_customer_history_by_uuid(uuid)

    @staticmethod
    async def get_detail_by_uuid(uuid: str) -> Optional[Dict]:
        """Get conversation detail by UUID."""
        return await repository.get_conversation_detail_by_uuid(uuid)

    @staticmethod
    async def update_status_by_uuid(uuid: str, lead_status: str, comments: Optional[str] = None):
        """Update conversation status by UUID."""
        return await repository.update_conversation_status_by_uuid(uuid, lead_status, comments)

    @staticmethod
    async def assign_lead_by_uuid(uuid: str, user_email: str):
        """Assign lead by UUID."""
        await repository.update_assignment_by_uuid(uuid, user_email)

    @staticmethod
    async def is_ai_enabled(conversation_id: int) -> bool:
        """Check if AI is enabled for a conversation."""
        return await repository.is_ai_enabled(conversation_id)

    @staticmethod
    async def toggle_ai_by_uuid(uuid: str, enabled: bool):
        """Toggle AI on/off for a conversation."""
        return await repository.toggle_ai_by_uuid(uuid, enabled)

    @staticmethod
    async def get_conversation_by_uuid(uuid: str):
        """Get conversation record by UUID."""
        return await repository.get_conversation_by_uuid(uuid)
