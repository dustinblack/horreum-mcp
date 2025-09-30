# Horreum MCP Integration Status

## ✅ Phase 6 HTTP API Endpoints - **COMPLETE AND VERIFIED**

All requested HTTP POST endpoints have been implemented, tested, and **confirmed to be in the container image**.

### Verification

```bash
# Container was built at: 2025-09-30 (latest)
# Endpoints verified in container:
$ podman run --rm quay.io/redhat-performance/horreum-mcp:dev \
    grep -r "api/tools/horreum_list_tests" /app/build/
/app/build/index.js:  app.post("/api/tools/horreum_list_tests", ...
```

## Available HTTP POST Endpoints

All endpoints require **Bearer token authentication** via the `Authorization` header.

### 1. `/api/tools/horreum_list_tests`

**Request:**

```bash
curl -X POST http://localhost:3000/api/tools/horreum_list_tests \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10,
    "page": 1
  }'
```

### 2. `/api/tools/horreum_list_runs`

**Request:**

```bash
curl -X POST http://localhost:3000/api/tools/horreum_list_runs \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "test": "my-test-name",
    "limit": 10
  }'
```

### 3. `/api/tools/horreum_get_run`

**Request:**

```bash
curl -X POST http://localhost:3000/api/tools/horreum_get_run \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": 12345
  }'
```

### 4. `/api/tools/horreum_get_schema`

**Request:**

```bash
curl -X POST http://localhost:3000/api/tools/horreum_get_schema \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-schema"
  }'
```

### 5. `/api/tools/horreum_list_schemas`

**Request:**

```bash
curl -X POST http://localhost:3000/api/tools/horreum_list_schemas \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 6. `/api/tools/source.describe`

**Request:**

```bash
curl -X POST http://localhost:3000/api/tools/source.describe \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Common Issues and Solutions

### Issue: 404 Not Found

**Possible causes:**

1. **Missing Bearer token** - All `/api/tools/*` endpoints require authentication
2. **Old container running** - Restart the container to load the latest image
3. **Wrong HTTP method** - Use `POST`, not `GET`

**Solution:**

```bash
# 1. Stop old container
podman stop horreum-mcp-server

# 2. Remove old container
podman rm horreum-mcp-server

# 3. Run new container with authentication
podman run -d --name horreum-mcp-server \
  -p 3000:3000 \
  -e HTTP_MODE_ENABLED=true \
  -e HTTP_AUTH_TOKEN=your-secret-token \
  -e HORREUM_BASE_URL=https://horreum.corp.redhat.com \
  -e HORREUM_KEYCLOAK_TOKEN=your-keycloak-token \
  quay.io/redhat-performance/horreum-mcp:dev

# 4. Test the endpoint
curl -X POST http://localhost:3000/api/tools/source.describe \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Issue: 401 Unauthorized or 403 Forbidden

**Cause:** Missing or invalid `Authorization` header.

**Solution:**

- Ensure you set `HTTP_AUTH_TOKEN` when starting the container
- Include `Authorization: Bearer <token>` header in all requests
- The token in the header must match the `HTTP_AUTH_TOKEN` env var

### Issue: SSL Certificate Error

**Symptom:**

```
ERROR: fetch failed: unable to get local issuer certificate
```

**Cause:** Container doesn't trust corporate CA certificates when connecting to
`https://horreum.corp.redhat.com`.

**Solution 1: Mount CA Certificate (Recommended for Production)**

Mount your corporate CA certificate bundle into the container:

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
  -e HORREUM_BASE_URL=https://horreum.corp.redhat.com \
  -e HORREUM_TOKEN=your-keycloak-token \
  quay.io/redhat-performance/horreum-mcp:dev
```

**Note:** The container entrypoint will automatically run `update-ca-trust`
when it detects mounted certificates (requires `--user=0`).

**Solution 2: Disable SSL Verification (Testing Only)**

For **testing only**, bypass SSL verification:

```bash
podman run -d --name horreum-mcp-server \
  -p 3000:3000 \
  -e HORREUM_TLS_VERIFY=false \
  -e HTTP_MODE_ENABLED=true \
  -e HTTP_AUTH_TOKEN=your-secret-token \
  -e HORREUM_BASE_URL=https://horreum.corp.redhat.com \
  -e HORREUM_TOKEN=your-keycloak-token \
  quay.io/redhat-performance/horreum-mcp:dev
```

⚠️ **WARNING:** `HORREUM_TLS_VERIFY=false` disables all SSL verification and
should **NEVER** be used in production.

**Solution 3: Use HTTP (if available)**

If your Horreum instance supports HTTP:

```bash
-e HORREUM_BASE_URL=http://horreum.corp.redhat.com
```

## Testing Checklist

- [ ] Container is running the **latest** image (`quay.io/redhat-performance/horreum-mcp:dev`)
- [ ] Environment variable `HTTP_MODE_ENABLED=true` is set
- [ ] Environment variable `HTTP_AUTH_TOKEN` is set to a secret value
- [ ] All requests include `Authorization: Bearer <token>` header
- [ ] All requests use `POST` method
- [ ] All requests include `Content-Type: application/json` header
- [ ] Request body is valid JSON

## Documentation

- **Time Range Filtering**: See `docs/TIME_RANGE_FILTERING.md`
- **Full Requirements**: See `docs/horreum-mcp-requirements.md` (if in external repo)
- **Source MCP Contract**: Standardized errors, pagination with `pageToken`/`pageSize`
- **Architecture**: See `README.md`

## Contact

If endpoints are still returning 404 after following this guide, please provide:

1. Container logs: `podman logs horreum-mcp-server`
2. Exact curl command being used (redact sensitive tokens)
3. Full error response
4. Container image tag: `podman inspect horreum-mcp-server | grep quay.io`
