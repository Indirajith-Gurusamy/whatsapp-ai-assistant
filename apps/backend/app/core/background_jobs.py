"""Helpers for starting background jobs once per server process."""
import multiprocessing
import os
import sys


def _reload_supervisor_active() -> bool:
    """
    True when this process is uvicorn's reload parent (watches files, does not serve HTTP).

    Uvicorn does not set Django's RUN_MAIN. With --reload:
    - Parent: multiprocessing name 'MainProcess', serves no HTTP traffic
    - Child:  name 'SpawnProcess-N', runs Server.run() and FastAPI lifespan
    """
    if multiprocessing.current_process().name != "MainProcess":
        return False

    reload_env = os.environ.get("UVICORN_RELOAD", "").strip().lower()
    if reload_env in ("1", "true", "yes"):
        return True

    # `uvicorn app.main:app --reload` without run.py
    if "--reload" in sys.argv:
        return True

    return False


def should_start_background_jobs() -> bool:
    """Only run background jobs in the HTTP worker, not the reload watcher."""
    if _reload_supervisor_active():
        return False
    return True


def _pid_running(pid: int) -> bool:
    if pid <= 0:
        return False
    if sys.platform == "win32":
        import ctypes

        synchronize = 0x00100000
        process = ctypes.windll.kernel32.OpenProcess(synchronize, False, pid)
        if process:
            ctypes.windll.kernel32.CloseHandle(process)
            return True
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False
