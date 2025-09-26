#!/usr/bin/env bash
set -euo pipefail

# Simple wrapper to scan a built image with Trivy and fail on high/critical.
# Usage:
#   ./scripts/trivy_scan.sh quay.io/<org>/horreum-mcp:tag

IMAGE_REF="${1:-}"
if [[ -z "$IMAGE_REF" ]]; then
  echo "Usage: $(basename "$0") <image-ref>" >&2
  exit 2
fi

if ! command -v trivy >/dev/null 2>&1; then
  echo "ERROR: trivy not found. Install from https://aquasecurity.github.io/trivy/" >&2
  exit 3
fi

# Scan vulnerabilities in OS and libraries; skip unfixed to reduce noise if desired
trivy image \
  --severity HIGH,CRITICAL \
  --exit-code 1 \
  --ignore-unfixed \
  --format table \
  "$IMAGE_REF"

echo "Trivy scan passed for $IMAGE_REF"


