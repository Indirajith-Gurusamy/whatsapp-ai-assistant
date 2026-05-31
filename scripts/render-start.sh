#!/usr/bin/env bash
set -euo pipefail

cd apps/backend

if [ ! -x ./prisma-query-engine-debian-openssl-3.0.x ]; then
  echo "==> Query engine missing at runtime, fetching..."
  python -m prisma py fetch
  ENGINE_PATH="$(find "${HOME}/.cache/prisma-python" -name 'prisma-query-engine-debian-openssl-3.0.x' -type f | head -n1)"
  if [ -n "${ENGINE_PATH}" ]; then
    cp "${ENGINE_PATH}" ./prisma-query-engine-debian-openssl-3.0.x
    chmod +x ./prisma-query-engine-debian-openssl-3.0.x
  fi
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
