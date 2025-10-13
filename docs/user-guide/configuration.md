# Configuration Guide

Complete reference for configuring the Horreum MCP Server.

## Environment Variables

The Horreum MCP Server is configured entirely through environment variables.
This guide covers all available configuration options organized by category.

### Horreum Connection (Required)

These variables configure the connection to your Horreum instance:

| Variable             | Required | Default | Description                          |
| -------------------- | -------- | ------- | ------------------------------------ |
| `HORREUM_BASE_URL`   | **Yes**  | -       | Base URL of your Horreum instance    |
| `HORREUM_TOKEN`      | No\*     | -       | API token for authentication         |
| `HORREUM_RATE_LIMIT` | No       | `10`    | Client-side rate limit (req/sec)     |
| `HORREUM_TIMEOUT`    | No       | `30000` | Per-request timeout (milliseconds)   |
| `HORREUM_TLS_VERIFY` | No       | `true`  | Enable/disable TLS certificate check |

\* `HORREUM_TOKEN` is required for write operations and accessing private data.
For read-only access to public data, it may be optional depending on your
Horreum instance configuration.

**Example:**

```bash
export HORREUM_BASE_URL=https://horreum.example.com
export HORREUM_TOKEN=horreum_api_abc123xyz
export HORREUM_RATE_LIMIT=20
export HORREUM_TIMEOUT=60000
```

### HTTP Server Mode

Configure the server to run as a persistent HTTP service instead of stdio mode:

| Variable            | Required | Default   | Description                            |
| ------------------- | -------- | --------- | -------------------------------------- |
| `HTTP_MODE_ENABLED` | No       | `false`   | Enable HTTP server mode                |
| `HTTP_PORT`         | No       | `3000`    | Port for HTTP server                   |
| `HTTP_AUTH_TOKEN`   | No       | -         | Bearer token for API authentication    |
| `CORS_ORIGINS`      | No       | `*`       | Allowed CORS origins (comma-separated) |
| `SESSION_TIMEOUT`   | No       | `3600000` | Session timeout (ms, 1 hour default)   |
| `MAX_SESSIONS`      | No       | `1000`    | Maximum concurrent sessions            |

**Example:**

```bash
export HTTP_MODE_ENABLED=true
export HTTP_PORT=3000
export HTTP_AUTH_TOKEN=your_secure_token_here
export CORS_ORIGINS=https://app1.example.com,https://app2.example.com
```

### LLM Integration (Phase 9)

Configure LLM provider for natural language query endpoint (`/api/query`):

| Variable               | Required | Default | Description                                            |
| ---------------------- | -------- | ------- | ------------------------------------------------------ |
| `LLM_PROVIDER`         | No\*     | -       | LLM provider: `openai`, `anthropic`, `gemini`, `azure` |
| `LLM_API_KEY`          | No\*     | -       | API key for LLM provider                               |
| `LLM_MODEL`            | No\*     | -       | Model name (provider-specific)                         |
| `LLM_GEMINI_ENDPOINT`  | No\*\*   | -       | Custom Gemini API endpoint (corporate)                 |
| `LLM_GEMINI_PROJECT`   | No\*\*   | -       | Google Cloud Project ID for Gemini                     |
| `LLM_AZURE_ENDPOINT`   | No\*\*\* | -       | Azure OpenAI endpoint URL                              |
| `LLM_AZURE_DEPLOYMENT` | No\*\*\* | -       | Azure OpenAI deployment name                           |

\* All three (`LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`) are required to
enable the natural language query endpoint. If not configured, the `/api/query`
endpoint will return a 503 error.

\*\* Optional. Use for corporate/private Gemini instances. `LLM_GEMINI_ENDPOINT`
defaults to public Google Gemini API
(`https://generativelanguage.googleapis.com/v1beta`). `LLM_GEMINI_PROJECT` is
required for some corporate Gemini deployments (e.g., Vertex AI) to specify
billing and quota management.

\*\*\* Required only when `LLM_PROVIDER=azure`.

**Example (OpenAI):**

```bash
export LLM_PROVIDER=openai
export LLM_API_KEY=sk-proj-...
export LLM_MODEL=gpt-5
```

**Example (Anthropic):**

```bash
export LLM_PROVIDER=anthropic
export LLM_API_KEY=sk-ant-...
export LLM_MODEL=claude-4-5-sonnet-20241022
```

**Example (Google Gemini - Public):**

```bash
export LLM_PROVIDER=gemini
export LLM_API_KEY=AIza...
export LLM_MODEL=gemini-2.5-pro
```

**Example (Google Gemini - Corporate Instance):**

```bash
export LLM_PROVIDER=gemini
export LLM_API_KEY=your-corporate-api-key
export LLM_MODEL=gemini-2.5-pro
export LLM_GEMINI_ENDPOINT=https://gemini-api.corp.example.com/v1beta
export LLM_GEMINI_PROJECT=your-gcp-project-id
```

