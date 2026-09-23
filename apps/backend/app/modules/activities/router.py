"""Activities API."""
from typing import Optional

from fastapi import APIRouter, Depends

from app.modules.activities.schemas import (
    ActivityListResponse,
    ActivityOut,
    CreateActivityRequest,
    UpdateActivityRequest,
)
from app.modules.activities.service import ActivityService
from app.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.get("", response_model=ActivityListResponse)
async def list_activities(
    job_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    assignee_id: Optional[int] = None,
    is_done: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
    current_user=Depends(get_current_user),
):
    result = await ActivityService.list_activities(
        job_id=job_id,
        candidate_id=candidate_id,
        assignee_id=assignee_id,
        is_done=is_done,
        page=page,
        page_size=page_size,
    )
    return ActivityListResponse(activities=result["activities"], total=result["total"])


@router.post("", response_model=ActivityOut, status_code=201)
async def create_activity(body: CreateActivityRequest, current_user=Depends(get_current_user)):
    return await ActivityService.create(body.model_dump())


@router.get("/{activity_id}", response_model=ActivityOut)
async def get_activity(activity_id: str, current_user=Depends(get_current_user)):
    return await ActivityService.get(activity_id)


@router.put("/{activity_id}", response_model=ActivityOut)
async def update_activity(
    activity_id: str,
    body: UpdateActivityRequest,
    current_user=Depends(get_current_user),
):
    return await ActivityService.update(activity_id, body.model_dump(exclude_none=True))


@router.delete("/{activity_id}")
async def delete_activity(activity_id: str, current_user=Depends(get_current_user)):
    return await ActivityService.delete(activity_id)