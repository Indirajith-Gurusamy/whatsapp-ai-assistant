"""Cross-process lock so only one backend instance polls Gmail at a time."""
import logging
import os
from pathlib import Path

from app.core.background_jobs import _pid_running

logger = logging.getLogger(__name__)

# apps/backend/.email_poll.lock (same tree as app.log)
_POLL_LOCK_PATH = Path(__file__).resolve().parents[3] / ".email_poll.lock"


def acquire_email_poll_lock() -> bool:
    """Return True if this process should run the poll cycle."""
    if _POLL_LOCK_PATH.exists():
        try:
            pid = int(_POLL_LOCK_PATH.read_text(encoding="utf-8").strip())
            if _pid_running(pid):
                return False
            logger.info("Removing stale email poll lock (pid %s no longer running)", pid)
        except (ValueError, OSError):
            pass
        try:
            _POLL_LOCK_PATH.unlink()
        except OSError:
            return False

    try:
        fd = os.open(str(_POLL_LOCK_PATH), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        try:
            os.write(fd, str(os.getpid()).encode("ascii"))
        finally:
            os.close(fd)
        return True
    except FileExistsError:
        return False


def release_email_poll_lock() -> None:
    if not _POLL_LOCK_PATH.exists():
        return
    try:
        pid = int(_POLL_LOCK_PATH.read_text(encoding="utf-8").strip())
        if pid != os.getpid():
            return
        _POLL_LOCK_PATH.unlink()
    except (ValueError, OSError):
        try:
            _POLL_LOCK_PATH.unlink()
        except OSError:
            pass
