"""In-app assistant API — uses the active AI provider from settings."""
import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.ai.schemas import AssistantChatRequest, AssistantChatResponse
from app.modules.ai.service import AIService
from app.modules.auth.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistant", tags=["Assistant"])


@router.post("/chat", response_model=AssistantChatResponse)
async def assistant_chat(
    body: AssistantChatRequest,
    current_user=Depends(get_current_user),
):
    """Answer questions about using the CRM dashboard (active AI provider)."""
    history = [{"role": m.role, "content": m.content} for m in body.history]
    try:
        result = await AIService.chat_assistant(
            message=body.message,
            history=history,
            user_role=current_user.role,
            pathname=body.pathname,
        )
        return AssistantChatResponse(**result)
    except Exception as e:
        logger.warning(f"[Assistant] Chat failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e
