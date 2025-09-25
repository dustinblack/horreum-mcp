#!/usr/bin/env bash
set -euo pipefail

# Multi-arch build helper using Buildah/Podman. Inspired by rhivos-perfscale-mcp.
#
# Requirements on the host/runner:
# - buildah, podman
# - qemu-user-static with binfmt registrations for cross-arch (recommended)
#
# Env vars:
#   IMAGE_REPO                      Target repo (e.g., quay.io/org/repo) [required]
#   REGISTRY_USERNAME / REGISTRY_PASSWORD  Credentials (optional)
#   QUAY_USERNAME / QUAY_PASSWORD          Back-compat for Quay (optional)
#   OCI_REVISION                   OCI revision label (defaults to tag)
#
# Options:
#   -t, --tag <tag>             Image tag (default: git short SHA or timestamp)
#   -e, --expires <period>      Expiration label (default: 90d)
#       --expires-label <key>   Expiration label key (default: quay.expires-after)
#       --push                  Push manifest to <repo>:<tag>
#       --push-main             Also push/alias the manifest to :main
#   -f, --file <path>           Containerfile path (default: Containerfile)
#   -h, --help                  Show help

show_help() {
  cat <<EOF
Usage: IMAGE_REPO=quay.io/org/repo $(basename "$0") [options]

Options:
  -t, --tag <tag>             Image tag (default: git short SHA or timestamp)
  -e, --expires <period>      Expiration label value (default: 90d)
      --expires-label <key>   Expiration label key (default: quay.expires-after)
      --push                  Push manifest to <repo>:<tag>
      --push-main             Also push manifest to :main
  -f, --file <path>           Containerfile path (default: Containerfile)
  -h, --help                  Show this help

Environment:
  IMAGE_REPO, and optionally REGISTRY_USERNAME/REGISTRY_PASSWORD or QUAY_USERNAME/QUAY_PASSWORD.
EOF
}

TAG=""
EXPIRES="90d"
EXPIRES_LABEL="quay.expires-after"
PUSH=0
PUSH_MAIN=0
CONTAINERFILE="Containerfile"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--tag)
      TAG="${2:-}"
      shift 2 ;;
    -e|--expires)
      EXPIRES="${2:-}"
      shift 2 ;;
    --expires-label)
      EXPIRES_LABEL="${2:-quay.expires-after}"
      shift 2 ;;
    --push)
      PUSH=1
      shift 1 ;;
    --push-main)
      PUSH_MAIN=1
      shift 1 ;;
    -f|--file)
      CONTAINERFILE="${2:-Containerfile}"
      shift 2 ;;
    -h|--help)
      show_help ; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      show_help ; exit 1 ;;
  esac
done

if [[ -z "${IMAGE_REPO:-}" ]]; then
  echo "ERROR: IMAGE_REPO is required (e.g., quay.io/org/repo)" >&2
  exit 1
fi
REGISTRY_HOST="${IMAGE_REPO%%/*}"

if [[ -z "$TAG" ]]; then
  if command -v git >/dev/null 2>&1; then
    TAG="$(git rev-parse --short HEAD 2>/dev/null || true)"
  fi
  TAG=${TAG:-"local-$(date +%Y%m%d%H%M%S)"}
fi

MANIFEST_REF="${IMAGE_REPO}:${TAG}"

# Best-effort binfmt enablement
if command -v podman >/dev/null 2>&1; then
  if podman info >/dev/null 2>&1; then
    podman run --privileged --rm tonistiigi/binfmt --install all >/dev/null 2>&1 || true
  fi
fi

# Registry login
if [[ "$PUSH" -eq 1 ]]; then
  USERNAME="${REGISTRY_USERNAME:-${QUAY_USERNAME:-}}"
  PASSWORD="${REGISTRY_PASSWORD:-${QUAY_PASSWORD:-}}"
  if [[ -n "$USERNAME" && -n "$PASSWORD" ]]; then
    if command -v podman >/dev/null 2>&1; then
      podman login -u "$USERNAME" -p "$PASSWORD" "$REGISTRY_HOST"
    fi
    if command -v buildah >/dev/null 2>&1; then
      buildah login -u "$USERNAME" -p "$PASSWORD" "$REGISTRY_HOST"
    fi
  else
    echo "INFO: No registry credentials provided; proceeding without login." >&2
  fi
fi

# Create a fresh manifest (avoid name-in-use from previous runs)
buildah manifest rm "$MANIFEST_REF" >/dev/null 2>&1 || true
buildah manifest create "$MANIFEST_REF"

echo "Building amd64 image..."
buildah bud --override-arch amd64 --override-os linux \
  -f "$CONTAINERFILE" \
  --label "org.opencontainers.image.revision=${OCI_REVISION:-$TAG}" \
  --label "${EXPIRES_LABEL}=${EXPIRES}" \
  -t "${IMAGE_REPO}:${TAG}-amd64" .

echo "Building arm64 image..."
buildah bud --override-arch arm64 --override-os linux \
  -f "$CONTAINERFILE" \
  --label "org.opencontainers.image.revision=${OCI_REVISION:-$TAG}" \
  --label "${EXPIRES_LABEL}=${EXPIRES}" \
  -t "${IMAGE_REPO}:${TAG}-arm64" .

echo "Assembling manifest list..."
# On some environments, containers-storage references can be flaky; use docker://
buildah manifest add "$MANIFEST_REF" "containers-storage:${IMAGE_REPO}:${TAG}-amd64"
buildah manifest add "$MANIFEST_REF" "containers-storage:${IMAGE_REPO}:${TAG}-arm64"
buildah manifest annotate --annotation ${EXPIRES_LABEL}=${EXPIRES} "$MANIFEST_REF" || true

if [[ "$PUSH" -eq 1 ]]; then
  echo "Pushing multi-arch manifest to ${MANIFEST_REF}..."
  buildah manifest push --all "$MANIFEST_REF" "docker://${IMAGE_REPO}:${TAG}"
  if [[ "$PUSH_MAIN" -eq 1 ]]; then
    echo "Also pushing manifest to :main..."
    buildah manifest push --all "$MANIFEST_REF" "docker://${IMAGE_REPO}:main"
  fi
else
  echo "Built multi-arch manifest locally: ${MANIFEST_REF} (not pushed)" >&2
fi

echo "Done: ${IMAGE_REPO}:${TAG}" >&2


