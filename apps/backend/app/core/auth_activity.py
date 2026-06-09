"""Track in-flight auth requests so background jobs can yield (e.g. email IMAP poll)."""
import asyncio
import logging

from app.core.async_lock import ensure_async_lock

logger = logging.getLogger(__name__)

_auth_in_flight = 0
_lock_holder: list = [None]

AUTH_PRIORITY_PATHS = frozenset({
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/api/v1/auth/signup",
    "/api/v1/auth/verify-email",
    "/api/v1/auth/resend-otp",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/force-change-password",
    "/api/v1/admin/login",
})


def is_auth_priority_path(path: str) -> bool:
    return path in AUTH_PRIORITY_PATHS


async def auth_activity_active() -> bool:
    async with ensure_async_lock(_lock_holder):
        return _auth_in_flight > 0


async def begin_auth_activity() -> None:
    global _auth_in_flight
    async with ensure_async_lock(_lock_holder):
        _auth_in_flight += 1


async def end_auth_activity() -> None:
    global _auth_in_flight
    async with ensure_async_lock(_lock_holder):
        _auth_in_flight = max(0, _auth_in_flight - 1)


async def wait_for_auth_idle(max_wait_seconds: float = 90.0) -> bool:
    """Wait until no auth handlers are running. Returns False if timed out."""
    elapsed = 0.0
    step = 0.25
    while await auth_activity_active() and elapsed < max_wait_seconds:
        await asyncio.sleep(step)
        elapsed += step
    if await auth_activity_active():
        logger.info("Auth still in progress after %.0fs — deferring background work", max_wait_seconds)
        return False
    return True
