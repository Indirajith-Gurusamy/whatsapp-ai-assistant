"""In-process pub/sub for per-customer real-time updates (SSE)."""
import asyncio
import logging
from typing import Any, AsyncIterator, Dict, Optional, Set

from app.core.async_lock import ensure_async_lock
from app.db.client import get_db

logger = logging.getLogger(__name__)

HISTORY_UPDATED = "history_updated"
HEARTBEAT_INTERVAL_SECONDS = 30


class CustomerEventHub:
    """Broadcast lightweight events to SSE subscribers keyed by customer UUID."""

    def __init__(self) -> None:
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._lock_holder: list = [None]

    async def subscribe(self, customer_uuid: str) -> AsyncIterator[Dict[str, Any]]:
        queue: asyncio.Queue = asyncio.Queue(maxsize=32)
        async with ensure_async_lock(self._lock_holder):
            self._subscribers.setdefault(customer_uuid, set()).add(queue)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(
                        queue.get(),
                        timeout=HEARTBEAT_INTERVAL_SECONDS,
                    )
                except asyncio.TimeoutError:
                    yield {"type": "heartbeat"}
                    continue
                yield event
        finally:
            async with ensure_async_lock(self._lock_holder):
                subs = self._subscribers.get(customer_uuid)
                if subs:
                    subs.discard(queue)
                    if not subs:
                        del self._subscribers[customer_uuid]

    async def publish(self, customer_uuid: str, event_type: str = HISTORY_UPDATED) -> None:
        async with ensure_async_lock(self._lock_holder):
            queues = list(self._subscribers.get(customer_uuid, set()))
        if not queues:
            return
        event = {"type": event_type}
        for queue in queues:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    logger.debug("Dropped customer event for %s (queue full)", customer_uuid)


_customer_event_hub: Optional[CustomerEventHub] = None


def get_customer_event_hub() -> CustomerEventHub:
    """Return the process-wide hub, created on first use inside the running app."""
    global _customer_event_hub
    if _customer_event_hub is None:
        _customer_event_hub = CustomerEventHub()
    return _customer_event_hub


async def _customer_uuid_for_conversation(conversation_id: int) -> Optional[str]:
    db = await get_db()
    conversation = await db.conversation.find_unique(
        where={"id": conversation_id},
        include={"customer": True},
    )
    if not conversation or not conversation.customer:
        return None
    return str(conversation.customer.uuid)


async def notify_conversation_history_updated(conversation_id: int) -> None:
    """Notify subscribers that a conversation's history changed."""
    customer_uuid = await _customer_uuid_for_conversation(conversation_id)
    if customer_uuid:
        await get_customer_event_hub().publish(customer_uuid, HISTORY_UPDATED)


def __getattr__(name: str):
    """Lazy `customer_event_hub` alias for legacy imports."""
    if name == "customer_event_hub":
        return get_customer_event_hub()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
