"""Configurable/custom recruitment field definitions API (admin)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.modules.auth.dependencies import get_current_user, require_role
from app.modules.recruitment_fields.schemas import (
    DeleteFieldResponse,
    FieldDefCreate,
    FieldDefOut,
    FieldDefUpdate,
    FieldListResponse,
    ReorderRequest,
)
from app.modules.recruitment_fields.service import RecruitmentFieldsService

router = APIRouter(prefix="/recruitment-fields", tags=["Recruitment Fields"])


@router.get("", response_model=FieldListResponse)
async def list_field_definitions(
    entity: Optional[str] = Query(None),
    include_deleted: bool = Query(False),
    current_user=Depends(get_current_user),
):
    """List field definitions (any logged-in user)."""
    result = await RecruitmentFieldsService.list_fields(
        entity=entity, include_deleted=include_deleted
    )
    return FieldListResponse(fields=result["fields"], total=result["total"])


@router.post("", response_model=FieldDefOut, status_code=201)
async def create_field_definition(
    body: FieldDefCreate,
    current_user=Depends(require_role(['ADMIN', 'HR'])),
):
    return await RecruitmentFieldsService.create_field(body.model_dump())


@router.put("/{field_id}", response_model=FieldDefOut)
async def update_field_definition(
    field_id: str,
    body: FieldDefUpdate,
    current_user=Depends(require_role(['ADMIN', 'HR'])),
):
    return await RecruitmentFieldsService.update_field(
        field_id, body.model_dump(exclude_none=True)
    )


@router.post("/reorder", response_model=dict)
async def reorder_field_definitions(
    body: ReorderRequest,
    current_user=Depends(require_role(['ADMIN', 'HR'])),
):
    return await RecruitmentFieldsService.reorder(body.entity, body.codes)


@router.delete("/{field_id}", response_model=DeleteFieldResponse)
async def delete_field_definition(
    field_id: str,
    current_user=Depends(require_role(['ADMIN', 'HR'])),
):
    """Soft-delete a field definition (any field incl. built-ins)."""
    return await RecruitmentFieldsService.soft_delete_field(field_id)


@router.post("/{field_id}/restore", response_model=FieldDefOut)
async def restore_field_definition(
    field_id: str,
    current_user=Depends(require_role(['ADMIN', 'HR'])),
):
    return await RecruitmentFieldsService.restore_field(field_id)