"""Client (Organization) schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CreateClientRequest(BaseModel):
    name: str
    logo_url: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    custom_fields: Optional[dict] = None
    is_archived: Optional[bool] = False


class UpdateClientRequest(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    custom_fields: Optional[dict] = None
    is_archived: Optional[bool] = None


class ClientOut(BaseModel):
    id: int
    name: str
    logo_url: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    custom_fields: Optional[dict] = None
    is_archived: bool
    job_count: int = 0
    created_at: datetime
    updated_at: datetime


class ClientListResponse(BaseModel):
    clients: List[ClientOut]
    total: int