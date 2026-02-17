"""Pydantic schemas for admin settings endpoints."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


# ── Individual setting item ──────────────────────────

class SettingItem(BaseModel):
    """A single key-value setting."""
    key: str
    value: str
    is_encrypted: bool = False


# ── Request / response per category ──────────────────

class CategorySettingsResponse(BaseModel):
    """Response containing all settings for a category."""
    category: str
    settings: Dict[str, str]


class CategorySettingsUpdate(BaseModel):
    """Request body to update settings for a category."""
    settings: Dict[str, str] = Field(
        ...,
        description="Key-value pairs to upsert",
        examples=[{"twilio_account_sid": "ACxxx", "twilio_auth_token": "secret"}],
    )


# ── Test result ──────────────────────────────────────

class TestResult(BaseModel):
    """Result of a connection / API test."""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


class TestMessageRequest(BaseModel):
    """Request body to send a test WhatsApp message."""
    account_id: Optional[str] = None
    phone_number: str = Field(..., description="Recipient phone number with country code")
    message: str = Field(..., description="Message text (or template parameters) to send")
    is_template: bool = Field(False, description="Whether to send as a Meta template")


# ── Audit log ────────────────────────────────────────

class AuditLogEntry(BaseModel):
    """Single audit-log row for display."""
    id: str
    admin_name: str
    admin_email: str
    action: str
    category: str
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    created_at: datetime


class AuditLogListResponse(BaseModel):
    """Paginated audit-log response."""
    logs: List[AuditLogEntry]
    total: int
    skip: int
    limit: int
