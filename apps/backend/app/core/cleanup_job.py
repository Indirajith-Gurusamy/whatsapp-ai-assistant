"""Background cleanup job for expired sessions."""
import asyncio
import logging
from datetime import datetime
from app.db.client import get_db
from app.modules.auth.session_utils import cleanup_expired_sessions

logger = logging.getLogger(__name__)


async def session_cleanup_job():
    """
    Background task to periodically clean up expired sessions.
    Runs every hour to remove sessions that have expired or been inactive.
    """
    while True:
        try:
            logger.info("Running session cleanup job...")
            db = await get_db()
            count = await cleanup_expired_sessions(db)
            if count > 0:
                logger.info(f"Session cleanup completed: {count} sessions removed")
            else:
                logger.debug("Session cleanup completed: no expired sessions found")
        except Exception as e:
            logger.error(f"Session cleanup job failed: {e}")
        
        # Wait 1 hour before next cleanup
        await asyncio.sleep(3600)
