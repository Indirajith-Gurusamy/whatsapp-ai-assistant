"""Conversation API router matching old API paths."""
from fastapi import APIRouter, HTTPException
from typing import Dict
from app.modules.conversations.service import ConversationService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["conversations"])


@router.get("/messages")
async def get_messages(limit: int = 50):
    """Get recent messages."""
    messages = await ConversationService.get_messages(limit)
    return messages


@router.get("/responses")
async def get_responses(limit: int = 50):
    """Get recent responses."""
    responses = await ConversationService.get_responses(limit)
    return responses


@router.get("/conversations")
async def get_conversations(limit: int = 50):
    """Get conversations."""
    conversations = await ConversationService.get_conversations(limit)
    return conversations


@router.get("/conversation/{message_id}")
async def get_conversation_detail(message_id: int):
    """Get conversation detail (OLD API path - singular 'conversation')."""
    detail = await ConversationService.get_detail(message_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return detail


@router.post("/conversation/{message_id}/status")
async def update_conversation_status(message_id: int, data: Dict):
    """Update conversation status (OLD API path - singular 'conversation')."""
    status = data.get("status")
    comments = data.get("comments")
    
    if not status:
        raise HTTPException(status_code=400, detail="Status required")
    
    await ConversationService.update_status(message_id, status, comments)
    logger.info(f"Updated conversation {message_id} status to {status}")
    
    return {"success": True, "message_id": message_id, "status": status, "comments": comments}


@router.get("/customers")
async def get_customers(limit: int = 50):
    """Get customers (OLD API path - direct under /api)."""
    customers = await ConversationService.get_customers(limit)
    return customers


@router.get("/customers/{phone}/history")
async def get_customer_history(phone: str):
    """Get customer history."""
    history = await ConversationService.get_customer_history(phone)
    return history


@router.post("/customer/{customer_id}")
async def update_customer(customer_id: int, data: Dict):
    """Update customer information (OLD API path - singular 'customer')."""
    name = data.get("name")
    status = data.get("status")
    comments = data.get("comments")
    
    # Update conversation status (customer_id is actually conversation_id)
    if status:
        await ConversationService.update_status(customer_id, status, comments)
    
    logger.info(f"Updated customer {customer_id}")
    return {"success": True, "customer_id": customer_id}
