"""Lazy asyncio.Lock factory — avoid creating locks at import time."""
import asyncio


def ensure_async_lock(holder: list) -> asyncio.Lock:
    """Mutable one-element list holder for module- or instance-level lazy locks."""
    if holder[0] is None:
        holder[0] = asyncio.Lock()
    return holder[0]
