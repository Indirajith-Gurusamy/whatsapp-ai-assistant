"""Applications API."""
from typing import Optional

from fastapi import APIRouter, Depends

from app.modules.applications.schemas import (
    AiScreenResponse,
    ApplicationListResponse,
    ApplicationOut,
    CreateApplicationRequest,
    UpdateApplicationRequest,
)
from app.modules.applications.service import ApplicationService
from app.modules.auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.get("/jobs/{job_id}", response_model=ApplicationListResponse)
async def list_by_job(job_id: str, current_user=Depends(get_current_user)):
    return await ApplicationService.list_by_job(job_id)


@router.get("/candidates/{candidate_id}", response_model=ApplicationListResponse)
async def list_by_candidate(candidate_id: str, current_user=Depends(get_current_user)):
    return await ApplicationService.list_by_candidate(candidate_id)


@router.get("/export")
async def export_applications(
    job_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    return await ApplicationService.export_csv(job_id=job_id, candidate_id=candidate_id)


@router.post("", response_model=ApplicationOut, status_code=201)
async def create_application(
    body: CreateApplicationRequest,
    current_user=Depends(get_current_user),
):
    return await ApplicationService.create(body.model_dump())


@router.get("/{application_id}", response_model=ApplicationOut)
async def get_application(application_id: str, current_user=Depends(get_current_user)):
    return await ApplicationService.get(application_id)


@router.post("/{application_id}/ai-screen", response_model=AiScreenResponse)
async def ai_screen_application(
    application_id: str,
    current_user=Depends(require_role(["ADMIN", "HR"])),
):
    return await ApplicationService.screen(application_id)


@router.get("/{application_id}/resume")
async def get_application_resume(application_id: str, current_user=Depends(get_current_user)):
    return await ApplicationService.stream_resume(application_id)


@router.put("/{application_id}", response_model=ApplicationOut)
async def update_application(
    application_id: str,
    body: UpdateApplicationRequest,
    current_user=Depends(get_current_user),
):
    return await ApplicationService.update(
        application_id, body.model_dump(exclude_none=True)
    )


@router.delete("/{application_id}")
async def delete_application(application_id: str, current_user=Depends(get_current_user)):
    return await ApplicationService.delete(application_id)