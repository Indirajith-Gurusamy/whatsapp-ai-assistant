"""Background poll that feeds pending AI work into the scheduler queue.

The actual AI parse/screen runs inside the bounded worker pool in
``app.modules.ai.scheduler`` — this routine only finds pending items and queues
them, so the number of concurrent LLM calls stays capped regardless of how much
work accumulates.
"""
import asyncio
import logging

from app.db.client import get_db
from app.modules.ai.resume import ResumeAIService, has_screening

logger = logging.getLogger(__name__)

PENDING_AI_INTERVAL_SECONDS = 60


async def enqueue_pending_ai() -> int:
    """Queue every candidate that still needs AI parsing/screening. Returns queued count."""
    from app.modules.ai.scheduler import enqueue_after_apply

    queued = 0

    try:
        parse_enabled = await ResumeAIService._flag("ai_parse_resumes")
    except Exception as e:
        logger.warning("[AI] Could not read parse toggle: %s", e)
        parse_enabled = False

    db = await get_db()

    if parse_enabled:
        candidates = [
            c
            for c in await db.candidate.find_many(where={"resumeUrl": {"not": None}})
            if c.resumeUrl
        ]
        if candidates:
            logs = await db.recruitmentlog.find_many(
                where={"action": "Resume parsed with AI"}
            )
            already = {log.candidateId for log in logs}
            pending = [c for c in candidates if c.id not in already]
            if pending:
                for c in pending:
                    if enqueue_after_apply(c.id, None):
                        queued += 1
                logger.info("[AI] Queued %d pending resume parse(s)", len(pending))

    try:
        screen_enabled = await ResumeAIService._flag("ai_screen_applications")
    except Exception as e:
        logger.warning("[AI] Could not read screening toggle: %s", e)
        screen_enabled = False

    if screen_enabled:
        matches = await db.match.find_many(
            include={"candidate": True, "job": {"include": {"organization": True}}},
        )
        pending = [
            m
            for m in matches
            if not has_screening(m)
            and (bool(m.resumeUrl) or bool(m.candidate and m.candidate.resumeUrl))
        ]
        if pending:
            for m in pending:
                if enqueue_after_apply(m.candidateId, m.jobId):
                    queued += 1
            logger.info("[AI] Queued %d pending application screening(s)", len(pending))

    return queued


async def ai_backfill_job() -> None:
    """Backfill AI parsing and screening for work created in request handlers."""
    while True:
        try:
            queued = await enqueue_pending_ai()
            if queued:
                logger.info("[AI] Backfill pass queued %d work item(s)", queued)
        except Exception as e:
            logger.warning("[AI] AI backfill pass failed: %s", e)
        await asyncio.sleep(PENDING_AI_INTERVAL_SECONDS)