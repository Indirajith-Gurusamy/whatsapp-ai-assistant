"""Admin-only settings API router."""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.db.prisma import Prisma
from app.modules.auth.dependencies import get_db, require_role
from app.modules.settings.schemas import (
    CategorySettingsResponse,
    CategorySettingsUpdate,
    TestResult,
    TestMessageRequest,
    AuditLogListResponse,
)
from app.modules.settings.service import SettingsService

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {"whatsapp", "ai", "automation", "crm"}

router = APIRouter(prefix="/settings", tags=["Settings"])


def _validate_category(category: str) -> str:
    """Normalise and validate the category path param."""
    cat = category.lower()
    if cat not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category '{category}'. Must be one of: {', '.join(VALID_CATEGORIES)}",
        )
    return cat.upper()


# ── Static routes MUST come before /{category} ──────

# ── Audit logs ───────────────────────────────────────

@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
)
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user=Depends(require_role(["ADMIN"])),
    db: Prisma = Depends(get_db),
):
    """Paginated list of admin audit logs."""
    svc = SettingsService(db)
    return await svc.get_audit_logs(skip, limit)


# ── Test WhatsApp ────────────────────────────────────

@router.post(
    "/test/whatsapp",
    response_model=TestResult,
)
async def test_whatsapp(
    account_id: Optional[str] = Query(None),
    current_user=Depends(require_role(["ADMIN"])),
    db: Prisma = Depends(get_db),
):
    """Send a test request to Twilio to validate WhatsApp credentials."""
    svc = SettingsService(db)
    result = await svc.test_whatsapp(account_id)
    return TestResult(**result)


@router.post(
    "/test/whatsapp/send",
    response_model=TestResult,
)
async def send_test_whatsapp(
    body: TestMessageRequest,
    current_user=Depends(require_role(["ADMIN"])),
    db: Prisma = Depends(get_db),
):
    """Send a real test WhatsApp message to a specific number."""
    svc = SettingsService(db)
    result = await svc.send_test_message(
        account_id=body.account_id,
        phone_number=body.phone_number,
        message_text=body.message,
        is_template=body.is_template
    )
    return TestResult(**result)


# ── Test AI ──────────────────────────────────────────

@router.post(
    "/test/ai",
    response_model=TestResult,
)
async def test_ai(
    provider_id: Optional[str] = Query(None),
    current_user=Depends(require_role(["ADMIN"])),
    db: Prisma = Depends(get_db),
):
    """Send a test prompt via the active or selected AI provider."""
    svc = SettingsService(db)
    result = await svc.test_ai(provider_id)
    return TestResult(**result)




# ── Dynamic /{category} routes LAST ─────────────────

# ── GET settings ─────────────────────────────────────

@router.get(
    "/{category}",
    response_model=CategorySettingsResponse,
)
async def get_settings(
    category: str,
    current_user=Depends(require_role(["ADMIN"])),
    db: Prisma = Depends(get_db),
):
    """Get all settings for a category (admin only)."""
    cat = _validate_category(category)
    svc = SettingsService(db)
    data = await svc.get_settings(cat)
    return CategorySettingsResponse(category=cat, settings=data)


# ── PUT settings ─────────────────────────────────────

@router.put(
    "/{category}",
    response_model=CategorySettingsResponse,
)
async def update_settings(
    category: str,
    body: CategorySettingsUpdate,
    current_user=Depends(require_role(["ADMIN"])),
    db: Prisma = Depends(get_db),
):
    """Update settings for a category (admin only). Logs to audit."""
    cat = _validate_category(category)
    svc = SettingsService(db)
    data = await svc.update_settings(cat, body.settings, current_user.id)
    return CategorySettingsResponse(category=cat, settings=data)
