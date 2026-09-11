"""Candidates API."""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, UploadFile

from app.modules.auth.dependencies import get_current_user
from app.modules.candidates.schemas import (
    AttachmentOut,
    CandidateListResponse,
    CandidateOut,
    CreateCandidateRequest,
    CreateFolderRequest,
    CreateNoteRequest,
    FolderOut,
    NoteOut,
    ResumeUploadResponse,
    ResumeUrlResponse,
    UpdateCandidateRequest,
)
from app.modules.candidates.service import CandidateService

router = APIRouter(prefix="/candidates", tags=["Candidates"])


# Folder routes must be registered before /{candidate_id}
@router.get("/folders", response_model=List[FolderOut])
async def list_folders(current_user=Depends(get_current_user)):
    return await CandidateService.list_folders()


@router.post("/folders", response_model=FolderOut, status_code=201)
async def create_folder(body: CreateFolderRequest, current_user=Depends(get_current_user)):
    return await CandidateService.create_folder(body.name)


@router.get("", response_model=CandidateListResponse)
async def list_candidates(
    search: Optional[str] = None,
    job_id: Optional[str] = None,
    page: int = 1,
    limit: int = 25,
    current_user=Depends(get_current_user),
):
    result = await CandidateService.list_candidates(
        search=search, job_id=job_id, page=page, limit=limit
    )
    return CandidateListResponse(candidates=result["candidates"], total=result["total"])


@router.post("", response_model=CandidateOut, status_code=201)
async def create_candidate(body: CreateCandidateRequest, current_user=Depends(get_current_user)):
    return await CandidateService.create_candidate(body.model_dump())


@router.get("/{candidate_id}", response_model=CandidateOut)
async def get_candidate(candidate_id: str, current_user=Depends(get_current_user)):
    return await CandidateService.get_candidate(candidate_id)


@router.put("/{candidate_id}", response_model=CandidateOut)
async def update_candidate(
    candidate_id: str,
    body: UpdateCandidateRequest,
    current_user=Depends(get_current_user),
):
    return await CandidateService.update_candidate(
        candidate_id, body.model_dump(exclude_none=True)
    )


@router.delete("/{candidate_id}")
async def delete_candidate(candidate_id: str, current_user=Depends(get_current_user)):
    return await CandidateService.delete_candidate(candidate_id)


@router.post("/{candidate_id}/resume", response_model=ResumeUploadResponse)
async def upload_resume(
    candidate_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    content = await file.read()
    return await CandidateService.upload_resume(
        candidate_id, file.filename or "resume", file.content_type or "", content
    )


@router.get("/{candidate_id}/resume-url", response_model=ResumeUrlResponse)
async def resume_url(candidate_id: str, current_user=Depends(get_current_user)):
    return await CandidateService.resume_url(candidate_id)


@router.get("/{candidate_id}/resume")
async def get_resume(candidate_id: str, current_user=Depends(get_current_user)):
    return await CandidateService.stream_resume(candidate_id)


@router.get("/{candidate_id}/notes", response_model=List[NoteOut])
async def list_notes(candidate_id: str, current_user=Depends(get_current_user)):
    return await CandidateService.list_notes(candidate_id)


@router.post("/{candidate_id}/notes", response_model=NoteOut, status_code=201)
async def create_note(
    candidate_id: str,
    body: CreateNoteRequest,
    current_user=Depends(get_current_user),
):
    return await CandidateService.create_note(
        candidate_id, body.content, current_user.id, current_user.name
    )


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str, current_user=Depends(get_current_user)):
    return await CandidateService.delete_note(note_id)


@router.get("/{candidate_id}/attachments", response_model=List[AttachmentOut])
async def list_attachments(candidate_id: str, current_user=Depends(get_current_user)):
    return await CandidateService.list_attachments(candidate_id)


@router.post("/{candidate_id}/attachments", response_model=AttachmentOut, status_code=201)
async def create_attachment(
    candidate_id: str,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    content = await file.read()
    return await CandidateService.create_attachment(
        candidate_id, file.filename or "attachment", file.content_type or "", content
    )


@router.delete("/attachments/{attachment_id}")
async def delete_attachment(attachment_id: str, current_user=Depends(get_current_user)):
    return await CandidateService.delete_attachment(attachment_id)


@router.get("/{candidate_id}/logs")
async def list_logs(candidate_id: str, current_user=Depends(get_current_user)):
    return await CandidateService.list_logs(candidate_id)


@router.post("/{candidate_id}/folders/{folder_id}")
async def add_to_folder(
    candidate_id: str,
    folder_id: str,
    current_user=Depends(get_current_user),
):
    return await CandidateService.add_to_folder(candidate_id, folder_id)


@router.delete("/{candidate_id}/folders/{folder_id}")
async def remove_from_folder(
    candidate_id: str,
    folder_id: str,
    current_user=Depends(get_current_user),
):
    return await CandidateService.remove_from_folder(candidate_id, folder_id)