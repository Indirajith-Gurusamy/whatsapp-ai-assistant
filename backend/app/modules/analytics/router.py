"""Analytics API router."""
from fastapi import APIRouter
from app.modules.analytics.service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
async def get_analytics():
    """Get analytics data."""
    return await AnalyticsService.get_analytics()
