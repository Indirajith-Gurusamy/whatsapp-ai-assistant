"""Application (Match) schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CreateApplicationRequest(BaseModel):
    candidate_id: str
    job_id: str
    stage_id: Optional[str] = None
    match_score: Optional[float] = None
    source: Optional[str] = None
    answers: Optional[dict] = None


class UpdateApplicationRequest(BaseModel):
    stage_id: Optional[str] = None
    match_score: Optional[float] = None
    is_active: Optional[bool] = None
    source: Optional[str] = None
    answers: Optional[dict] = None


class ApplicationOut(BaseModel):
    id: str
    candidate_id: str
    candidate_name: Optional[str] = None
    candidate_reference: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    job_id: str
    job_title: Optional[str] = None
    organization_name: Optional[str] = None
    stage_id: Optional[str] = None
    stage_name: Optional[str] = None
    is_active: bool
    match_score: Optional[float] = None
    source: Optional[str] = None
    answers: Optional[dict] = None
    has_resume: bool = False
    resume_file_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ApplicationListResponse(BaseModel):
    applications: List[ApplicationOut]
    total: int