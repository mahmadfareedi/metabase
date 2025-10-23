#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/run-from-tar.sh <image_tar_gz>

TAR_PATH=${1:?"Path to image tar.gz required"}

echo "[+] Loading image from ${TAR_PATH}"
docker load -i "${TAR_PATH}"

echo "[+] Starting Metabase (runtime compose)"
docker compose -f docker-compose.runtime.yml up -d

echo "[✓] Metabase is starting on http://localhost:3000"

