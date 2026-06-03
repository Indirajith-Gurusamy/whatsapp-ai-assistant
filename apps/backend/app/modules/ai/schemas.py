"""Pydantic schemas for in-app assistant chat."""
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class AssistantChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)


class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[AssistantChatMessage] = Field(default_factory=list, max_length=20)
    pathname: Optional[str] = Field(None, max_length=256)


class AssistantChatResponse(BaseModel):
    reply: str
    provider_name: Optional[str] = None
