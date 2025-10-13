# Security Scanning with Trivy

## Overview

This project uses [Trivy](https://aquasecurity.github.io/trivy/) to scan
container images for security vulnerabilities before they are published to the
registry. This ensures that only images passing security checks are deployed.

## Workflow Architecture

The container build and security scanning process is a single efficient job
(`build_scan_and_push`):

1. **Build**: Creates multi-arch image (amd64, arm64) once
2. **Scan**: Runs Trivy security scanner on the built image
   - **Fails the job** if HIGH or CRITICAL vulnerabilities found
   - Unfixed vulnerabilities are ignored to reduce noise
3. **Push**: Only executes if scan passes
   - Pushes multi-arch manifest to quay.io
   - Tags: SHA+`:main` (for main pushes) or version+`:latest` (for releases)

## Security Policy

The Trivy scan enforces the following policy:

- **Severity Levels**: HIGH and CRITICAL
- **Vulnerability Types**: OS packages and application libraries
- **Exit Behavior**: Fails workflow (exit code 1) on findings
- **Unfixed Vulnerabilities**: Ignored to reduce false positives

## Benefits

1. **Security Gate**: Vulnerable images never reach the registry
2. **Efficient**: Single build, no duplication or artifact overhead
3. **Clear Feedback**: Scan results visible in GitHub Actions logs
4. **Audit Trail**: All builds include security validation

## What Happens When Trivy Finds Issues

When HIGH or CRITICAL vulnerabilities are found:

1. The Trivy scan step fails with exit code 1
2. The job stops immediately before the push step
3. No images are pushed to quay.io
4. Developers see the vulnerability report in the workflow log

## Fixing Vulnerabilities

To address vulnerabilities found by Trivy:

1. Review the vulnerability report in the failed workflow run
2. Update base image versions in `Containerfile`
3. Update npm dependencies if library vulnerabilities are found
4. Re-run the workflow to validate the fixes

## Local Testing

You can run Trivy locally before pushing:

```bash
# Build your image
npm run build
podman build -t localhost/horreum-mcp:test -f Containerfile .

# Run Trivy scan
./scripts/trivy_scan.sh localhost/horreum-mcp:test
```

## Configuration

The Trivy configuration is defined in:

- `.github/workflows/container-build.yml` (GitHub Actions integration)
- `scripts/trivy_scan.sh` (local testing script)

## References

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Trivy GitHub Action](https://github.com/aquasecurity/trivy-action)
- [Container Security Best Practices](https://aquasecurity.github.io/trivy/latest/tutorials/kubernetes/)
