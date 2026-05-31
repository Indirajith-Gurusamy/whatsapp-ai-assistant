#!/usr/bin/env bash
set -euo pipefail

find_prisma_engine() {
  local root path
  for root in \
    "/opt/render/.cache/prisma-python" \
    "${HOME}/.cache/prisma-python" \
    "${XDG_CACHE_HOME:-}/prisma-python"
  do
    [ -n "${root}" ] || continue
    [ -d "${root}" ] || continue
    path="$(find "${root}" -name 'prisma-query-engine-*' \( -type f -o -type l \) 2>/dev/null | head -n1)"
    if [ -n "${path}" ] && [ -e "${path}" ]; then
      echo "${path}"
      return 0
    fi
  done
  return 1
}

bundle_prisma_engine() {
  local engine_path engine_name
  engine_path="$(find_prisma_engine)" || {
    echo "ERROR: Prisma query engine binary not found after fetch"
    echo "Searched cache directories:"
    find /opt/render/.cache/prisma-python "${HOME}/.cache/prisma-python" -maxdepth 5 -type f 2>/dev/null || true
    return 1
  }

  engine_name="$(basename "${engine_path}")"
  cp "${engine_path}" "./${engine_name}"
  chmod +x "./${engine_name}"
  echo "==> Bundled query engine: apps/backend/${engine_name}"

  # Prisma runtime on Render expects this platform binary name
  if [ "${engine_name}" != "prisma-query-engine-debian-openssl-3.0.x" ]; then
    cp "./${engine_name}" ./prisma-query-engine-debian-openssl-3.0.x
    chmod +x ./prisma-query-engine-debian-openssl-3.0.x
    echo "==> Also copied as prisma-query-engine-debian-openssl-3.0.x"
  fi
}

echo "==> Installing Python dependencies..."
pip install -r requirements.txt

echo "==> Generating Prisma client..."
python -m prisma generate --schema=prisma/schema.prisma

echo "==> Fetching Prisma query engine for Linux..."
cd apps/backend
python -m prisma py fetch
bundle_prisma_engine
