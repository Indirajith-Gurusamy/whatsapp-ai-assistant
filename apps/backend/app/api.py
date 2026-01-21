"""Root API router aggregating all module routers."""
from fastapi import APIRouter
from app.modules.webhooks.router import router as webhooks_router
from app.modules.conversations.router import router as conversations_router
from app.modules.analytics.router import router as analytics_router
from app.modules.auth.router import router as auth_router

api_router = APIRouter()

# Include all module routers
api_router.include_router(webhooks_router)
api_router.include_router(conversations_router, prefix="/api")
api_router.include_router(analytics_router, prefix="/api")
api_router.include_router(auth_router, prefix="/api/v1")


@api_router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "Server is running"}
