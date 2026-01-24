"""Notification service for business logic."""
from typing import List, Dict, Any
from app.modules.notifications.repository import NotificationRepository

repository = NotificationRepository()


class NotificationService:
    """Service layer for notification operations."""
    
    @staticmethod
    async def create_notification(
        user_id: int,
        notification_type: str,
        title: str,
        message: str,
        conversation_id: int = None
    ) -> int:
        """Create a new notification."""
        return await repository.create_notification(
            user_id,
            notification_type,
            title,
            message,
            conversation_id
        )
    
    @staticmethod
    async def get_user_notifications(
        user_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        """Get notifications for a user."""
        return await repository.get_user_notifications(user_id, unread_only, limit)
    
    @staticmethod
    async def mark_as_read(notification_id: int, user_id: int):
        """Mark a notification as read."""
        await repository.mark_as_read(notification_id, user_id)
    
    @staticmethod
    async def mark_all_as_read(user_id: int):
        """Mark all notifications as read for a user."""
        await repository.mark_all_as_read(user_id)
    
    @staticmethod
    async def get_unread_count(user_id: int) -> int:
        """Get count of unread notifications."""
        return await repository.get_unread_count(user_id)
    
    @staticmethod
    async def notify_lead_assignment(conversation_id: int, user_email: str, customer_name: str):
        """Create notification when a lead is assigned to a user."""
        from app.modules.auth.repository import AuthRepository
        
        auth_repo = AuthRepository()
        user = await auth_repo.get_user_by_email(user_email)
        
        if user:
            await repository.create_notification(
                user_id=user.id,
                notification_type="lead_assigned",
                title="New Lead Assigned",
                message=f"You have been assigned a new lead: {customer_name}",
                conversation_id=conversation_id
            )
    
    @staticmethod
    async def notify_new_lead(conversation_id: int, customer_name: str):
        """Create notification for all admins when a new lead arrives."""
        from app.modules.auth.repository import AuthRepository
        
        auth_repo = AuthRepository()
        # Get all admin users
        admins = await auth_repo.get_users_by_role("ADMIN")
        
        for admin in admins:
            await repository.create_notification(
                user_id=admin.id,
                notification_type="new_lead",
                title="New Lead Received",
                message=f"New lead from {customer_name}",
                conversation_id=conversation_id
            )
