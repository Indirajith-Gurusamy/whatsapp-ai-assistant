"""Map Prisma DB errors to HTTP-friendly exceptions."""
from fastapi import HTTPException

MIGRATION_HINT = "Run: python scripts/db.py push local"


def raise_if_table_missing(exc: Exception) -> None:
    """Re-raise as 503 when new feature tables are not migrated yet."""
    name = type(exc).__name__
    msg = str(exc).lower()
    if name == "TableNotFoundError" or "does not exist" in msg:
        raise HTTPException(
            status_code=503,
            detail=f"Database schema is out of date. {MIGRATION_HINT}",
        ) from exc