> [!NOTE]
> For corporate Gemini instances, consult your IT department for the correct
> `LLM_GEMINI_ENDPOINT`, `LLM_GEMINI_PROJECT`, and API key format. The endpoint
> should typically end with `/v1beta` to match the Gemini API structure. The
> project ID is used for billing and quota management and is passed via the
> `x-goog-user-project` header.

**Example (Azure OpenAI):**

```bash
export LLM_PROVIDER=azure
export LLM_API_KEY=your-azure-key
export LLM_MODEL=gpt-5
export LLM_AZURE_ENDPOINT=https://your-resource.openai.azure.com
export LLM_AZURE_DEPLOYMENT=your-deployment-name
```

See [Natural Language Queries Guide](natural-language-queries.md) for complete
usage documentation.

### Logging and Observability

Control logging, metrics, and tracing behavior:

| Variable          | Required | Default | Description                                                   |
| ----------------- | -------- | ------- | ------------------------------------------------------------- |
| `LOG_LEVEL`       | No       | `info`  | Log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `METRICS_ENABLED` | No       | `true`  | Enable Prometheus metrics endpoint                            |
| `METRICS_PORT`    | No       | `9090`  | Port for Prometheus metrics (`/metrics`)                      |
| `TRACING_ENABLED` | No       | `false` | Enable OpenTelemetry tracing                                  |

**Example:**

```bash
export LOG_LEVEL=debug
export METRICS_ENABLED=true
export METRICS_PORT=9090
export TRACING_ENABLED=true
```

See [Observability Guide](observability.md) for detailed monitoring setup.

### SSL/TLS Configuration

Handle SSL certificates for Horreum connections:

| Variable              | Required | Default | Description              |
| --------------------- | -------- | ------- | ------------------------ |
| `HORREUM_TLS_VERIFY`  | No       | `true`  | Verify SSL certificates  |
| `NODE_EXTRA_CA_CERTS` | No       | -       | Path to custom CA bundle |

**For corporate or self-signed certificates**, you have two options:

**Option 1: Provide CA bundle (recommended)**

```bash
export NODE_EXTRA_CA_CERTS=/path/to/ca-bundle.crt
export HORREUM_BASE_URL=https://horreum.corp.example.com
```

**Option 2: Disable verification (not recommended for production)**

```bash
export HORREUM_TLS_VERIFY=false
export HORREUM_BASE_URL=https://horreum.corp.example.com
```

See [SSL/TLS Configuration Guide](../deployment/ssl-tls.md) for detailed
certificate setup.

## Configuration Files

### `.env` File

For local development, create a `.env` file in the project root:

```bash
# Horreum connection
HORREUM_BASE_URL=https://horreum.example.com
HORREUM_TOKEN=your_token_here

# HTTP mode
HTTP_MODE_ENABLED=true
HTTP_PORT=3000
HTTP_AUTH_TOKEN=changeme

# LLM integration
LLM_PROVIDER=gemini
LLM_API_KEY=your_gemini_key
LLM_MODEL=gemini-2.5-pro

# Logging
LOG_LEVEL=debug
METRICS_ENABLED=true
TRACING_ENABLED=false
```

The server automatically loads `.env` files in development mode.

### MCP Client Configuration

When using MCP clients (Claude Desktop, Cursor, etc.), configure via their
settings files:

**Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):**

```json
{
  "mcpServers": {
    "horreum": {
      "command": "node",
      "args": ["/path/to/horreum-mcp/build/index.js"],
      "env": {
        "HORREUM_BASE_URL": "https://horreum.example.com",
        "HORREUM_TOKEN": "your_token_here",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Cursor (`.cursorrules` or project settings):**

```json
{
  "mcp": {
    "horreum": {
      "command": "node",
      "args": ["/path/to/horreum-mcp/build/index.js"],
      "env": {
        "HORREUM_BASE_URL": "https://horreum.example.com",
        "HORREUM_TOKEN": "your_token_here"
      }
    }
  }
}
```

See [AI Client Configuration Guide](ai-clients.md) for complete client-specific
setup instructions.

## Container Deployment

### Docker/Podman

Pass environment variables using `-e` flags:

```bash
podman run -d --name horreum-mcp \
  -p 127.0.0.1:3000:3000 \
  -e HORREUM_BASE_URL=https://horreum.example.com \
  -e HORREUM_TOKEN=your_token \
  -e HTTP_MODE_ENABLED=true \
  -e HTTP_PORT=3000 \
  -e HTTP_AUTH_TOKEN=changeme \
  -e LLM_PROVIDER=gemini \
  -e LLM_API_KEY=your_key \
  -e LLM_MODEL=gemini-2.5-pro \
  -e LOG_LEVEL=info \
  quay.io/redhat-performance/horreum-mcp:main
