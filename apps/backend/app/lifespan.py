"""Application lifespan management (startup/shutdown)."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
import asyncio
from app.db.client import get_db, disconnect_db
from app.core.cleanup_job import session_cleanup_job
import logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan events.
    
    Startup:
    - Connect to database
    - Initialize services
    - Start background jobs
    
    Shutdown:
    - Disconnect from database
    - Cleanup resources
    """
    # Startup
    logger.info("🚀 Starting WhatsApp AI Assistant...")
    
    try:
        await get_db()
        logger.info("✓ Database connected")
        
        # Start background cleanup job
        asyncio.create_task(session_cleanup_job())
        logger.info("✓ Session cleanup job started")
        
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}")
        raise
    
    logger.info("✓ Application started successfully")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down application...")
    await disconnect_db()
    logger.info("✓ Application shutdown complete")
