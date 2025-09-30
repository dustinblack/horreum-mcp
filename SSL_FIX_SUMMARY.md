# SSL/TLS Configuration Fix Summary

## Critical Bug Fixed

### The Problem

The `HORREUM_TLS_VERIFY=false` environment variable was not working correctly due
to a bug in how Zod's `z.coerce.boolean()` parses string values.

**Root Cause**: Zod's `z.coerce.boolean()` converts ANY truthy string to
`true`:

```javascript
z.coerce.boolean().parse('false'); // Returns: true (WRONG!)
z.coerce.boolean().parse('0'); // Returns: true (WRONG!)
z.coerce.boolean().parse('no'); // Returns: true (WRONG!)
z.coerce.boolean().parse('invalid'); // Returns: true (WRONG!)
```

This meant users could **never** disable SSL verification, even when explicitly
setting `HORREUM_TLS_VERIFY=false`.

### The Solution

Replaced `z.coerce.boolean()` with a custom `.transform()` function that
correctly parses boolean strings:

```typescript
HORREUM_TLS_VERIFY: z.string()
  .optional()
  .default('true')
  .transform((val) => {
    const lower = val.toLowerCase();
    if (lower === 'false' || lower === '0' || lower === 'no' || lower === '') {
      return false;
    }
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true;
    }
    throw new Error(
      `HORREUM_TLS_VERIFY must be 'true' or 'false' (or 1/0, yes/no), got: ${val}`
    );
  });
```

### What Changed

1. **`src/config/env.ts`**: Custom boolean transform for `HORREUM_TLS_VERIFY`
2. **`src/index.ts`**: Enhanced logging to show both `HORREUM_TLS_VERIFY` and
   `NODE_TLS_REJECT_UNAUTHORIZED` values at startup
3. **`src/tests/ssl-config.test.ts`**: Comprehensive test suite (19 tests)
4. **`scripts/smoke-ssl-config.mjs`**: Manual smoke test script

### Testing

All 19 tests pass, covering:

- ✅ Default behavior (secure by default)
- ✅ String "false" → boolean `false`
- ✅ String "true" → boolean `true`
- ✅ Number "0" → boolean `false`
- ✅ Number "1" → boolean `true`
- ✅ String "no" → boolean `false`
- ✅ String "yes" → boolean `true`
- ✅ Case-insensitive ("FALSE", "True", etc.)
- ✅ Empty string → boolean `false`
- ✅ Invalid values → error thrown
- ✅ `NODE_TLS_REJECT_UNAUTHORIZED` correctly set/unset
- ✅ Security: defaults to secure mode

### How to Use

**Disable SSL verification (testing only):**

```bash
podman run -d --name horreum-mcp \
  -e HORREUM_TLS_VERIFY=false \
  -e HORREUM_BASE_URL=https://horreum.corp.example.com \
  -e HORREUM_TOKEN=your-token \
  quay.io/your-org/horreum-mcp:main
```

**Enable SSL verification (default, secure):**

```bash
podman run -d --name horreum-mcp \
  -e HORREUM_TLS_VERIFY=true \  # or omit entirely
  -e HORREUM_BASE_URL=https://horreum.corp.example.com \
  -e HORREUM_TOKEN=your-token \
  quay.io/your-org/horreum-mcp:main
```

**Mount CA certificates (production recommended):**

```bash
podman run -d --name horreum-mcp \
  --user=0 \
  -v /etc/pki/ca-trust/source/anchors/corporate-ca.crt:/etc/pki/ca-trust/source/anchors/corporate-ca.crt:ro \
  -e HORREUM_BASE_URL=https://horreum.corp.example.com \
  -e HORREUM_TOKEN=your-token \
  quay.io/your-org/horreum-mcp:main
```

### Verification

Check the logs at startup:

```bash
podman logs horreum-mcp 2>&1 | grep -A 3 "SSL/TLS configuration"
```

**Expected output when disabled:**

```json
{
  "level": "warn",
  "msg": "SSL certificate verification is DISABLED. This should only be used for testing.",
  "HORREUM_TLS_VERIFY": false,
  "NODE_TLS_REJECT_UNAUTHORIZED": "0"
}
```

**Expected output when enabled (default):**

```json
{
  "level": "info",
  "msg": "SSL certificate verification is ENABLED (default secure mode)",
  "HORREUM_TLS_VERIFY": true,
  "NODE_TLS_REJECT_UNAUTHORIZED": undefined
}
```

### Impact

- **Before**: Users could NOT disable SSL verification even with
  `HORREUM_TLS_VERIFY=false`
- **After**: Users can correctly disable SSL verification for testing or enable
  it for production

### Security

- **Secure by default**: Defaults to `true` (SSL verification enabled)
- **Explicit opt-out required**: Must explicitly set `HORREUM_TLS_VERIFY=false`
  to disable
- **Clear warnings**: Logs warning when SSL verification is disabled
- **Production guidance**: Documentation emphasizes mounting CA certs for
  production

## Related Files

- [SSL_CONFIGURATION.md](SSL_CONFIGURATION.md) - Full SSL/TLS configuration
  guide
- [README.md](README.md#ssltls-configuration) - Quick start SSL section
- [INTEGRATION_STATUS.md](INTEGRATION_STATUS.md) - Integration troubleshooting

## Commits

- `93f4597` - fix: correct HORREUM_TLS_VERIFY boolean parsing and add
  comprehensive tests
- `ab711b0` - feat: add SSL/TLS certificate configuration support
