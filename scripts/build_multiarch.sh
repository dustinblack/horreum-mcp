#!/usr/bin/env bash
set -euo pipefail

# Multi-arch build helper using Buildah/Podman and Quay.io.
#
# Requirements on the host/runner:
# - buildah, podman, skopeo
# - qemu-user-static and binfmt registrations for cross-arch (recommended)
#
# Env vars:
#   IMAGE_REPO      Target repo (e.g., quay.io/org/repo) [required]
#   REGISTRY_USERNAME / REGISTRY_PASSWORD  Credentials for registry (optional)
#   QUAY_USERNAME / QUAY_PASSWORD          Back-compat for Quay (optional)
#
# Options:
#   -t, --tag <tag>             Image tag (default: git short SHA or timestamp)
#   -e, --expires <period>      Expiration label value (default: 90d)
#   --expires-label <key>       Expiration label key (default: quay.expires-after)
#   --push                      Push manifest to <repo>:<tag>
#   --push-main                 Also push/alias the manifest to :main
#   -f, --file <path>           Containerfile path (default: Containerfile)
#   -h, --help               Show help

show_help() {
  cat <<EOF
Usage: QUAY_USERNAME=... QUAY_PASSWORD=... IMAGE_REPO=quay.io/org/repo \
       $(basename "$0") [options]

Options:
  -t, --tag <tag>             Image tag (default: git short SHA or timestamp)
  -e, --expires <period>      Expiration label value (default: 90d, use "" for no expiration)
      --expires-label <key>   Expiration label key (default: quay.expires-after)
      --push                  Push manifest to <repo>:<tag>
      --push-main             Also push manifest to :main
  -f, --file <path>           Containerfile path (default: Containerfile)
  -h, --help               Show this help

Environment:
  QUAY_USERNAME, QUAY_PASSWORD, IMAGE_REPO are required.

Examples:
  # Build with default 90d expiration
  ./build_multiarch.sh --tag v1.0.0

  # Build without expiration (permanent)
  ./build_multiarch.sh --tag v1.0.0 --expires ""
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

# Default IMAGE_REPO only if not provided at all
if [[ -z "${IMAGE_REPO:-}" ]]; then
  IMAGE_REPO="localhost/horreum-mcp"
  echo "INFO: Using default IMAGE_REPO: $IMAGE_REPO" >&2
fi
REGISTRY_HOST="${IMAGE_REPO%%/*}"

if [[ -z "$TAG" ]]; then
  if command -v git >/dev/null 2>&1; then
    TAG="$(git rev-parse --short HEAD 2>/dev/null || true)"
  fi
  TAG=${TAG:-"local-$(date +%Y%m%d%H%M%S)"}
fi

# Use manifest name with the full image repo path
REPO_NAME="${IMAGE_REPO##*/}"
LOCAL_MANIFEST_REF="${IMAGE_REPO}:${TAG}"
REMOTE_MANIFEST_REF="${IMAGE_REPO}:${TAG}"

# Best-effort binfmt enablement (requires privileges; safe to skip if preconfigured)
if command -v podman >/dev/null 2>&1; then
  if podman info >/dev/null 2>&1; then
    podman run --privileged --rm tonistiigi/binfmt --install all >/dev/null 2>&1 || true
  fi
fi

# Quay/registry login
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

# Create manifest (local ref) and build per-arch images
buildah manifest rm "$LOCAL_MANIFEST_REF" >/dev/null 2>&1 || true
buildah manifest create "$LOCAL_MANIFEST_REF"

echo "Building amd64 image..."
BUILD_ARGS_AMD64=(--override-arch amd64 --override-os linux -f "$CONTAINERFILE" --label "org.opencontainers.image.revision=${OCI_REVISION:-$TAG}")
if [[ -n "$EXPIRES" ]]; then
  BUILD_ARGS_AMD64+=(--label "${EXPIRES_LABEL}=${EXPIRES}")
  echo "  with expiration: ${EXPIRES_LABEL}=${EXPIRES}"
else
  echo "  without expiration (permanent)"
fi
buildah bud "${BUILD_ARGS_AMD64[@]}" -t "${IMAGE_REPO}:${TAG}-amd64" .

echo "Building arm64 image..."
BUILD_ARGS_ARM64=(--override-arch arm64 --override-os linux -f "$CONTAINERFILE" --label "org.opencontainers.image.revision=${OCI_REVISION:-$TAG}")
if [[ -n "$EXPIRES" ]]; then
  BUILD_ARGS_ARM64+=(--label "${EXPIRES_LABEL}=${EXPIRES}")
  echo "  with expiration: ${EXPIRES_LABEL}=${EXPIRES}"
else
  echo "  without expiration (permanent)"
fi
buildah bud "${BUILD_ARGS_ARM64[@]}" -t "${IMAGE_REPO}:${TAG}-arm64" .

echo "Assembling manifest list..."
buildah manifest add "$LOCAL_MANIFEST_REF" "containers-storage:${IMAGE_REPO}:${TAG}-amd64"
buildah manifest add "$LOCAL_MANIFEST_REF" "containers-storage:${IMAGE_REPO}:${TAG}-arm64"
# Note: buildah manifest annotate doesn't work reliably for local manifests, skipping

# For local use, tag the current architecture image as the main tag
CURRENT_ARCH=$(uname -m)
case "$CURRENT_ARCH" in
  x86_64) LOCAL_ARCH_TAG="${IMAGE_REPO}:${TAG}-amd64" ;;
  aarch64|arm64) LOCAL_ARCH_TAG="${IMAGE_REPO}:${TAG}-arm64" ;;
  *) 
    echo "WARNING: Unknown architecture $CURRENT_ARCH, defaulting to amd64" >&2
    LOCAL_ARCH_TAG="${IMAGE_REPO}:${TAG}-amd64"
    ;;
esac

echo "Creating local runnable tag: ${IMAGE_REPO}:${TAG}-local -> ${LOCAL_ARCH_TAG}"
podman tag "$LOCAL_ARCH_TAG" "${IMAGE_REPO}:${TAG}-local"

if [[ "$PUSH" -eq 1 ]]; then
  echo "Pushing multi-arch manifest to ${REMOTE_MANIFEST_REF}..."
  buildah manifest push --all "$LOCAL_MANIFEST_REF" "docker://${IMAGE_REPO}:${TAG}"
  if [[ "$PUSH_MAIN" -eq 1 ]]; then
    echo "Also pushing manifest to :main..."
    buildah manifest push --all "$LOCAL_MANIFEST_REF" "docker://${IMAGE_REPO}:main"
  fi
else
  echo "Built multi-arch manifest locally: ${LOCAL_MANIFEST_REF} (not pushed)" >&2
  echo "Local runnable image available: ${IMAGE_REPO}:${TAG}-local" >&2
fi

echo "Done: ${IMAGE_REPO}:${TAG}" >&2


