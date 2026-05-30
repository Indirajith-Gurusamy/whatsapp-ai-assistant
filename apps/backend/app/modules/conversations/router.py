"""Conversation API router matching old API paths."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Optional
from app.modules.conversations.service import ConversationService
from app.modules.whatsapp.sender import WhatsAppService
from app.modules.auth.dependencies import get_current_user, get_db
from app.core.constants import MESSAGE_ROLE_AGENT, MESSAGE_STATUS_SENT, MESSAGE_STATUS_FAILED
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["conversations"])


@router.get("/messages")
async def get_messages(
    limit: int = 50,
    current_user = Depends(get_current_user)
):
    """Get recent messages."""
    messages = await ConversationService.get_messages(limit, current_user)
    return messages


@router.get("/responses")
async def get_responses(
    limit: int = 50,
    current_user = Depends(get_current_user)
):
    """Get recent responses."""
    responses = await ConversationService.get_responses(limit, current_user)
    return responses


@router.get("/conversations")
async def get_conversations(
    limit: int = 50,
    current_user = Depends(get_current_user)
):
    """Get conversations."""
    conversations = await ConversationService.get_conversations(limit, current_user)
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


@router.put("/conversation/{message_id}/assign")
async def assign_lead(
    message_id: int, 
    data: Dict,
    current_user = Depends(get_current_user)
):
    """Assign lead to user."""
    # Only admin can assign leads
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to assign leads")
        
    user_email = data.get("user_email")
    if not user_email:
        raise HTTPException(status_code=400, detail="User email required")
    
    await ConversationService.assign_lead(message_id, user_email)
    logger.info(f"Assigned conversation {message_id} to {user_email}")
    
    return {"success": True, "message_id": message_id, "assigned_to": user_email}


@router.get("/customers")
async def get_customers(limit: int = 50):
    """Get customers (OLD API path - direct under /api)."""
    customers = await ConversationService.get_customers(limit)
    return customers


@router.get("/customers/by-uuid/{uuid}")
async def get_customer_by_uuid(uuid: str):
    """Get customer details by UUID."""
    customer = await ConversationService.get_customer_by_uuid(uuid)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.get("/customers/by-uuid/{uuid}/history")
async def get_customer_history_by_uuid(uuid: str):
    """Get customer history by UUID."""
    history = await ConversationService.get_customer_history_by_uuid(uuid)
    return history


@router.get("/customers/{phone}/history")
async def get_customer_history(phone: str):
    """Get customer history."""
    history = await ConversationService.get_customer_history(phone)
    return history


@router.get("/conversation/by-uuid/{uuid}")
async def get_conversation_detail_by_uuid(uuid: str):
    """Get conversation detail by UUID."""
    detail = await ConversationService.get_detail_by_uuid(uuid)
    if not detail:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return detail


@router.post("/conversation/by-uuid/{uuid}/status")
async def update_conversation_status_by_uuid(uuid: str, data: Dict):
    """Update conversation status by UUID."""
    status = data.get("status")
    comments = data.get("comments")
    
    if not status:
        raise HTTPException(status_code=400, detail="Status required")
    
    success = await ConversationService.update_status_by_uuid(uuid, status, comments)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {"success": True, "uuid": uuid, "status": status, "comments": comments}


@router.put("/conversation/by-uuid/{uuid}/assign")
async def assign_lead_by_uuid(
    uuid: str,
    data: Dict,
    current_user = Depends(get_current_user)
):
    """Assign lead to user by UUID."""
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized to assign leads")
    
    user_email = data.get("user_email")
    if not user_email:
        raise HTTPException(status_code=400, detail="User email required")
    
    await ConversationService.assign_lead_by_uuid(uuid, user_email)
    
    return {"success": True, "uuid": uuid, "assigned_to": user_email}


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


@router.put("/conversation/by-uuid/{uuid}/ai-toggle")
async def toggle_ai(
    uuid: str,
    data: Dict,
    current_user=Depends(get_current_user)
):
    """Toggle AI on/off for a conversation."""
    enabled = data.get("enabled")
    if enabled is None:
        raise HTTPException(status_code=400, detail="'enabled' field required")
    
    result = await ConversationService.toggle_ai_by_uuid(uuid, bool(enabled))
    if result is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    logger.info(f"AI {'enabled' if result else 'disabled'} for conversation {uuid} by {current_user.email}")
    return {"success": True, "uuid": uuid, "ai_enabled": result}


@router.post("/conversation/by-uuid/{uuid}/send-message")
async def send_agent_message(
    uuid: str,
    data: Dict,
    current_user=Depends(get_current_user)
):
    """Send a message as a human agent to the customer."""
    message_text = data.get("message", "").strip()
    if not message_text:
        raise HTTPException(status_code=400, detail="Message text required")
    
    conversation = await ConversationService.get_conversation_by_uuid(uuid)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    phone = conversation.customer.phone
    # Use the number that last received a message for this conversation
    last_received_on = getattr(conversation, 'lastReceivedOn', None)
    
    # Send via WhatsApp using the correct number
    send_success = await WhatsAppService.send_message(
        phone, 
        message_text,
        incoming_to_number=last_received_on
    )
    
    # Save as agent message
    status = MESSAGE_STATUS_SENT if send_success else MESSAGE_STATUS_FAILED
    message_id = await ConversationService.save_message(
        phone=phone,
        message=message_text,
        name=current_user.name,
        whatsapp_id=None,
        conversation_id=conversation.id,
        role=MESSAGE_ROLE_AGENT,
        status=status
    )
    
    if not send_success:
        raise HTTPException(status_code=502, detail="Failed to send WhatsApp message")
    
    logger.info(f"Agent {current_user.email} sent message to {phone} in conversation {uuid}")
    return {"success": True, "message_id": message_id}
