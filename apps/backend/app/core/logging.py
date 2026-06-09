"""Centralized logging configuration."""
import logging
import logging.config
import sys
from pathlib import Path

_configured = False


class SafeStreamHandler(logging.StreamHandler):
    """Console handler: UTF-8 safe on Windows, always flushed."""

    def __init__(self, stream=None):
        super().__init__(stream or sys.stderr)

    def emit(self, record: logging.LogRecord) -> None:
        try:
            msg = self.format(record)
            stream = self.stream
            try:
                stream.write(msg + self.terminator)
            except UnicodeEncodeError:
                enc = getattr(stream, "encoding", None) or "utf-8"
                safe = msg.encode(enc, errors="replace").decode(enc, errors="replace")
                stream.write(safe + self.terminator)
            self.flush()
        except Exception:
            self.handleError(record)


def get_logging_config() -> dict:
    """Logging dict for uvicorn and the app (console + file)."""
    log_file = Path(__file__).parent.parent.parent / "app.log"
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            },
        },
        "handlers": {
            "console": {
                "()": "app.core.logging.SafeStreamHandler",
                "formatter": "default",
                "stream": "ext://sys.stderr",
            },
            "file": {
                "class": "logging.FileHandler",
                "formatter": "default",
                "filename": str(log_file.resolve()),
                "encoding": "utf-8",
            },
        },
        "root": {
            "level": "INFO",
            "handlers": ["console", "file"],
        },
        "loggers": {
            # Propagate to root — one console + file handler for everything.
            "uvicorn": {"level": "INFO"},
            "uvicorn.error": {"level": "INFO"},
            "uvicorn.access": {"level": "INFO"},
            "httpx": {"level": "WARNING"},
            "twilio.http_client": {"level": "WARNING"},
        },
    }


def setup_logging():
    """Configure application logging (idempotent)."""
    global _configured
    if _configured:
        return

    logging.config.dictConfig(get_logging_config())

    if hasattr(sys.stderr, "reconfigure"):
        try:
            sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)
        except (OSError, ValueError):
            pass

    _configured = True
