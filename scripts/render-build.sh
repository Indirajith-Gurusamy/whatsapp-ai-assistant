#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing Python dependencies..."
pip install -r requirements.txt

echo "==> Generating Prisma client..."
python -m prisma generate --schema=prisma/schema.prisma

echo "==> Fetching Prisma query engine for Linux..."
cd apps/backend
python -m prisma py fetch

ENGINE_PATH="$(find "${HOME}/.cache/prisma-python" -name 'prisma-query-engine-debian-openssl-3.0.x' -type f | head -n1)"
if [ -z "${ENGINE_PATH}" ]; then
  echo "ERROR: Prisma query engine binary not found after fetch"
  exit 1
fi

cp "${ENGINE_PATH}" ./prisma-query-engine-debian-openssl-3.0.x
chmod +x ./prisma-query-engine-debian-openssl-3.0.x
echo "==> Bundled query engine at apps/backend/prisma-query-engine-debian-openssl-3.0.x"
