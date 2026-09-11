"""Activity (interview) schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CreateActivityRequest(BaseModel):
    title: str
    activity_type: str = "interview"
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    candidate_id: Optional[str] = None
    job_id: Optional[str] = None
    due_date: Optional[datetime] = None
    is_done: bool = False


class UpdateActivityRequest(BaseModel):
    title: Optional[str] = None
    activity_type: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    candidate_id: Optional[str] = None
    job_id: Optional[str] = None
    due_date: Optional[datetime] = None
    is_done: Optional[bool] = None


class ActivityOut(BaseModel):
    id: str
    title: str
    activity_type: str
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    assignee_name: Optional[str] = None
    candidate_id: Optional[str] = None
    candidate_name: Optional[str] = None
    job_id: Optional[str] = None
    job_title: Optional[str] = None
    due_date: Optional[datetime] = None
    is_done: bool
    created_at: datetime
    updated_at: datetime


class ActivityListResponse(BaseModel):
    activities: List[ActivityOut]
    total: int