```

### Kubernetes/OpenShift

Use ConfigMaps for non-sensitive data and Secrets for tokens:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: horreum-mcp-config
data:
  HORREUM_BASE_URL: 'https://horreum.example.com'
  HTTP_MODE_ENABLED: 'true'
  HTTP_PORT: '3000'
  LLM_PROVIDER: 'gemini'
  LLM_MODEL: 'gemini-2.5-pro'
  LOG_LEVEL: 'info'
  METRICS_ENABLED: 'true'
  METRICS_PORT: '9090'
---
apiVersion: v1
kind: Secret
metadata:
  name: horreum-mcp-secrets
type: Opaque
stringData:
  HORREUM_TOKEN: 'your_horreum_token'
  HTTP_AUTH_TOKEN: 'your_http_auth_token'
  LLM_API_KEY: 'your_llm_api_key'
```

See [Kubernetes Deployment Guide](../deployment/kubernetes-deployment.md) for
complete manifests and best practices.

## Configuration Validation

The server validates required configuration on startup. If configuration is
invalid, it will fail with a clear error message:

```
Error: Missing required environment variable: HORREUM_BASE_URL
Error: Invalid LLM_PROVIDER: must be one of: openai, anthropic, gemini, azure
Error: LLM_AZURE_ENDPOINT is required when LLM_PROVIDER=azure
```

## Environment-Specific Configurations

### Development

```bash
# Minimal configuration for local development
HORREUM_BASE_URL=http://localhost:8080
LOG_LEVEL=debug
METRICS_ENABLED=false
TRACING_ENABLED=false
```

### Staging

```bash
# Staging environment with monitoring
HORREUM_BASE_URL=https://horreum-staging.example.com
HORREUM_TOKEN=staging_token
HTTP_MODE_ENABLED=true
HTTP_PORT=3000
HTTP_AUTH_TOKEN=staging_auth_token
LLM_PROVIDER=gemini
LLM_API_KEY=staging_gemini_key
LLM_MODEL=gemini-2.5-flash  # Use faster model for staging
LOG_LEVEL=info
METRICS_ENABLED=true
TRACING_ENABLED=true
```

### Production

```bash
# Production configuration with full observability
HORREUM_BASE_URL=https://horreum.example.com
HORREUM_TOKEN=prod_token
HORREUM_RATE_LIMIT=20
HORREUM_TIMEOUT=60000
HTTP_MODE_ENABLED=true
HTTP_PORT=3000
HTTP_AUTH_TOKEN=prod_secure_token
CORS_ORIGINS=https://app.example.com
LLM_PROVIDER=gemini
LLM_API_KEY=prod_gemini_key
LLM_MODEL=gemini-2.5-pro
LOG_LEVEL=info
METRICS_ENABLED=true
METRICS_PORT=9090
TRACING_ENABLED=true
SESSION_TIMEOUT=7200000  # 2 hours
MAX_SESSIONS=5000
```

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use secrets management** (Vault, AWS Secrets Manager, Kubernetes Secrets)
3. **Rotate tokens regularly** especially `HORREUM_TOKEN`, `HTTP_AUTH_TOKEN`, and `LLM_API_KEY`
4. **Limit CORS origins** in production (avoid `*`)
5. **Enable TLS verification** (`HORREUM_TLS_VERIFY=true`)
6. **Use strong authentication tokens** (minimum 32 characters, random)
7. **Monitor API usage** through metrics and logs
8. **Set appropriate rate limits** to prevent abuse

## Troubleshooting

### Connection Issues

If you see connection errors to Horreum:

1. Verify `HORREUM_BASE_URL` is correct and accessible
2. Check `HORREUM_TOKEN` is valid and has required permissions
3. For SSL errors, see [SSL/TLS Configuration](../deployment/ssl-tls.md)

### LLM Endpoint Not Available

If `/api/query` returns 503:

1. Verify all three LLM variables are set: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`
2. Check API key is valid for the provider
3. For Azure, ensure `LLM_AZURE_ENDPOINT` and `LLM_AZURE_DEPLOYMENT` are set
4. Review logs for LLM initialization errors

### Performance Issues

If experiencing slow responses:

1. Increase `HORREUM_RATE_LIMIT` if hitting rate limits
2. Increase `HORREUM_TIMEOUT` for slow Horreum instances
3. Adjust `SESSION_TIMEOUT` and `MAX_SESSIONS` for load
4. Enable tracing (`TRACING_ENABLED=true`) to identify bottlenecks

See [Troubleshooting Guide](../troubleshooting/README.md) for more solutions.

## Related Documentation

- [Natural Language Queries](natural-language-queries.md) - Using the LLM endpoint
- [AI Client Configuration](ai-clients.md) - Connecting AI clients
- [Observability](observability.md) - Monitoring and logging
- [SSL/TLS Configuration](../deployment/ssl-tls.md) - Certificate setup
- [Kubernetes Deployment](../deployment/kubernetes-deployment.md) - K8s manifests
