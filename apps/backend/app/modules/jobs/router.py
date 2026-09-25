"""Jobs API."""
from typing import Optional

from fastapi import APIRouter, Depends

from app.modules.auth.dependencies import (
    get_current_user,
    require_role,
)
from app.modules.jobs.schemas import (
    BulkArchiveRequest,
    BulkPublishRequest,
    BulkPublishResponse,
    CreateJobRequest,
    CreateStageRequest,
    JobListResponse,
    JobOut,
    PipelineOut,
    PipelineStageOut,
    PublishJobRequest,
    UpdateJobRequest,
)
from app.modules.jobs.service import JobService

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("", response_model=JobListResponse)
async def list_jobs(
    search: Optional[str] = None,
    status: Optional[str] = None,
    organization_id: Optional[int] = None,
    current_user=Depends(get_current_user),
):
    result = await JobService.list_jobs(
        search=search, status=status, organization_id=organization_id
    )
    return JobListResponse(jobs=result["jobs"], total=result["total"])


@router.get("/pipeline/default", response_model=PipelineOut)
async def get_default_pipeline(current_user=Depends(get_current_user)):
    return await JobService.get_default_pipeline()


@router.post("", response_model=JobOut, status_code=201)
async def create_job(body: CreateJobRequest, current_user=Depends(get_current_user)):
    return await JobService.create_job(body.model_dump())


@router.post("/bulk-publish", response_model=BulkPublishResponse)
async def bulk_publish(
    body: BulkPublishRequest,
    current_user=Depends(require_role(["ADMIN", "HR"])),
):
    return await JobService.bulk_set_published(body.job_ids, body.is_published)


@router.post("/bulk-archive", response_model=BulkPublishResponse)
async def bulk_archive(
    body: BulkArchiveRequest,
    current_user=Depends(require_role(["ADMIN", "HR"])),
):
    return await JobService.bulk_archive(body.job_ids)


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str, current_user=Depends(get_current_user)):
    return await JobService.get_job(job_id)


@router.put("/{job_id}", response_model=JobOut)
async def update_job(
    job_id: str,
    body: UpdateJobRequest,
    current_user=Depends(get_current_user),
):
    return await JobService.update_job(job_id, body.model_dump(exclude_none=True))


@router.delete("/{job_id}")
async def delete_job(job_id: str, current_user=Depends(get_current_user)):
    return await JobService.delete_job(job_id)


@router.post("/{job_id}/publish", response_model=JobOut)
async def set_published(
    job_id: str,
    body: PublishJobRequest,
    current_user=Depends(get_current_user),
):
    return await JobService.set_published(job_id, body.is_published)


@router.get("/{job_id}/pipeline", response_model=PipelineOut)
async def get_pipeline(job_id: str, current_user=Depends(get_current_user)):
    return await JobService.get_pipeline(job_id)


@router.post("/{job_id}/pipeline/stages", response_model=PipelineStageOut, status_code=201)
async def add_stage(
    job_id: str,
    body: CreateStageRequest,
    current_user=Depends(get_current_user),
):
    return await JobService.add_stage(job_id, body.name)


@router.delete("/{job_id}/pipeline/stages/{stage_id}")
async def remove_stage(
    job_id: str,
    stage_id: str,
    current_user=Depends(get_current_user),
):
    return await JobService.remove_stage(job_id, stage_id)