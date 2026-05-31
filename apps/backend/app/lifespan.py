"""Application lifespan management (startup/shutdown)."""
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI
import asyncio
from app.db.client import get_db, disconnect_db
from app.core.cleanup_job import session_cleanup_job
import logging

logger = logging.getLogger(__name__)

DB_CONNECT_RETRIES = 5
DB_CONNECT_DELAY_SEC = 3


async def connect_db_with_retry() -> None:
    last_error: Optional[Exception] = None
    for attempt in range(1, DB_CONNECT_RETRIES + 1):
        try:
            await get_db()
            logger.info("✓ Database connected")
            return
        except Exception as e:
            last_error = e
            logger.warning(
                "Database connection attempt %s/%s failed: %s",
                attempt,
                DB_CONNECT_RETRIES,
                e,
            )
            if attempt < DB_CONNECT_RETRIES:
                await asyncio.sleep(DB_CONNECT_DELAY_SEC)
    raise last_error or RuntimeError("Database connection failed")


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
        await connect_db_with_retry()

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
