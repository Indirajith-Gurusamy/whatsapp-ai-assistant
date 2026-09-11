"""Configurable/custom field definitions schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

FIELD_TYPES = {
    "text",
    "textarea",
    "number",
    "date",
    "select",
    "multi_select",
    "boolean",
    "url",
    "email",
}

ENTITIES = {"CLIENT", "JOB", "CANDIDATE", "APPLICATION"}

# Built-in fields may not be renamed at the schema level; only labels win.
IMMUTABLE_KEYS = {
    "CLIENT": {"name", "logo_url", "location", "description"},
    "JOB": {
        "title",
        "description",
        "location",
        "is_remote",
        "contract_type",
        "experience",
        "salary_currency",
        "salary_min",
        "salary_max",
        "salary_frequency",
        "salary_negotiable",
        "headcount",
        "tags",
        "status",
    },
    "CANDIDATE": {
        "full_name",
        "email",
        "phone",
        "gender",
        "birth_date",
        "location",
        "current_company",
        "current_position",
        "experience",
        "notice_period",
        "last_working_day",
        "expected_salary",
        "current_salary",
        "linkedin_url",
        "source",
        "description",
        "skills",
    },
    "APPLICATION": {
        "source",
        "match_score",
    },
}

RESERVED_PREFIX = "cf_"


class FieldDefCreate(BaseModel):
    entity: str = Field(..., description="One of: CLIENT, JOB, CANDIDATE, APPLICATION")
    label: str = Field(..., min_length=1, max_length=255)
    field_type: str = Field(..., description="One of: " + ", ".join(sorted(FIELD_TYPES)))
    options: Optional[List[str]] = None
    required: bool = False
    show_in_form: bool = True
    show_in_apply: bool = False
    show_in_list: bool = False
    sort_order: int = 0


class FieldDefUpdate(BaseModel):
    label: Optional[str] = Field(None, min_length=1, max_length=255)
    field_type: Optional[str] = None
    options: Optional[List[str]] = None
    required: Optional[bool] = None
    show_in_form: Optional[bool] = None
    show_in_apply: Optional[bool] = None
    show_in_list: Optional[bool] = None
    sort_order: Optional[int] = None


class FieldDefOut(BaseModel):
    id: str
    entity: str
    code: str
    key: Optional[str] = None
    label: str
    field_type: str
    options: Optional[list] = None
    required: bool
    show_in_form: bool
    show_in_apply: bool
    show_in_list: bool
    sort_order: int
    is_built_in: bool
    is_active: bool
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class FieldListResponse(BaseModel):
    fields: List[FieldDefOut]
    total: int


class ReorderRequest(BaseModel):
    entity: str
    codes: List[str] = Field(..., description="Field codes in desired order")


class DeleteFieldResponse(BaseModel):
    deleted: bool
    field_id: str
    code: str
    label: str