#!/usr/bin/env python3
"""Run Prisma commands against local or production database."""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "apps" / "backend"
sys.path.insert(0, str(BACKEND))

from app.core.env_loader import load_env  # noqa: E402


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/db.py <generate|push> [local|production]")
        print("Example: python scripts/db.py push local")
        sys.exit(1)

    command = sys.argv[1]
    profile = sys.argv[2] if len(sys.argv) > 2 else os.getenv("APP_ENV", "local")

    if command not in {"generate", "push"}:
        print(f"Unknown command: {command}")
        sys.exit(1)

    if profile not in {"local", "production"}:
        print(f"Unknown profile: {profile}")
        sys.exit(1)

    env_path = load_env(profile)
    print(f"Using {env_path}")

    if command == "push":
        prisma_cmd = ["python", "-m", "prisma", "db", "push", "--schema=prisma/schema.prisma"]
    elif command == "generate":
        prisma_cmd = ["python", "-m", "prisma", "generate", "--schema=prisma/schema.prisma"]
    else:
        prisma_cmd = ["python", "-m", "prisma", command, "--schema=prisma/schema.prisma"]
    subprocess.run(prisma_cmd, cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
