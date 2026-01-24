"""Notification API router."""
from fastapi import APIRouter, Depends
from typing import List, Dict
from app.modules.notifications.service import NotificationService
from app.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("")
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user = Depends(get_current_user)
) -> List[Dict]:
    """Get notifications for current user."""
    notifications = await NotificationService.get_user_notifications(
        current_user.id,
        unread_only,
        limit
    )
    return notifications


@router.get("/unread-count")
async def get_unread_count(
    current_user = Depends(get_current_user)
) -> Dict:
    """Get unread notification count."""
    count = await NotificationService.get_unread_count(current_user.id)
    return {"unread_count": count}


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user = Depends(get_current_user)
):
    """Mark a notification as read."""
    await NotificationService.mark_as_read(notification_id, current_user.id)
    return {"success": True}


@router.put("/mark-all-read")
async def mark_all_read(
    current_user = Depends(get_current_user)
):
    """Mark all notifications as read."""
    await NotificationService.mark_all_as_read(current_user.id)
    return {"success": True}
