"""Prevent duplicate AI replies from retried or concurrent webhooks."""
import asyncio
from collections import OrderedDict
from contextlib import asynccontextmanager
from typing import Dict

_MAX_LOCKS = 500
_locks: "OrderedDict[str, asyncio.Lock]" = OrderedDict()


def conversation_lock_key(conversation_id: int) -> str:
    """Per-conversation key so concurrent messages cannot double-reply."""
    return f"conv-{conversation_id}"


@asynccontextmanager
async def inbound_processing_lock(key: str):
    """Serialize inbound processing per conversation to avoid double replies."""
    lock = _locks.get(key)
    if lock is None:
        lock = asyncio.Lock()
        _locks[key] = lock
    _locks.move_to_end(key)
    while len(_locks) > _MAX_LOCKS:
        _locks.popitem(last=False)
    async with lock:
        yield
