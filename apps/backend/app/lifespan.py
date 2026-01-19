"""Application lifespan management (startup/shutdown)."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.client import get_db, disconnect_db
import logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan events.
    
    Startup:
    - Connect to database
    - Initialize services
    
    Shutdown:
    - Disconnect from database
    - Cleanup resources
    """
    # Startup
    logger.info("🚀 Starting WhatsApp AI Assistant...")
    
    try:
        await get_db()
        logger.info("✓ Database connected")
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}")
        raise
    
    logger.info("✓ Application started successfully")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down application...")
    await disconnect_db()
    logger.info("✓ Application shutdown complete")
