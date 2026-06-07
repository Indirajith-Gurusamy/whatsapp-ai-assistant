"""In-app assistant API — uses the active AI provider from settings."""
import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.ai.schemas import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantExecuteRequest,
)
from app.modules.ai.service import AIService
from app.modules.ai.assistant_tools import AssistantActionExecutor, action_valid
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
            current_user=current_user,
        )
        return AssistantChatResponse(**result)
    except Exception as e:
        logger.warning(f"[Assistant] Chat failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e


@router.post("/execute")
async def assistant_execute(
    body: AssistantExecuteRequest,
    current_user=Depends(get_current_user),
):
    """Execute a Vivafy action (navigation, CRM ops, admin tasks)."""
    action_dict = body.action.model_dump(exclude_none=True)
    if not action_valid(action_dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or incomplete action",
        )
    result = await AssistantActionExecutor.execute(action_dict, current_user)
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Action failed"),
        )
    return result
