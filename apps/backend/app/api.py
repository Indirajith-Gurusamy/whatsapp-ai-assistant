"""Root API router aggregating all module routers."""
from fastapi import APIRouter
from app.modules.webhooks.router import router as webhooks_router
from app.modules.conversations.router import router as conversations_router
from app.modules.analytics.router import router as analytics_router
from app.modules.auth.router import router as auth_router
from app.modules.admin.router import router as admin_router
from app.modules.settings.router import router as settings_router
from app.modules.ai.router import router as assistant_router
from app.modules.quick_replies.router import router as quick_replies_router
from app.modules.knowledge.router import router as knowledge_router
from app.modules.tasks.router import router as tasks_router

api_router = APIRouter()

# Include all module routers
api_router.include_router(webhooks_router)
api_router.include_router(conversations_router, prefix="/api")
api_router.include_router(analytics_router, prefix="/api")
api_router.include_router(auth_router, prefix="/api/v1")
api_router.include_router(admin_router, prefix="/api/v1")
api_router.include_router(settings_router, prefix="/api/v1")
api_router.include_router(assistant_router, prefix="/api/v1")
api_router.include_router(quick_replies_router, prefix="/api/v1")
api_router.include_router(knowledge_router, prefix="/api/v1")
api_router.include_router(tasks_router, prefix="/api/v1")

@api_router.get("/api/health")
async def health_check():
    """
    Health check endpoint for deployment monitoring.
    Returns server status and database connectivity.
    """
    import asyncio
    from app.db.client import _prisma_client

    db_status = "disconnected"
    if _prisma_client is not None:
        try:
            await asyncio.wait_for(_prisma_client.customer.count(), timeout=3.0)
            db_status = "connected"
        except asyncio.TimeoutError:
            db_status = "timeout"
        except Exception:
            db_status = "error"

    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": db_status,
        "message": "WhatsApp AI Assistant Backend"
    }

