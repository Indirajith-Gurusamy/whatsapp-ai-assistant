"""Notification repository for database operations."""
from typing import List, Dict, Any
from datetime import datetime
from app.db.base import BaseRepository


class NotificationRepository(BaseRepository):
    """Repository for notification-related database operations."""
    
    def __init__(self):
        super().__init__("notification")
    
    async def create_notification(
        self,
        user_id: int,
        notification_type: str,
        title: str,
        message: str,
        conversation_id: int = None
    ) -> int:
        """Create a new notification."""
        db = await self.get_db()
        
        notification = await db.notification.create(
            data={
                "userId": user_id,
                "type": notification_type,
                "title": title,
                "message": message,
                "conversationId": conversation_id,
                "createdAt": datetime.now()
            }
        )
        
        return notification.id
    
    async def get_user_notifications(
        self,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        """Get notifications for a user."""
        db = await self.get_db()
        
        where_clause = {"userId": user_id}
        if unread_only:
            where_clause["isRead"] = False
        
        notifications = await db.notification.find_many(
            where=where_clause,
            order={"createdAt": "desc"},
            take=limit
        )
        
        return [
            {
                "id": notif.id,
                "type": notif.type,
                "title": notif.title,
                "message": notif.message,
                "conversation_id": notif.conversationId,
                "is_read": notif.isRead,
                "created_at": notif.createdAt.isoformat(),
                "read_at": notif.readAt.isoformat() if notif.readAt else None
            }
            for notif in notifications
        ]
    
    async def mark_as_read(self, notification_id: int, user_id: int):
        """Mark a notification as read."""
        db = await self.get_db()
        
        await db.notification.update(
            where={"id": notification_id},
            data={
                "isRead": True,
                "readAt": datetime.now()
            }
        )
    
    async def mark_all_as_read(self, user_id: int):
        """Mark all notifications as read for a user."""
        db = await self.get_db()
        
        await db.notification.update_many(
            where={
                "userId": user_id,
                "isRead": False
            },
            data={
                "isRead": True,
                "readAt": datetime.now()
            }
        )
    
    async def get_unread_count(self, user_id: int) -> int:
        """Get count of unread notifications."""
        db = await self.get_db()
        
        count = await db.notification.count(
            where={
                "userId": user_id,
                "isRead": False
            }
        )
        
        return count
