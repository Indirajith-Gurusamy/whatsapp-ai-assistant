"""Conversation API router matching old API paths."""
import json

from fastapi import APIRouter, HTTPException, Depends
from starlette.responses import StreamingResponse
from typing import Dict, Optional
from app.modules.conversations.service import ConversationService
from app.modules.conversations.events import get_customer_event_hub
from app.modules.conversations.access import (
    require_admin,
    require_conversation_by_id,
    require_conversation_by_uuid,
)
from app.modules.whatsapp.sender import WhatsAppService
from app.modules.ai.service import AIService
from app.modules.auth.dependencies import get_current_user, get_db
from app.db.prisma.enums import Channel
from app.core.constants import MESSAGE_ROLE_AGENT, MESSAGE_STATUS_SENT, MESSAGE_STATUS_FAILED
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["conversations"])


@router.get("/messages")
async def get_messages(
    limit: int = 50,
    channel: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Get recent messages."""
    messages = await ConversationService.get_messages(limit, current_user, channel)
    return messages


@router.post("/messages/{message_id}/mark-read")
async def mark_email_message_read(message_id: int, current_user=Depends(get_current_user)):
    """Mark the Gmail message as read when opened in the CRM."""
    from app.modules.email.service import mark_crm_message_read_in_gmail

    db = await get_db()
    msg = await db.message.find_unique(
        where={"id": message_id},
        include={"conversation": True},
    )
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.channel != Channel.EMAIL:
        raise HTTPException(status_code=400, detail="Not an email message")
    if current_user.role != "ADMIN":
        assignee = msg.conversation.assignedTo
        if not assignee or assignee != current_user.email:
            raise HTTPException(status_code=403, detail="Not authorized to mark this message")

    result = await mark_crm_message_read_in_gmail(message_id)
    if result.get("reason") == "not_found":
        raise HTTPException(status_code=404, detail="Message not found")
    return result


@router.get("/responses")
async def get_responses(
    limit: int = 50,
    channel: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Get recent responses."""
    responses = await ConversationService.get_responses(limit, current_user, channel)
    return responses


@router.get("/conversations")
async def get_conversations(
    limit: int = 50,
    channel: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """Get conversations."""
    conversations = await ConversationService.get_conversations(limit, current_user, channel)
    return conversations


@router.get("/conversation/{message_id}")
async def get_conversation_detail(message_id: int, current_user=Depends(get_current_user)):
    """Get conversation detail (OLD API path - singular 'conversation')."""
    await require_conversation_by_id(message_id, current_user)
    detail = await ConversationService.get_detail(message_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return detail


@router.post("/conversation/{message_id}/status")
async def update_conversation_status(
    message_id: int, data: Dict, current_user=Depends(get_current_user)
):
    """Update conversation status (OLD API path - singular 'conversation')."""
    status = data.get("status")
    comments = data.get("comments")
    
    if not status:
        raise HTTPException(status_code=400, detail="Status required")

    await require_conversation_by_id(message_id, current_user)
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
async def get_customers(
    limit: int = 50,
    channel: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """Get customers (OLD API path - direct under /api)."""
    require_admin(current_user)
    customers = await ConversationService.get_customers(limit, channel)
    return customers


@router.get("/customers/by-uuid/{uuid}")
async def get_customer_by_uuid(uuid: str, current_user=Depends(get_current_user)):
    """Get customer details by UUID."""
    require_admin(current_user)
    customer = await ConversationService.get_customer_by_uuid(uuid)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.get("/customers/by-uuid/{uuid}/history")
async def get_customer_history_by_uuid(uuid: str, current_user=Depends(get_current_user)):
    """Get customer history by UUID."""
    require_admin(current_user)
    history = await ConversationService.get_customer_history_by_uuid(uuid)
    return history


@router.get("/customers/by-uuid/{uuid}/events")
async def stream_customer_events(uuid: str, current_user=Depends(get_current_user)):
    """SSE stream — notifies when this customer's conversation history changes."""
    require_admin(current_user)
    customer = await ConversationService.get_customer_by_uuid(uuid)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    async def event_generator():
        async for event in get_customer_event_hub().subscribe(uuid):
            if event.get("type") == "heartbeat":
                yield ": heartbeat\n\n"
            else:
                yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/customers/{phone}/history")
async def get_customer_history(phone: str, current_user=Depends(get_current_user)):
    """Get customer history."""
    require_admin(current_user)
    history = await ConversationService.get_customer_history(phone)
    return history


@router.get("/conversation/by-uuid/{uuid}")
async def get_conversation_detail_by_uuid(uuid: str, current_user=Depends(get_current_user)):
    """Get conversation detail by UUID."""
    await require_conversation_by_uuid(uuid, current_user)
    detail = await ConversationService.get_detail_by_uuid(uuid)
    if not detail:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return detail


@router.post("/conversation/by-uuid/{uuid}/status")
async def update_conversation_status_by_uuid(
    uuid: str, data: Dict, current_user=Depends(get_current_user)
):
    """Update conversation status by UUID."""
    status = data.get("status")
    comments = data.get("comments")
    
    if not status:
        raise HTTPException(status_code=400, detail="Status required")

    await require_conversation_by_uuid(uuid, current_user)
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
async def update_customer(
    customer_id: int, data: Dict, current_user=Depends(get_current_user)
):
    """Update customer information (OLD API path - singular 'customer')."""
    name = data.get("name")
    status = data.get("status")
    comments = data.get("comments")
    
    await require_conversation_by_id(customer_id, current_user)
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

    await require_conversation_by_uuid(uuid, current_user)
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
    
    conversation = await require_conversation_by_uuid(uuid, current_user)

    if conversation.channel == Channel.EMAIL:
        raise HTTPException(
            status_code=400,
            detail="Email conversations cannot be replied to via WhatsApp from this endpoint",
        )

    phone = conversation.customer.phone
    if not phone:
        raise HTTPException(status_code=400, detail="Customer phone number not available")
    # Use the number that last received a message for this conversation
    last_received_on = getattr(conversation, 'lastReceivedOn', None)
    
    # Send via WhatsApp using the correct number
    send_success, provider_id = await WhatsAppService.send_message(
        phone, 
        message_text,
        incoming_to_number=last_received_on
    )
    
    # Save as agent message
    status = MESSAGE_STATUS_SENT if send_success else MESSAGE_STATUS_FAILED
    message_id, _ = await ConversationService.save_message(
        phone=phone,
        message=message_text,
        name=current_user.name,
        whatsapp_id=provider_id,
        conversation_id=conversation.id,
        role=MESSAGE_ROLE_AGENT,
        status=status,
    )
    
    if not send_success:
        raise HTTPException(status_code=502, detail="Failed to send WhatsApp message")
    
    logger.info(f"Agent {current_user.email} sent message to {phone} in conversation {uuid}")
    return {"success": True, "message_id": message_id}


@router.post("/conversation/by-uuid/{uuid}/suggest-reply")
async def suggest_reply(uuid: str, current_user=Depends(get_current_user)):
    """AI-draft next agent message from conversation history."""
    conversation = await require_conversation_by_uuid(uuid, current_user)
    try:
        suggestion = await AIService.suggest_agent_reply(conversation.id)
        return {"suggestion": suggestion.strip()}
    except Exception as e:
        logger.warning(f"Suggest reply failed: {e}")
        raise HTTPException(status_code=503, detail=str(e)) from e


@router.post("/customers")
async def create_customer(data: Dict, current_user=Depends(get_current_user)):
    """Create a CRM customer manually. Admin only."""
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    phone = (data.get("phone") or "").strip()
    name = data.get("name")
    if not phone:
        raise HTTPException(status_code=400, detail="phone required")
    try:
        return await ConversationService.create_customer(phone, name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/customers/by-uuid/{uuid}")
async def delete_customer(uuid: str, current_user=Depends(get_current_user)):
    """Delete a customer. Admin only."""
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    ok = await ConversationService.delete_customer_by_uuid(uuid)
    if not ok:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"success": True, "deleted_uuid": uuid}


@router.post("/customers/bulk-delete")
async def bulk_delete_customers(data: Dict, current_user=Depends(get_current_user)):
    """Bulk delete customers by UUID. Admin only."""
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    uuids = data.get("customer_uuids") or data.get("uuids") or []
    if not isinstance(uuids, list) or not uuids:
        raise HTTPException(status_code=400, detail="customer_uuids list required")
    return await ConversationService.bulk_delete_customers(uuids)
