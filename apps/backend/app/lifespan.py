"""Application lifespan management (startup/shutdown)."""

from contextlib import asynccontextmanager

from typing import List, Optional

from fastapi import FastAPI

import asyncio

from app.db.client import get_db, disconnect_db

from app.core.background_jobs import should_start_background_jobs
from app.core.encryption import require_stable_encryption_key

from app.core.cleanup_job import session_cleanup_job

import json
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


async def _migrate_legacy_apply_fields() -> None:
    """One-time migration of the old apply_form_fields checkbox list.

    The standard fields selected there become `showInApply` flags on the
    matching CANDIDATE built-in field definitions. Afterwards the setting
    only carries the optional "resume" marker (its own file control).
    """
    db = await get_db()
    try:
        from app.modules.settings.service import SettingsService
        from app.modules.recruitment_fields.service import BUILTIN_DEFS

        s = await SettingsService(db).get_settings("RECRUITMENT")
        try:
            legacy = json.loads(s.get("apply_form_fields") or "[]")
            legacy = [str(k) for k in legacy] if isinstance(legacy, list) else []
        except (TypeError, ValueError):
            legacy = []

        pending = [k for k in legacy if k != "resume"]
        if not pending:
            return

        known = {d["key"] for d in BUILTIN_DEFS.get("CANDIDATE", [])}
        changed = 0
        for key in pending:
            if key not in known:
                continue
            row = await db.recruitmentfield.find_first(
                where={"entity": "CANDIDATE", "key": key}
            )
            if row and not row.showInApply:
                await db.recruitmentfield.update(
                    where={"id": row.id}, data={"showInApply": True}
                )
                changed += 1

        next_list = ["resume"] if "resume" in legacy else []
        await db.systemsetting.upsert(
            where={"category_key": {"category": "RECRUITMENT", "key": "apply_form_fields"}},
            data={
                "create": {
                    "category": "RECRUITMENT",
                    "key": "apply_form_fields",
                    "value": json.dumps(next_list),
                    "isEncrypted": False,
                },
                "update": {"value": json.dumps(next_list), "isEncrypted": False},
            },
        )
        logger.info(
            "Migrated legacy apply form fields -> %s CANDIDATE flags (remaining list: %s)",
            changed,
            next_list,
        )
    except Exception as e:
        logger.warning("Could not migrate legacy apply form fields: %s", e)


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

        try:

            from app.modules.recruitment_fields.service import RecruitmentFieldsService

            await RecruitmentFieldsService.seed_builtin_fields(await get_db())

            logger.info("Recruitment field definitions ready")

        except Exception as e:

            logger.warning("Could not seed recruitment field definitions: %s", e)

        try:

            await _migrate_legacy_apply_fields()

        except Exception as e:

            logger.warning("Could not migrate legacy apply form fields: %s", e)



        if should_start_background_jobs():

            _background_tasks.append(asyncio.create_task(session_cleanup_job()))

            logger.info("Session cleanup job started")



            from app.modules.email.poll_job import gmail_poll_job



            _background_tasks.append(asyncio.create_task(gmail_poll_job()))

            logger.info("Gmail poll job started")



            from app.modules.ai.scheduler import run_ai_scheduler



            _background_tasks.append(asyncio.create_task(run_ai_scheduler()))

            logger.info("AI scheduler workers started")



            from app.modules.ai.pending_jobs import ai_backfill_job



            _background_tasks.append(asyncio.create_task(ai_backfill_job()))

            logger.info("AI backfill job started")

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


