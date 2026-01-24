"""Pydantic schemas for admin API requests and responses."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


class UserListItem(BaseModel):
    """Individual user in the list response."""
    id: int
    email: str
    name: str
    role: str
    isActive: bool = Field(alias="is_active")
    emailVerified: bool = Field(alias="email_verified")
    lastLogin: Optional[datetime] = Field(None, alias="last_login")
    createdAt: datetime = Field(alias="created_at")
    
    class Config:
        populate_by_name = True
        from_attributes = True


class UserListResponse(BaseModel):
    """Response for listing all users."""
    users: List[UserListItem]
    total: int
    skip: int
    limit: int


class RoleChangeRequest(BaseModel):
    """Request to change a user's role."""
    role: str
    
    @field_validator('role')
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Validate role is either USER or ADMIN."""
        if v not in ['USER', 'ADMIN']:
            raise ValueError('Role must be either USER or ADMIN')
        return v


class RoleChangeResponse(BaseModel):
    """Response after changing a user's role."""
    message: str
    user: UserListItem


class UserDeleteResponse(BaseModel):
    """Response after deleting a user."""
    message: str
    deleted_user_id: int


class AdminSignupRequest(BaseModel):
    """Request for admin signup."""
    name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8)
    admin_code: str = Field(..., description="Secret admin registration code")
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Basic email validation."""
        if '@' not in v or '.' not in v:
            raise ValueError('Invalid email format')
        return v.lower()


class AdminStatsResponse(BaseModel):
    """Response with admin statistics."""
    total_users: int
    total_admins: int
    total_active_users: int
    total_verified_users: int
