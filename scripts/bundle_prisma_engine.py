#!/usr/bin/env python3
"""Download and bundle the Prisma query engine for deployment."""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "apps" / "backend"
sys.path.insert(0, str(REPO_ROOT / "apps" / "backend"))

from prisma import config  # noqa: E402
from prisma.engine.utils import query_engine_name  # noqa: E402


def download_engines(cache_dir: Path) -> None:
    entrypoint = cache_dir / "node_modules" / "prisma" / "build" / "index.js"
    if not entrypoint.exists():
        return
    print("==> Downloading Prisma query engines via CLI...")
    subprocess.run(
        ["node", str(entrypoint), "engines", "download"],
        cwd=cache_dir,
        check=False,
    )


def find_engine_source(cache_dir: Path, engine_name: str) -> Path:
    short_name = engine_name.replace("prisma-", "", 1)
    patterns = [short_name, f"{short_name}*", "query-engine-*", "prisma-query-engine-*"]

    for pattern in patterns:
        matches = [
            path
            for path in cache_dir.rglob(pattern)
            if path.is_file() and not path.name.endswith(".json")
        ]
        if matches:
            return sorted(matches, key=lambda p: len(str(p)))[0]

    listed = sorted(cache_dir.rglob("*"))[:50]
    print(f"ERROR: Could not find Prisma engine under {cache_dir}")
    for path in listed:
        print(f"  {path}")
    raise SystemExit(1)


def bundle_engine() -> None:
    cache_dir = Path(config.binary_cache_dir)
    engine_name = query_engine_name()
    backend_target = BACKEND_DIR / engine_name
    cache_target = cache_dir / engine_name

    print(f"==> Prisma cache: {cache_dir}")
    print(f"==> Expected engine name: {engine_name}")

    download_engines(cache_dir)
    source = find_engine_source(cache_dir, engine_name)

    backend_target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, backend_target)
    backend_target.chmod(0o755)
    shutil.copy2(source, cache_target)
    cache_target.chmod(0o755)

    print(f"==> Bundled engine from {source}")
    print(f"==> -> {backend_target}")
    print(f"==> -> {cache_target}")


if __name__ == "__main__":
    bundle_engine()
