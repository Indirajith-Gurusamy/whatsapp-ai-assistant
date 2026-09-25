"""Job schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CreateJobRequest(BaseModel):
    title: str
    organization_id: Optional[int] = None
    description: Optional[str] = None
    location: Optional[str] = None
    is_remote: bool = False
    contract_type: Optional[str] = None
    experience: Optional[str] = None
    salary_currency: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_frequency: Optional[str] = None
    salary_negotiable: bool = False
    headcount: int = 1
    tags: Optional[list] = None
    custom_fields: Optional[dict] = None
    status: str = "DRAFT"
    is_published: bool = False


class UpdateJobRequest(BaseModel):
    title: Optional[str] = None
    organization_id: Optional[int] = None
    description: Optional[str] = None
    location: Optional[str] = None
    is_remote: Optional[bool] = None
    contract_type: Optional[str] = None
    experience: Optional[str] = None
    salary_currency: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_frequency: Optional[str] = None
    salary_negotiable: Optional[bool] = None
    headcount: Optional[int] = None
    tags: Optional[list] = None
    custom_fields: Optional[dict] = None
    status: Optional[str] = None


class JobOut(BaseModel):
    id: str
    organization_id: Optional[int] = None
    organization_name: Optional[str] = None
    title: str
    slug: str
    description: Optional[str] = None
    location: Optional[str] = None
    is_remote: bool
    contract_type: Optional[str] = None
    experience: Optional[str] = None
    salary_currency: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_frequency: Optional[str] = None
    salary_negotiable: bool
    headcount: int
    tags: Optional[list] = None
    custom_fields: Optional[dict] = None
    status: str
    is_published: bool
    career_page_url: Optional[str] = None
    candidates_count: int = 0
    created_at: datetime
    updated_at: datetime


class JobListResponse(BaseModel):
    jobs: List[JobOut]
    total: int


class PublishJobRequest(BaseModel):
    is_published: bool


class BulkPublishRequest(BaseModel):
    job_ids: List[str]
    is_published: bool


class BulkArchiveRequest(BaseModel):
    job_ids: List[str]


class BulkPublishResponse(BaseModel):
    updated: int
    total: int


class CreateStageRequest(BaseModel):
    name: str


class PipelineStageOut(BaseModel):
    id: str
    name: str
    rank: int
    is_final: bool
    candidates_count: int = 0


class PipelineOut(BaseModel):
    pipeline_id: str
    pipeline_name: str
    stages: List[PipelineStageOut]


class StageCreateOut(BaseModel):
    id: str
    name: str
    rank: int
    is_final: bool