#!/bin/bash
set -euo pipefail

# Update CA trust if custom certificates are mounted
# This is required for corporate/self-signed SSL certificates
if [ -d /etc/pki/ca-trust/source/anchors ] && \
   [ "$(find /etc/pki/ca-trust/source/anchors -type f 2>/dev/null | wc -l)" -gt 0 ]; then
    echo "Custom CA certificates detected, updating trust store..." >&2
    # Note: This requires running as root or having CAP_CHOWN capability
    # For rootless containers, CA certs should be baked into the image
    if [ "$(id -u)" -eq 0 ]; then
        update-ca-trust extract
        echo "CA trust store updated successfully" >&2
    else
        echo "WARNING: Cannot update CA trust as non-root user" >&2
        echo "Mount CA certs at build time or run with --user=0 to update trust" >&2
    fi
fi

# Detect if running under QEMU emulation and adjust Node.js options accordingly
# This prevents V8 crashes when running cross-architecture containers

detect_qemu() {
    # Check for QEMU-specific indicators
    if [ -f /proc/cpuinfo ]; then
        # QEMU often shows specific CPU models or features
        if grep -q "QEMU\|TCG" /proc/cpuinfo 2>/dev/null; then
            return 0
        fi
    fi
    
    # Check for QEMU in process list (less reliable but additional check)
    if pgrep -f qemu >/dev/null 2>&1; then
        return 0
    fi
    
    # Check if architecture mismatch warning was shown (from container logs)
    # This is a heuristic based on podman/docker warnings
    return 1
}

# Base NODE_OPTIONS from environment
BASE_NODE_OPTIONS="${NODE_OPTIONS:-}"

# If we detect QEMU emulation, add --jitless to prevent crashes
if detect_qemu; then
    echo "QEMU emulation detected, adding --jitless flag to prevent V8 crashes" >&2
    export NODE_OPTIONS="$BASE_NODE_OPTIONS --jitless"
    echo "Warning: WebAssembly support disabled due to QEMU emulation" >&2
else
    # Keep original options for native execution
    export NODE_OPTIONS="$BASE_NODE_OPTIONS"
fi

# Execute the original command
exec "$@"
