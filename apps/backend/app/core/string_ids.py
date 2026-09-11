"""Coerce Prisma IDs to strings for APIs that declare String PKs."""
from typing import Any, Optional


def sid(value: Any) -> str:
    return str(value)


def sid_opt(value: Any) -> Optional[str]:
    if value is None or value == "":
        return None
    return str(value)
