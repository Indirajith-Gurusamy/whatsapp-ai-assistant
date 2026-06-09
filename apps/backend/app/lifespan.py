"""Application lifespan management (startup/shutdown)."""

from contextlib import asynccontextmanager

from typing import List, Optional

from fastapi import FastAPI

import asyncio

from app.db.client import get_db, disconnect_db

from app.core.background_jobs import should_start_background_jobs
from app.core.encryption import require_stable_encryption_key

from app.core.cleanup_job import session_cleanup_job

import logging



logger = logging.getLogger(__name__)



DB_CONNECT_RETRIES = 5

DB_CONNECT_DELAY_SEC = 3



_background_tasks: List[asyncio.Task] = []





async def connect_db_with_retry() -> None:

    last_error: Optional[Exception] = None

    for attempt in range(1, DB_CONNECT_RETRIES + 1):

        try:

            await get_db()

            logger.info("Database connected")

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





async def _cancel_background_tasks() -> None:

    if not _background_tasks:

        return

    for task in _background_tasks:

        task.cancel()

    for task in _background_tasks:

        try:

            await task

        except asyncio.CancelledError:

            pass

    _background_tasks.clear()


async def _shutdown_resources() -> None:
    """Stop background jobs, release locks, and disconnect from the database."""
    await _cancel_background_tasks()
    try:
        from app.modules.email.poll_lock import release_email_poll_lock

        release_email_poll_lock()
    except Exception:
        pass
    await disconnect_db()


@asynccontextmanager

async def lifespan(app: FastAPI):

    """

    Manage application lifespan events.



    Startup:

    - Connect to database

    - Initialize services

    - Start background jobs



    Shutdown:

    - Stop background jobs

    - Disconnect from database

    - Cleanup resources

    """

    logger.info("Starting WhatsApp AI Assistant...")

    require_stable_encryption_key()

    try:

        await connect_db_with_retry()



        if should_start_background_jobs():

            _background_tasks.append(asyncio.create_task(session_cleanup_job()))

            logger.info("Session cleanup job started")



            from app.modules.email.poll_job import gmail_poll_job



            _background_tasks.append(asyncio.create_task(gmail_poll_job()))

            logger.info("Gmail poll job started")

        else:

            logger.info("Background jobs skipped (uvicorn reload watcher)")



    except Exception as e:

        logger.error(f"Startup failed: {e}")

        await _shutdown_resources()

        raise



    logger.info("Application started successfully")



    try:

        yield

    finally:

        logger.info("Shutting down application...")

        await _shutdown_resources()

        logger.info("Application shutdown complete")


