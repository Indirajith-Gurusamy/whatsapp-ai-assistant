"""Analytics API router."""
from fastapi import APIRouter, Depends

from app.modules.analytics.service import AnalyticsService
from app.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
async def get_analytics(current_user=Depends(get_current_user)):
    """Get analytics data."""
    return await AnalyticsService.get_analytics()
