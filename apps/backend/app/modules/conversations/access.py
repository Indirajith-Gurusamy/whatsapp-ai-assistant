"""Authorization helpers for conversation and customer API routes."""
from typing import Any

from fastapi import HTTPException

from app.db.client import get_db


def is_admin(user: Any) -> bool:
    return getattr(user, "role", None) == "ADMIN"


def require_admin(user: Any) -> None:
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")


def require_conversation_access(conversation: Any, user: Any) -> None:
    """Allow admins or the conversation assignee only."""
    if is_admin(user):
        return
    assignee = getattr(conversation, "assignedTo", None)
    if not assignee or assignee != user.email:
        raise HTTPException(status_code=403, detail="Not authorized for this conversation")


async def require_conversation_by_id(conversation_id: int, user: Any) -> Any:
    db = await get_db()
    conversation = await db.conversation.find_unique(
        where={"id": conversation_id},
        include={"customer": True},
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    require_conversation_access(conversation, user)
    return conversation


async def require_conversation_by_uuid(uuid: str, user: Any) -> Any:
    from app.modules.conversations.service import ConversationService

    conversation = await ConversationService.get_conversation_by_uuid(uuid)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    require_conversation_access(conversation, user)
    return conversation
