"""Pydantic schemas for in-app assistant chat."""
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field


class AssistantChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)


class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[AssistantChatMessage] = Field(default_factory=list, max_length=20)
    pathname: Optional[str] = Field(None, max_length=256)


class AssistantAction(BaseModel):
    type: str
    label: Optional[str] = None
    path: Optional[str] = None
    conversation_uuid: Optional[str] = None
    customer_uuid: Optional[str] = None
    enabled: Optional[bool] = None
    user_id: Optional[int] = None
    role: Optional[str] = None
    user_email: Optional[str] = None
    lead_status: Optional[str] = None
    comments: Optional[str] = None
    message: Optional[str] = None
    active: Optional[bool] = None
    # Extended admin actions
    email: Optional[str] = None
    password: Optional[str] = None
    name: Optional[str] = None
    profile_name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    settings_category: Optional[str] = None
    category: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    settings_json: Optional[str] = None
    provider_id: Optional[str] = None
    task_uuid: Optional[str] = None
    task_title: Optional[str] = None
    title: Optional[str] = None
    task_description: Optional[str] = None
    description: Optional[str] = None
    task_status: Optional[str] = None
    status: Optional[str] = None
    task_priority: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    customer_name: Optional[str] = None
    user_ids: Optional[List[int]] = None
    customer_uuids: Optional[List[str]] = None
    ui_target: Optional[str] = None
    target: Optional[str] = None


class AssistantChatResponse(BaseModel):
    reply: str
    provider_name: Optional[str] = None
    actions: List[AssistantAction] = Field(default_factory=list)


class AssistantExecuteRequest(BaseModel):
    action: AssistantAction


class SuggestReplyResponse(BaseModel):
    suggestion: str
