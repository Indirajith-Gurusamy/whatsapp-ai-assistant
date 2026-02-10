from fastapi import APIRouter, Depends, Query
from typing import Dict, List, Any
from app.modules.auth.dependencies import get_current_user
from app.modules.dashboard.service import DashboardService

router = APIRouter(tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(
    current_user = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get dashboard statistics for the current user.
    """
    return await DashboardService.get_stats(current_user.email)

@router.get("/activity")
async def get_dashboard_activity(
    limit: int = Query(10, ge=1, le=50),
    current_user = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get recent activity for the current user's leads.
    """
    return await DashboardService.get_activity(current_user.email, limit)

@router.get("/summary")
async def get_dashboard_summary(
    current_user = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Get personalized summary/greeting.
    """
    return DashboardService.get_summary(current_user.name)
