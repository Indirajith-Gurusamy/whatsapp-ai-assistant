"""Central AI work scheduler.

Careers submissions and uploads only store the file/application; the expensive
AI parse + screening happens here in the background. A small fixed pool of
workers consumes from an in-memory queue, so any number of simultaneous
submissions collapses to a bounded number of concurrent AI calls and coroutines
(``AI_WORKER_COUNT``), and submissions are never blocked by LLM work.

Work is idempotent: ``ResumeAIService.try_*`` skip anything already parsed or
screened (markers in DB), and each candidate can only sit in the queue once
(``_waiting`` + ``_inflight`` guards). The 60s backfill poll in
``pending_jobs`` acts as a safety net for work lost on restart or that dropped
after max retries.
"""
import asyncio
import logging
from typing import Optional

from app.db.client import get_db

logger = logging.getLogger(__name__)

AI_WORKER_COUNT = 3
MAX_WORK_ATTEMPTS = 3
RETRY_DELAY_SECONDS = 5.0

_queue = None
_queue_loop = None
_waiting: set = set()
_inflight: set = set()
_workers: list = []


def _get_queue() -> "asyncio.Queue":
    """Return the queue bound to the currently running event loop.

    The queue must be created inside the running loop (Python 3.8 binds
    ``asyncio.Queue`` to the loop that exists when it is constructed), which is
    why it is built lazily rather than at import time.
    """
    global _queue, _queue_loop
    loop = asyncio.get_running_loop()
    if _queue is None or _queue_loop is not loop:
        _queue = asyncio.Queue()
        _queue_loop = loop
        _waiting.clear()
        _inflight.clear()
    return _queue


def enqueue_after_apply(candidate_id: Optional[str], job_id: Optional[str] = None) -> bool:
    """Queue AI parse + screen for a candidate, without blocking the caller.

    Returns True if the item was queued. No-ops (False) when the candidate is
    already queued or currently being processed, keeping the queue deduplicated.
    """
    if not candidate_id:
        return False
    _get_queue()
    if candidate_id in _inflight or candidate_id in _waiting:
        return False
    _waiting.add(candidate_id)
    _queue.put_nowait({"candidate_id": candidate_id, "job_id": job_id, "attempts": 1})
    return True


async def process_candidate_match(item: dict) -> None:
    """Parse the candidate's resume, then screen its applications with AI."""
    from app.modules.ai.resume import ResumeAIService

    candidate_id = item["candidate_id"]
    db = await get_db()

    await ResumeAIService.try_parse_candidate(candidate_id)

    job_id = item.get("job_id")
    if job_id:
        match = await db.match.find_first(
            where={"candidateId": candidate_id, "jobId": job_id}
        )
        if match:
            await ResumeAIService.try_screen_application(match.id)
    else:
        matches = await db.match.find_many(where={"candidateId": candidate_id})
        for m in matches:
            await ResumeAIService.try_screen_application(m.id)


async def _worker(idx: int) -> None:
    while True:
        item = await _get_queue().get()
        candidate_id = item["candidate_id"]
        _waiting.discard(candidate_id)
        if candidate_id in _inflight:
            continue
        _inflight.add(candidate_id)
        try:
            await process_candidate_match(item)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            attempts = item.get("attempts", 1)
            logger.warning(
                "[AI] Worker %d failed for candidate %s (attempt %d/%d): %s",
                idx, candidate_id, attempts, MAX_WORK_ATTEMPTS, e,
            )
            if attempts < MAX_WORK_ATTEMPTS:
                item["attempts"] = attempts + 1
                _waiting.add(candidate_id)
                _queue.put_nowait(item)
                await asyncio.sleep(RETRY_DELAY_SECONDS)
                continue
            logger.warning(
                "[AI] Dropping AI work for candidate %s after %d attempts; the backfill poll will retry",
                candidate_id, attempts,
            )
        finally:
            _inflight.discard(candidate_id)


async def run_ai_scheduler() -> None:
    """Start the worker pool. Runs for the lifetime of the process."""
    _workers.clear()
    for i in range(AI_WORKER_COUNT):
        _workers.append(asyncio.create_task(_worker(i)))
    logger.info("[AI] %d AI scheduler worker(s) started", AI_WORKER_COUNT)
    try:
        await asyncio.gather(*_workers)
    finally:
        for t in _workers:
            t.cancel()