# SSL/TLS Configuration for Horreum MCP

This document describes the SSL/TLS certificate configuration options for the
Horreum MCP server when connecting to Horreum instances with corporate or
self-signed SSL certificates.

## Problem

When connecting to a Horreum instance with a corporate or self-signed SSL
certificate, Node.js will reject the connection with an error like:

```
TypeError: fetch failed: unable to get local issuer certificate
```

This happens because the container doesn't trust the Certificate Authority (CA)
that signed the Horreum server's SSL certificate.

## Solutions

### Option 1: Mount CA Certificate (Recommended for Production)

This is the **secure and recommended** approach for production deployments.

#### How it Works

1. Mount your corporate CA certificate bundle into the container
2. The container entrypoint automatically runs `update-ca-trust` when it detects
   mounted certificates
3. Node.js trusts the CA and can validate the Horreum server's certificate

#### Example

```bash
# Find your CA bundle (common locations):
# - /etc/pki/ca-trust/source/anchors/
# - /etc/ssl/certs/ca-bundle.crt
# - /usr/local/share/ca-certificates/

podman run -d --name horreum-mcp-server \
  --user=0 \
  -v /path/to/your/ca-bundle.crt:/etc/pki/ca-trust/source/anchors/corporate-ca.crt:ro \
  -p 3000:3000 \
  -e HTTP_MODE_ENABLED=true \
  -e HTTP_AUTH_TOKEN=your-secret-token \
  -e HORREUM_BASE_URL=https://horreum.corp.example.com \
  -e HORREUM_TOKEN=your-keycloak-token \
  quay.io/redhat-performance/horreum-mcp:main
```

**Note:** Requires `--user=0` so the entrypoint can run `update-ca-trust` with
root privileges.

#### Container Entrypoint Logic

The `docker-entrypoint.sh` script automatically detects mounted CA certificates:

```bash
if [ -d /etc/pki/ca-trust/source/anchors ] && \
   [ "$(find /etc/pki/ca-trust/source/anchors -type f 2>/dev/null | wc -l)" -gt 0 ]; then
    echo "Custom CA certificates detected, updating trust store..." >&2
    if [ "$(id -u)" -eq 0 ]; then
        update-ca-trust extract
        echo "CA trust store updated successfully" >&2
    else
        echo "WARNING: Cannot update CA trust as non-root user" >&2
    fi
fi
```

### Option 2: Disable SSL Verification (Testing Only)

This option **completely disables SSL certificate verification** and should
**ONLY** be used for local development or testing.

#### Environment Variable

Set `HORREUM_TLS_VERIFY=false` to disable SSL verification:

```bash
podman run -d --name horreum-mcp-server \
  -p 3000:3000 \
  -e HORREUM_TLS_VERIFY=false \
  -e HTTP_MODE_ENABLED=true \
  -e HTTP_AUTH_TOKEN=your-secret-token \
  -e HORREUM_BASE_URL=https://horreum.corp.example.com \
  -e HORREUM_TOKEN=your-keycloak-token \
  quay.io/redhat-performance/horreum-mcp:main
```

#### How it Works

The application code in `src/index.ts` checks the `HORREUM_TLS_VERIFY`
environment variable:

```typescript
if (!env.HORREUM_TLS_VERIFY) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  logger.warn(
    'SSL certificate verification is DISABLED. This should only be used for testing.'
  );
}
```

This sets the Node.js `NODE_TLS_REJECT_UNAUTHORIZED` environment variable,
which globally disables SSL certificate validation for all HTTPS connections.

#### ⚠️ Security Warning

**DO NOT use `HORREUM_TLS_VERIFY=false` in production!**

Disabling SSL verification:

- Removes protection against man-in-the-middle (MITM) attacks
- Allows any certificate to be accepted, even invalid or expired ones
- Defeats the purpose of HTTPS encryption

### Option 3: Use HTTP (if available)

If your Horreum instance supports unencrypted HTTP, you can avoid SSL entirely:

```bash
podman run -d --name horreum-mcp-server \
  -p 3000:3000 \
  -e HORREUM_BASE_URL=http://horreum.corp.example.com \
  -e HTTP_MODE_ENABLED=true \
  -e HTTP_AUTH_TOKEN=your-secret-token \
  -e HORREUM_TOKEN=your-keycloak-token \
  quay.io/redhat-performance/horreum-mcp:main
```

