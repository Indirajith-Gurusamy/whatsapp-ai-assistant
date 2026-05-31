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

cd apps/backend

has_engine=false
for engine in prisma-query-engine-*; do
  if [ -f "${engine}" ]; then
    has_engine=true
    break
  fi
done

if [ "${has_engine}" = false ]; then
  echo "==> Query engine missing at runtime, fetching..."
  python -m prisma py fetch
  engine_path="$(find_prisma_engine || true)"
  if [ -n "${engine_path:-}" ]; then
    engine_name="$(basename "${engine_path}")"
    cp "${engine_path}" "./${engine_name}"
    chmod +x "./${engine_name}"
    if [ "${engine_name}" != "prisma-query-engine-debian-openssl-3.0.x" ]; then
      cp "./${engine_name}" ./prisma-query-engine-debian-openssl-3.0.x
      chmod +x ./prisma-query-engine-debian-openssl-3.0.x
    fi
  fi
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
