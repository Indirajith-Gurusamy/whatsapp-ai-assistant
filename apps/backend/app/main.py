"""FastAPI application entry point."""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from pathlib import Path
from app.core.logging import setup_logging
from app.lifespan import lifespan
from app.api import api_router

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


# --- Global Exception Handlers ---

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    """Return a clean {detail: string} for validation errors instead of FastAPI's verbose default."""
    errors = exc.errors()
    if errors:
        first = errors[0]
        field = " → ".join(str(loc) for loc in first.get("loc", []) if loc != "body")
        msg = f"{field}: {first.get('msg', 'Invalid value')}" if field else first.get("msg", "Validation error")
    else:
        msg = "Invalid request data"
    return JSONResponse(status_code=422, content={"detail": msg})


@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    """Catch-all for unhandled exceptions. Logs full traceback, returns generic message."""
    logging.getLogger("app.global").error(
        f"Unhandled error on {request.method} {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
    )


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
