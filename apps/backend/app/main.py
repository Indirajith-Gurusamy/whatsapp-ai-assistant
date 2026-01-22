"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
