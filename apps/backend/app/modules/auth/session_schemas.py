"""Pydantic schemas for session management."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class SessionResponse(BaseModel):
    """Response model for a single session."""
    id: int
    deviceType: Optional[str] = None
    browser: Optional[str] = None
    browserVersion: Optional[str] = None
    os: Optional[str] = None
    ipAddress: Optional[str] = None
    location: Optional[str] = None
    lastActivity: datetime
    createdAt: datetime
    isCurrent: bool = False
    
    class Config:
        from_attributes = True


class SessionListResponse(BaseModel):
    """Response model for list of sessions."""
    sessions: List[SessionResponse]
    total: int
