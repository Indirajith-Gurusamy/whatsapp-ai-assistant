#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing Python dependencies..."
pip install -r requirements.txt

echo "==> Generating Prisma client..."
python -m prisma generate --schema=prisma/schema.prisma

echo "==> Ensuring Prisma CLI cache..."
python -m prisma py fetch

echo "==> Bundling Prisma query engine..."
python scripts/bundle_prisma_engine.py
