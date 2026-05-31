#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! find apps/backend -maxdepth 1 -name 'prisma-query-engine-*' -type f | grep -q .; then
  echo "==> Query engine missing at runtime, bundling..."
  python -m prisma py fetch
  python scripts/bundle_prisma_engine.py
fi

cd apps/backend
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
