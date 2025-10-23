#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/build-and-package-image.sh <image_tag> [version]
# Example:
#   scripts/build-and-package-image.sh metabase-radar:radar-v1 v0.0.1-radar

IMAGE_TAG=${1:-metabase-radar:radar-v1}
VERSION_ARG=${2:-v0.0.1-radar}

echo "[+] Building image ${IMAGE_TAG} (VERSION=${VERSION_ARG})"
docker compose --progress=plain build --pull \
  --build-arg VERSION="${VERSION_ARG}"

echo "[+] Tagging image as ${IMAGE_TAG}"
docker tag metabase-radar "${IMAGE_TAG}"

OUT_FILE="${IMAGE_TAG//[:\//]/-}.tar.gz"
echo "[+] Saving image to ${OUT_FILE}"
docker save "${IMAGE_TAG}" | gzip > "${OUT_FILE}"

echo "[✓] Done. Deliver ${OUT_FILE} to your client."
echo "    On the client machine run:"
echo "      docker load -i ${OUT_FILE}"
echo "      docker compose -f docker-compose.runtime.yml up -d"

