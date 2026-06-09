"""Conversation service for business logic."""
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from app.db.client import get_db
from app.db.prisma.enums import Channel
from app.core.constants import LEAD_STATUS_NEW
from app.modules.conversations.repository import ConversationRepository
from app.modules.conversations.events import notify_conversation_history_updated
from app.modules.settings.service import SettingsService

repository = ConversationRepository()


class ConversationService:
    """Service layer for conversation operations."""

    @staticmethod
    async def _maybe_auto_assign(
        conversation_id: int, *, preserve_lead_status: bool = False
    ) -> None:
        """Assign new lead to default assignee when CRM auto-assign is enabled."""
        db = await get_db()
        crm = await SettingsService(db).get_settings("CRM")
        if crm.get("auto_assign_lead") != "true":
            return
        assignee = (crm.get("default_assignee") or "").strip()
        if not assignee:
            return
        if preserve_lead_status:
            await repository.update_assignee_only(conversation_id, assignee)
        else:
            await repository.update_assignment(conversation_id, assignee)

    @staticmethod
    async def _maybe_auto_assign_email(conversation_id: int) -> None:
        """Auto-assign email leads without overwriting keyword-derived lead status."""
        await ConversationService._maybe_auto_assign(
            conversation_id, preserve_lead_status=True
        )
    
    @staticmethod
    async def get_or_create_customer(
        wa_id: str = "",
        phone: str = "",
        name: str = "",
        *,
        channel: Channel = Channel.WHATSAPP,
        email: Optional[str] = None,
    ) -> int:
        """Get or create customer."""
        return await repository.get_or_create_customer(
            wa_id, phone, name, channel=channel, email=email
        )
    
    @staticmethod
    async def get_or_create_conversation(
        customer_id: int,
        channel: Channel = Channel.WHATSAPP,
        *,
        email_lead_status: Optional[str] = None,
        auto_assign: bool = False,
    ) -> int:
        """Get or create conversation."""
        initial_status = (
            email_lead_status if channel == Channel.EMAIL and email_lead_status else LEAD_STATUS_NEW
        )
        conversation_id, created = await repository.get_or_create_conversation_with_status_check(
            customer_id,
            channel,
            lead_status=initial_status,
        )
        if created and channel == Channel.EMAIL and email_lead_status:
            await repository.sync_email_conversation_visibility(
                conversation_id, email_lead_status
            )
        if created and auto_assign:
            await ConversationService._maybe_auto_assign(conversation_id)
        return conversation_id

    @staticmethod
    async def update_last_received_on(conversation_id: int, to_number: str):
        """Update which Twilio number last received a message for this conversation."""
        await repository.update_last_received_on(conversation_id, to_number)
    
    @staticmethod
    async def save_message(
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
        """Save message. Returns (id, created)."""
        message_id, created = await repository.save_message(
            phone,
            message,
            name,
            whatsapp_id,
            conversation_id,
            role,
            status,
            channel=channel,
            external_id=external_id,
            timestamp=timestamp,
            html_body=html_body,
        )
        if created:
            await notify_conversation_history_updated(conversation_id)
        return message_id, created

    @staticmethod
    async def has_reply_after_message(conversation_id: int, inbound_message_id: int) -> bool:
        return await repository.has_reply_after_message(conversation_id, inbound_message_id)
    
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
    async def get_messages(
        limit: int = 50, user: Any = None, channel: Optional[str] = None
    ) -> List[Dict]:
        """Get messages."""
        return await repository.get_messages(limit, user, channel)
    
    @staticmethod
    async def get_responses(
        limit: int = 50, user: Any = None, channel: Optional[str] = None
    ) -> List[Dict]:
        """Get responses."""
        return await repository.get_responses(limit, user, channel)
    
    @staticmethod
    async def get_conversations(
        limit: int = 50, user: Any = None, channel: Optional[str] = None
    ) -> List[Dict]:
        """Get conversations."""
        return await repository.get_messages_with_responses(limit, user, channel)
    
    @staticmethod
    async def get_customers(limit: int = 50, channel: Optional[str] = None) -> List[Dict]:
        """Get customers."""
        return await repository.get_customers(limit, channel)
    
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
    async def update_message_status_by_whatsapp_id(whatsapp_id: str, status: str) -> bool:
        """Update message delivery status from provider webhooks."""
        conversation_id = await repository.update_message_status_by_whatsapp_id(
            whatsapp_id, status
        )
        if conversation_id is not None:
            await notify_conversation_history_updated(conversation_id)
            return True
        return False

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

    @staticmethod
    async def create_customer(phone: str, name: Optional[str] = None) -> Dict[str, Any]:
        """Create a CRM customer manually (admin)."""
        result = await repository.create_customer_manual(phone, name)
        if result.get("created") and result.get("conversation_id"):
            await ConversationService._maybe_auto_assign(result["conversation_id"])
        return result

    @staticmethod
    async def delete_customer_by_uuid(uuid: str) -> bool:
        """Delete customer and cascaded conversations."""
        return await repository.delete_customer_by_uuid(uuid)

    @staticmethod
    async def bulk_delete_customers(uuids: List[str]) -> Dict[str, Any]:
        """Delete multiple customers by UUID."""
        deleted = []
        errors = []
        for uuid in uuids:
            try:
                ok = await repository.delete_customer_by_uuid(uuid)
                if ok:
                    deleted.append(uuid)
                else:
                    errors.append({"uuid": uuid, "error": "Not found"})
            except Exception as exc:
                errors.append({"uuid": uuid, "error": str(exc)})
        return {"deleted": deleted, "errors": errors}
