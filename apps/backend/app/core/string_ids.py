"""Coerce Prisma IDs to strings for APIs that declare String PKs."""
import asyncio
import logging
from typing import Any, Optional, Coroutine

logger = logging.getLogger(__name__)


def sid(value: Any) -> str:
    return str(value)


def sid_opt(value: Any) -> Optional[str]:
    if value is None or value == "":
        return None
    return str(value)


def fire(coro: Coroutine) -> None:
    """Run a coroutine in the background, ignoring failures.

    Keeps non-critical writes (audit logs, auto-activities) off the request
    critical path so upload flows like the careers site stay fast.
    """
    async def _runner() -> None:
        try:
            await coro
        except Exception as e:
            logger.warning("Background write failed: %s", e)

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    loop.create_task(_runner())
