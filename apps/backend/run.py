"""
Startup script for the backend.

This sets up the Python path correctly and starts the server.
"""

import os
import socket
import sys
from pathlib import Path

# Fix Prisma version mismatch error
os.environ["PRISMA_PY_DEBUG_GENERATOR"] = "1"
# Show logs in the terminal immediately (including uvicorn reload child on Windows)
os.environ.setdefault("PYTHONUNBUFFERED", "1")

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load apps/env/local.env (or production via APP_ENV) before app imports
from app.core.env_loader import load_env

env_file = load_env()

HOST = "0.0.0.0"
PORT = int(os.getenv("PORT", "8000"))


def _use_reload() -> bool:
    """Auto-reload on by default. Set UVICORN_RELOAD=0 to disable."""
    flag = os.getenv("UVICORN_RELOAD", "").strip().lower()
    if flag in ("0", "false", "no"):
        return False
    if flag in ("1", "true", "yes"):
        return True
    return True


def _port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        return sock.connect_ex(("127.0.0.1", port)) == 0


def _ensure_port_available(port: int) -> None:
    if not _port_in_use(port):
        return
    print(f"\nERROR: Port {port} is already in use.", flush=True)
    print("Another backend is still running. Stop it first:", flush=True)
    print(f"  netstat -ano | findstr :{port}", flush=True)
    print("  taskkill /PID <pid> /F", flush=True)
    print("Or close the other terminal running: python apps/backend/run.py\n", flush=True)
    raise SystemExit(1)


if __name__ == "__main__":
    import uvicorn

    from app.core.logging import get_logging_config, setup_logging

    setup_logging()

    use_reload = _use_reload()
    if use_reload:
        os.environ["UVICORN_RELOAD"] = "1"
    else:
        os.environ.pop("UVICORN_RELOAD", None)
    _ensure_port_available(PORT)

    print("=" * 60, flush=True)
    print("Starting WhatsApp AI Assistant Backend", flush=True)
    print("=" * 60, flush=True)
    print(f"Backend directory: {backend_dir}", flush=True)
    print(f"Environment file: {env_file}", flush=True)
    print(f"APP_ENV: {os.getenv('APP_ENV', 'local')}", flush=True)
    print(f"Auto-reload: {'ON' if use_reload else 'OFF'}", flush=True)
    if use_reload:
        print("(Code changes restart the server; logs stream in this terminal)", flush=True)
    print("=" * 60, flush=True)

    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=use_reload,
        reload_dirs=[str(backend_dir)] if use_reload else None,
        log_config=get_logging_config(),
        log_level="info",
        access_log=True,
    )
