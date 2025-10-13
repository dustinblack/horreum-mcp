# Container Build Workflow Architecture

## Overview

This document provides a visual representation of the container build,
security scanning, and deployment workflow.

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GitHub Actions: container-build                   │
│                                                                       │
│  Triggered by:                                                       │
│  • Push to main (when container files change)                       │
│  • GitHub release published                                          │
│  • Manual workflow_dispatch                                          │
└─────────────────────────────────────────────────────────────────────┘

                                  ▼

┌─────────────────────────────────────────────────────────────────────┐
│                   Job: build_scan_and_push (Single Job)              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. Checkout code                                            │   │
│  │ 2. Compute tags:                                            │   │
│  │    • Main push: SHA (abc1234) + "main"                      │   │
│  │    • Release: version (v1.2.3) + "latest"                   │   │
│  │ 3. Install build tools (buildah, podman, qemu)             │   │
│  │ 4. Setup Node.js                                            │   │
│  │ 5. Install dependencies and build app                       │   │
│  │ 6. Build multi-arch container (amd64, arm64) ONCE          │   │
│  │ 7. Run Trivy security scan                                  │   │
│  │    • Scan for HIGH and CRITICAL vulnerabilities            │   │
│  │    • Check OS packages and libraries                       │   │
│  │    • Exit code 1 if vulnerabilities found → STOPS HERE     │   │
│  │ 8. Login to Quay.io registry                                │   │
│  │ 9. Push images with both tags                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

                                  ▼

┌─────────────────────────────────────────────────────────────────────┐
│                    Quay.io Container Registry                        │
│                                                                       │
│  Main branch pushes create:                                          │
│  • quay.io/redhat-performance/horreum-mcp:abc1234 (SHA)            │
│  • quay.io/redhat-performance/horreum-mcp:main                      │
│                                                                       │
│  Release publishes create:                                           │
│  • quay.io/redhat-performance/horreum-mcp:v1.2.3 (version)         │
│  • quay.io/redhat-performance/horreum-mcp:latest                    │
│                                                                       │
│  Multi-arch manifest includes:                                      │
│  • linux/amd64                                                       │
│  • linux/arm64                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Workflow States

### Success Path

```
build_scan_and_push:
  Build → Scan [PASS] → Push [SUCCESS]
                           ↓
           Image published to quay.io with both tags
```

### Vulnerability Detected

```
build_scan_and_push:
  Build → Scan [FAIL] → Job stops, no push
            ↓
  Workflow fails, no images published
```

### Build Failure

```
build_scan_and_push:
  Build [FAIL] → Job stops
    ↓
  Workflow fails, no scan or push
```

## Key Benefits

1. **Security Gate**: Vulnerable images blocked before reaching registry
2. **Efficiency**: Single build pass, no duplication
3. **Simplicity**: One job does build → scan → push in sequence
4. **Release Support**: Handles both dev builds and versioned releases

## Concurrency

Only one build runs per branch at a time. New pushes cancel in-progress builds
to prevent race conditions.

## Configuration

- **Repository Variable**: `IMAGE_REPO` (e.g., `quay.io/org/horreum-mcp`)
- **Secrets**: `QUAY_USERNAME`, `QUAY_PASSWORD`

## Comparison

| Aspect           | Before (Broken)          | After (Fixed)          |
| ---------------- | ------------------------ | ---------------------- |
| Job Count        | 2 (build+push, scan)     | 1 (build+scan+push)    |
| Scan Timing      | After push               | Before push            |
| Vulnerable Push  | Possible                 | Blocked                |
| Image Tag Source | workflow_run.head_sha ❌ | GITHUB_SHA ✅          |
| Build Strategy   | Build once, scan remote  | Build once, scan, push |
| Efficiency       | Duplicate builds         | Single build           |
| Release Support  | No                       | Yes (version + latest) |

## References

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
