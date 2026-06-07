from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from app.core.db_errors import raise_if_table_missing
from app.modules.auth.dependencies import get_current_user, get_current_admin_user
from app.modules.quick_replies.schemas import QuickReplyCreate, QuickReplyOut, QuickReplyUpdate
from app.modules.quick_replies.service import QuickReplyService

router = APIRouter(prefix="/quick-replies", tags=["Quick Replies"])


@router.get("", response_model=List[QuickReplyOut])
async def list_quick_replies(current_user=Depends(get_current_user)):
    """Active canned responses for chat composer."""
    try:
        return await QuickReplyService.list_active()
    except Exception as e:
        raise_if_table_missing(e)
        raise


@router.get("/manage", response_model=List[QuickReplyOut])
async def list_all_quick_replies(_admin=Depends(get_current_admin_user)):
    try:
        return await QuickReplyService.list_all()
    except Exception as e:
        raise_if_table_missing(e)
        raise


@router.post("", response_model=QuickReplyOut)
async def create_quick_reply(body: QuickReplyCreate, _admin=Depends(get_current_admin_user)):
    return await QuickReplyService.create(body.model_dump())


@router.patch("/{uuid}", response_model=QuickReplyOut)
async def update_quick_reply(
    uuid: str, body: QuickReplyUpdate, _admin=Depends(get_current_admin_user)
):
    result = await QuickReplyService.update(uuid, body.model_dump(exclude_unset=True))
    if not result:
        raise HTTPException(status_code=404, detail="Quick reply not found")
    return result


@router.delete("/{uuid}")
async def delete_quick_reply(uuid: str, _admin=Depends(get_current_admin_user)):
    if not await QuickReplyService.delete(uuid):
        raise HTTPException(status_code=404, detail="Quick reply not found")
    return {"success": True}
