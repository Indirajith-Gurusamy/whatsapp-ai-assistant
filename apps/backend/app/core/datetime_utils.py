"""UTC datetime helpers for consistent API timestamps."""
from datetime import datetime, timezone
from typing import Optional, Union


def utc_now() -> datetime:
    """Naive UTC datetime for database storage."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def format_api_datetime(value: Optional[Union[datetime, str]]) -> Optional[str]:
    """Serialize a datetime as ISO-8601 UTC with trailing Z for clients."""
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if text.endswith("Z") or "+" in text[10:] or text.endswith("+00:00"):
            return text
        return f"{text}Z"
    dt = value
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.isoformat() + "Z"