> [!WARNING]
> HTTP transmits authentication tokens and data in plaintext. Only use this on
> trusted networks.

## Configuration Reference

### Environment Variables

| Variable             | Type    | Default | Description                                |
| -------------------- | ------- | ------- | ------------------------------------------ |
| `HORREUM_TLS_VERIFY` | boolean | `true`  | Enable SSL certificate verification        |
| `HORREUM_BASE_URL`   | string  | -       | Horreum instance URL (http:// or https://) |
| `HORREUM_TOKEN`      | string  | -       | Authentication token for Horreum API       |

### Container Runtime Options

| Option            | Purpose                                               |
| ----------------- | ----------------------------------------------------- |
| `--user=0`        | Run as root to enable `update-ca-trust` in entrypoint |
| `-v path:path:ro` | Mount CA certificate into container (read-only)       |

## Troubleshooting

### Error: "unable to get local issuer certificate"

**Cause:** Container doesn't trust the CA that signed the Horreum SSL certificate.

**Solutions:**

1. Mount your CA certificate (Option 1 above)
2. For testing only, set `HORREUM_TLS_VERIFY=false`

### Error: "Cannot update CA trust as non-root user"

**Cause:** Container entrypoint detected CA certificates but lacks root
privileges to run `update-ca-trust`.

**Solution:** Add `--user=0` to your `podman run` command.

### Warning in logs: "SSL certificate verification is DISABLED"

**Cause:** `HORREUM_TLS_VERIFY=false` is set.

**Action:**

- If in production: **Remove this setting immediately** and use Option 1 (mount CA cert)
- If testing: This is expected behavior

## Examples

### Production Deployment with Corporate CA

```bash
# Export your CA from the system trust store
openssl s_client -showcerts -connect horreum.corp.example.com:443 \
  </dev/null 2>/dev/null | \
  openssl x509 -outform PEM > /tmp/corporate-ca.crt

# Run container with CA certificate
podman run -d --name horreum-mcp-server \
  --user=0 \
  -v /tmp/corporate-ca.crt:/etc/pki/ca-trust/source/anchors/corporate-ca.crt:ro \
  -p 3000:3000 \
  -e HTTP_MODE_ENABLED=true \
  -e HTTP_AUTH_TOKEN=your-secret-token \
  -e HORREUM_BASE_URL=https://horreum.corp.example.com \
  -e HORREUM_TOKEN=your-keycloak-token \
  quay.io/redhat-performance/horreum-mcp:main

# Verify it's working
podman logs horreum-mcp-server 2>&1 | grep -i "CA"
# Should see: "Custom CA certificates detected, updating trust store..."
# Should see: "CA trust store updated successfully"

# Test the connection
curl -H 'Authorization: Bearer your-secret-token' \
     http://localhost:3000/health
```

### Local Development with Self-Signed Certificate

```bash
# For local testing ONLY
podman run -d --name horreum-mcp-server \
  -p 3000:3000 \
  -e HORREUM_TLS_VERIFY=false \
  -e HTTP_MODE_ENABLED=true \
  -e HTTP_AUTH_TOKEN=test-token \
  -e HORREUM_BASE_URL=https://localhost:8080 \
  -e HORREUM_TOKEN=test-token \
  quay.io/redhat-performance/horreum-mcp:main

# Check logs for warning
podman logs horreum-mcp-server 2>&1 | grep -i "SSL"
# Should see: "SSL certificate verification is DISABLED. This should only be used for testing."
```

## Implementation Details

### Files Modified

1. **`src/config/env.ts`**: Added `HORREUM_TLS_VERIFY` environment variable
   with Zod validation
2. **`src/index.ts`**: Apply SSL configuration by setting
   `NODE_TLS_REJECT_UNAUTHORIZED` based on `HORREUM_TLS_VERIFY`
3. **`docker-entrypoint.sh`**: Automatically run `update-ca-trust` when CA
   certificates are detected
4. **`Containerfile`**: Added `update-ca-trust extract` to runtime stage

### Code Changes

See commits with tag: `feat: add SSL/TLS certificate configuration support`

## References

- [Node.js TLS/SSL Documentation](https://nodejs.org/api/tls.html)
- [UBI9 CA Trust Configuration](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/security_hardening/using-shared-system-certificates_security-hardening)
- [Horreum Documentation](https://horreum.hyperfoil.io/)
