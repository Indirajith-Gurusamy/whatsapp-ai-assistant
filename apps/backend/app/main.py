"""FastAPI application entry point."""
import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.core.logging import setup_logging
from app.core.auth_activity import (
    begin_auth_activity,
    end_auth_activity,
    is_auth_priority_path,
)
from app.lifespan import lifespan
from app.api import api_router


http_logger = logging.getLogger("app.http")


class AuthPriorityMiddleware(BaseHTTPMiddleware):
    """Pause background work (e.g. IMAP poll) while login/auth handlers run."""

    async def dispatch(self, request: Request, call_next):
        if is_auth_priority_path(request.url.path):
            await begin_auth_activity()
            try:
                return await call_next(request)
            finally:
                await end_auth_activity()
        return await call_next(request)


class RequestLogMiddleware(BaseHTTPMiddleware):
    """Log API requests to the app logger (visible in terminal on Windows + reload)."""

    async def dispatch(self, request: Request, call_next):
        if request.url.path in ("/docs", "/openapi.json", "/redoc"):
            return await call_next(request)
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        http_logger.info(
            "%s %s -> %s (%.0fms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response

# Setup logging
setup_logging()

# Create FastAPI app
app = FastAPI(
    title="WhatsApp AI Assistant",
    version="2.0.0",
    description="Production-ready WhatsApp chatbot with Prisma ORM and modular architecture",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLogMiddleware)
app.add_middleware(AuthPriorityMiddleware)

# Include API router
app.include_router(api_router)



# Serve frontend static files
try:
    frontend_path = Path(__file__).parent.parent.parent / "frontend"
    if frontend_path.exists():
        app.mount("/static", StaticFiles(directory=str(frontend_path)), name="static")
except Exception:
    pass  # Frontend not available


@app.get("/dashboard")
async def dashboard():
    """Serve the dashboard HTML."""
    frontend_path = Path(__file__).parent.parent.parent / "frontend"
    
    search_paths = [
        frontend_path / "dashboard.html",
        frontend_path / "index.html",
    ]
    
    for dashboard_path in search_paths:
        if dashboard_path.exists():
            return FileResponse(str(dashboard_path), media_type="text/html")
    
    return {"error": "Frontend not found"}
