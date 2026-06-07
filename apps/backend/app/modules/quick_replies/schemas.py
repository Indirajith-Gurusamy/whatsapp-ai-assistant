from typing import Optional
from pydantic import BaseModel, Field


class QuickReplyCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    body: str = Field(..., min_length=1, max_length=4000)
    category: Optional[str] = Field(None, max_length=50)
    sort_order: int = 0
    is_active: bool = True


class QuickReplyUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=120)
    body: Optional[str] = Field(None, min_length=1, max_length=4000)
    category: Optional[str] = Field(None, max_length=50)
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class QuickReplyOut(BaseModel):
    uuid: str
    title: str
    body: str
    category: Optional[str] = None
    sort_order: int
    is_active: bool
