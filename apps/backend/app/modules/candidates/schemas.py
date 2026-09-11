"""Candidate schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CreateCandidateRequest(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[str] = None
    location: Optional[str] = None
    current_company: Optional[str] = None
    current_position: Optional[str] = None
    experience: Optional[str] = None
    notice_period: Optional[str] = None
    last_working_day: Optional[str] = None
    expected_salary: Optional[dict] = None
    current_salary: Optional[dict] = None
    linkedin_url: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[list] = None
    custom_fields: Optional[dict] = None


class UpdateCandidateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[str] = None
    location: Optional[str] = None
    current_company: Optional[str] = None
    current_position: Optional[str] = None
    experience: Optional[str] = None
    notice_period: Optional[str] = None
    last_working_day: Optional[str] = None
    expected_salary: Optional[dict] = None
    current_salary: Optional[dict] = None
    linkedin_url: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[list] = None
    custom_fields: Optional[dict] = None


class CandidateOut(BaseModel):
    id: str
    reference: Optional[str] = None
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[str] = None
    location: Optional[str] = None
    current_company: Optional[str] = None
    current_position: Optional[str] = None
    experience: Optional[str] = None
    notice_period: Optional[str] = None
    last_working_day: Optional[str] = None
    expected_salary: Optional[dict] = None
    current_salary: Optional[dict] = None
    linkedin_url: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[list] = None
    resume_url: Optional[str] = None
    resume_file_name: Optional[str] = None
    custom_fields: Optional[dict] = None
    applications_count: int = 0
    created_at: datetime
    updated_at: datetime


class CandidateListResponse(BaseModel):
    candidates: List[CandidateOut]
    total: int


class CreateNoteRequest(BaseModel):
    content: str


class NoteOut(BaseModel):
    id: str
    content: str
    author_id: Optional[int] = None
    author_name: Optional[str] = None
    created_at: datetime


class AttachmentOut(BaseModel):
    id: str
    file_url: str
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    signed_url: Optional[str] = None
    created_at: datetime


class ResumeUploadResponse(BaseModel):
    resume_url: str
    resume_file_name: str
    download_url: str


class ResumeUrlResponse(BaseModel):
    url: str


class CreateFolderRequest(BaseModel):
    name: str


class FolderOut(BaseModel):
    id: str
    name: str
    candidate_count: int = 0
    created_at: datetime