# Horreum MCP Server

A **Source MCP adapter** that provides standardized access to
[Horreum](https://horreum.hyperfoil.io/) performance testing databases for
Domain-specific MCP servers and AI assistants.

## Primary Purpose: Source MCP Adapter

**Horreum MCP is designed to be a Source MCP** - an abstraction layer that
Domain MCP servers use to access Horreum data. This architecture enables:

- **Domain experts** to build specialized AI assistants without Horreum API
  expertise
- **Standardized interface** through the Source MCP Contract
- **Multiple domains** (boot time, network performance, memory analysis) to
  share one Source
- **Flexibility** to swap data sources without changing Domain MCP code

```mermaid
graph LR
    AI["AI Assistant"] --> Domain["Domain MCP<br/>(performance analysis)"]
    Domain --> Source["Source MCP<br/>(Horreum)"]
    Source --> DB["Horreum DB"]

    style AI fill:#e1f5ff,stroke:#01579b,stroke-width:2px,color:#000
    style Domain fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px,color:#000
    style Source fill:#fff9c4,stroke:#f57f17,stroke-width:2px,color:#000
    style DB fill:#ffccbc,stroke:#bf360c,stroke-width:2px,color:#000
```

See [Domain MCP Integration Guide](docs/architecture/domain-mcp-integration.md)
for complete details on building Domain MCPs.

## Standalone Usage

While designed primarily as a Source MCP, it can also be used standalone by
users familiar with Horreum's architecture:

- 🔍 **Query performance data** from Horreum instances
- 📊 **Filter and paginate** test results with built-in tools
- 🗣️ **Natural language time queries** - Use "last week" instead of timestamps
- 🚀 **Upload test runs** and manage testing workflows
- 📈 **Access schemas** and test configurations

## Quick Start

Choose your preferred way to get started:

### 🐳 **Use Pre-built Container (Recommended)**

```bash
# Run the server with HTTP mode enabled
podman run --rm -p 127.0.0.1:3000:3000 \
  -e HORREUM_BASE_URL=https://horreum.example.com \
  -e HTTP_MODE_ENABLED=true \
  -e HTTP_AUTH_TOKEN=changeme \
  quay.io/redhat-performance/horreum-mcp:main

# Test it works
curl -H 'Authorization: Bearer changeme' http://localhost:3000/health
```

#### SSL/TLS Configuration

For **corporate** or **self-signed SSL certificates**, choose one option:

**Option 1: Mount CA Certificate (Recommended for Production)**

```bash
# Find your corporate CA bundle (common locations):
# - /etc/pki/ca-trust/source/anchors/
# - /etc/ssl/certs/ca-bundle.crt
# - /usr/local/share/ca-certificates/

podman run --rm -p 127.0.0.1:3000:3000 \
  --user=0 \
  -v /path/to/your/ca-bundle.crt:/etc/pki/ca-trust/source/anchors/corporate-ca.crt:ro \
  -e HORREUM_BASE_URL=https://horreum.corp.example.com \
  -e HTTP_MODE_ENABLED=true \
  -e HTTP_AUTH_TOKEN=changeme \
  quay.io/redhat-performance/horreum-mcp:main
```

The entrypoint will automatically run `update-ca-trust` when CA
certificates are detected.

**Option 2: Disable SSL Verification (Testing Only)**

```bash
podman run --rm -p 127.0.0.1:3000:3000 \
  -e HORREUM_TLS_VERIFY=false \
  -e HORREUM_BASE_URL=https://horreum.corp.example.com \
  -e HTTP_MODE_ENABLED=true \
  -e HTTP_AUTH_TOKEN=changeme \
  quay.io/redhat-performance/horreum-mcp:main
```

> [!WARNING]
> `HORREUM_TLS_VERIFY=false` disables all SSL verification and should
> **NEVER** be used in production.

### 🔧 **Development Setup**

**Prerequisites:** Node.js v20+, npm

```bash
# 1. Clone and setup
git clone https://github.com/dustinblack/horreum-mcp.git
cd horreum-mcp
npm ci
npm run build

# 2. Configure environment
cp .env.example .env
# Edit .env with your Horreum instance details

# 3. Run the server
npm start -- --log-level info
```

## Documentation

Complete documentation is available in the [`docs/`](docs/) directory:

- **[User Guide](docs/user-guide/README.md)** - Installation, configuration, and usage
- **[Developer Guide](docs/developer/README.md)** - Contributing and CI/CD
- **[Deployment](docs/deployment/README.md)** - Kubernetes, SSL/TLS, and production setup
- **[Architecture](docs/architecture/README.md)** - Technical design and contracts
- **[Troubleshooting](docs/troubleshooting/README.md)** - Common issues and solutions

See the [documentation index](docs/README.md) for a complete overview.

## Development Status

**Phase 6 Complete** - Server-to-server integration with Source MCP Contract compliance:

- ✅ **Core MCP Tools**: `ping`, `list_tests`, `list_runs`, `get_schema`, `upload_run`,
  `source.describe`
- ✅ **Direct HTTP API**: 5 POST endpoints for server-to-server integration
- ✅ **1-Based Pagination**: Aligned with Horreum's native pagination model (first page is 1)
- ✅ **Error Handling**: Standardized Source MCP Contract error responses with snake_case
- ✅ **Capability Discovery**: Runtime capability introspection via `source.describe`
- ✅ **Dual Transport**: stdio (default) and HTTP server modes with Bearer auth
- ✅ **Multi-Architecture**: AMD64 and ARM64 container support
- ✅ **Production Ready**: Structured logging, metrics, tracing, security
- 📚 **Documented**: Comprehensive time range filtering and API documentation
- 🚀 **Next Phase**: Enhanced CI/CD and security scanning

## Features

### Core Tools

- **`ping`**: Simple connectivity check and health monitoring
- **`list_tests`**: Browse tests with pagination and filtering support
- **`get_schema`**: Retrieve schema definitions by ID or name
- **`list_runs`**: Query test runs with sorting and time-based filtering (see
  [Time Range Filtering](docs/TIME_RANGE_FILTERING.md) for details)
- **`upload_run`**: Submit new test run data to Horreum
- **`source.describe`**: Runtime capability discovery for integration (returns
  sourceType, version, capabilities, limits)
- **`get_run`**: Extended run details by ID
- **`get_run_data`**: Raw run payload (optional `schema_uri`)
- **`get_run_metadata`**: Run metadata only (optional `schema_uri`)
- **`get_run_summary`**: Lightweight run summary
- **`list_runs_by_schema`**: Runs filtered by schema URI (1-based pagination)
- **`get_run_count`**: Run count summary for a test
- **`list_all_runs`**: Global run search with natural language time
- **`get_dataset_summary`**: Dataset summary (optional `view_id`)
- **`get_run_label_values`**: Label values for a specific run with filtering
- **`get_test_label_values`**: Aggregated label values across a test with time
  boundaries (natural language supported)
- **`get_dataset_label_values`**: Label values for a specific dataset

### MCP Resources

In addition to tools, the server exposes key resources as URIs:

- `horreum://tests/{id}` - Individual test configurations
- `horreum://schemas/{id}` - Schema definitions
- `horreum://tests/{testId}/runs/{runId}` - Specific test run data

### Transport Modes

- **Stdio Mode** (default): Direct process integration with local AI clients
- **HTTP/POST** (`/mcp`): POST-based JSON-RPC transport (can stream via SSE when
  supported by client)
- **Direct REST API** (`/api/tools/*`): Simplified server-to-server integration
  for Domain MCP servers

> [!NOTE]
> **Architecture Note:** Current implementation uses `StreamableHTTPServerTransport`
> at a single POST endpoint (`/mcp`) with content negotiation. An alternative
> architecture separates SSE (GET `/sse`) and HTTP (POST `/message`) transports
> into distinct endpoints, providing clearer client selection and better MCP spec
> alignment. This may be considered for future enhancement.

### Production Features

- **Observability**: Structured logging (Pino), Prometheus metrics, OpenTelemetry tracing
- **Security**: Bearer token authentication, CORS support, rate limiting
- **Reliability**: Automatic retries with exponential backoff, session management

## Architecture

### System Overview

The Horreum MCP Server provides a comprehensive bridge between AI clients and Horreum performance testing instances with full observability and multiple transport modes:

```mermaid
graph TB
    subgraph "AI Client Environment"
        AI[AI Client<br/>Claude/Cursor/etc<br/>✅ IMPLEMENTED]
    end

    subgraph "MCP Server Modes"
        direction TB
        MCP[Horreum MCP Server<br/>✅ IMPLEMENTED]

        subgraph "Transport Options"
            STDIO[Stdio Transport<br/>✅ DEFAULT]
            HTTP[HTTP Transport<br/>✅ IMPLEMENTED]
        end

        MCP --> STDIO
        MCP --> HTTP
    end

    subgraph "External Services"
        direction TB
        HORREUM[Horreum Instance<br/>Performance Testing<br/>✅ INTEGRATED]
        LLM[LLM APIs<br/>OpenAI/Anthropic/Azure<br/>✅ IMPLEMENTED]
    end

    subgraph "Observability Stack"
        direction TB
        PROM[Prometheus Metrics<br/>✅ IMPLEMENTED]
        OTEL[OpenTelemetry Tracing<br/>✅ IMPLEMENTED]
        LOGS[Structured Logging<br/>✅ IMPLEMENTED]
    end

    AI -->|stdio/spawn| STDIO
    AI -->|HTTP requests| HTTP
    MCP -->|API calls| HORREUM
    HTTP -->|inference| LLM
    MCP --> PROM
    MCP --> OTEL
    MCP --> LOGS

    classDef implemented fill:#c8e6c9,stroke:#4caf50,stroke-width:2px,color:#000000
    classDef planned fill:#fff3e0,stroke:#ff9800,stroke-width:2px,stroke-dasharray: 5 5,color:#000000
    classDef external fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px,color:#000000

    subgraph "Direct HTTP API"
        direction TB
        HTTPAPI[HTTP Tool Endpoints<br/>✅ PHASE 6]
    end

    HTTP --> HTTPAPI
    HTTPAPI -->|"POST /api/tools/*"| HORREUM

    class AI,STDIO,MCP,HORREUM,PROM,OTEL,LOGS,HTTP,LLM,HTTPAPI implemented

    %% Future Enhancements (Phase 7+)
    subgraph "Enterprise Features 🚧"
        direction TB
        PLUGIN[Plugin Architecture<br/>🚧 PHASE 8]
    end

    MCP -.->|"Future"| PLUGIN

    class PLUGIN planned

    %% Legend
    subgraph Legend[" "]
        L1[✅ Implemented - Phase 1-6 Complete]
        L2[🚧 Planned - Phase 7+ Roadmap]
        L3[🔗 External - Third-party Services]
    end

    class L1 implemented
    class L2 planned
    class L3 external
```

### Request Flow - Stdio Mode

```mermaid
sequenceDiagram
    participant AI as AI Client<br/>✅ Working
    participant MCP as MCP Server<br/>✅ Phase 1-5 Complete
    participant H as Horreum API<br/>✅ Integrated
    participant OBS as Observability<br/>✅ Full Stack

    AI->>MCP: spawn process (stdio)
    MCP->>MCP: initialize transport
    MCP->>AI: capabilities & tools

    AI->>MCP: tool call (e.g., list_tests)
    MCP->>OBS: log start + correlation ID
    MCP->>OBS: start span
    MCP->>H: HTTP request (rate limited)
    H-->>MCP: response data
    MCP->>OBS: record metrics
    MCP->>OBS: end span
    MCP->>OBS: log completion
    MCP-->>AI: tool response

    Note over MCP,H: ✅ Retries & backoff implemented
    Note over MCP,OBS: ✅ Correlation IDs across all logs
    Note over AI,OBS: ✅ All components fully operational
```

### Request Flow - HTTP Mode

```mermaid
sequenceDiagram
    participant CLIENT as HTTP Client<br/>✅ Ready
    participant MCP as MCP Server<br/>✅ HTTP Transport Ready
    participant LLM as LLM API<br/>✅ Integrated
    participant H as Horreum API<br/>✅ Integrated
    participant OBS as Observability<br/>✅ Full Stack

    CLIENT->>MCP: POST /mcp (initialize)
    MCP->>MCP: create session + UUID
    MCP->>OBS: log session start
    MCP-->>CLIENT: session ID + capabilities

    CLIENT->>MCP: POST /mcp (tool call + session ID)
    MCP->>OBS: log start + correlation ID
    MCP->>OBS: start span

    alt Tool requires LLM inference
        MCP->>LLM: API request (configurable provider)
        LLM-->>MCP: inference result
    end

    MCP->>H: HTTP request (rate limited)
    H-->>MCP: Horreum data
    MCP->>OBS: record metrics
    MCP->>OBS: end span
    MCP->>OBS: log completion
    MCP-->>CLIENT: JSON response or SSE stream

    Note over CLIENT,MCP: ✅ CORS, Bearer auth supported
    Note over MCP,LLM: ✅ Multi-provider support (OpenAI, Anthropic, Azure)
    Note over MCP,H: ✅ Same rate limiting & retry logic
    Note over MCP,OBS: ✅ Same observability stack
```

### Component Architecture

```mermaid
graph TB
    subgraph "MCP Server Core ✅"
        direction TB
        ENTRY[Entry Point<br/>index.ts<br/>✅ IMPLEMENTED]
        TOOLS[Tool Registry<br/>server/tools.ts<br/>✅ IMPLEMENTED]
        ENV[Environment Config<br/>config/env.ts<br/>✅ IMPLEMENTED]
    end

    subgraph "Transport Layer ✅"
        direction TB
        STDIO_T[StdioServerTransport<br/>✅ DEFAULT]
        HTTP_T[StreamableHTTPServerTransport<br/>+ Express.js<br/>✅ IMPLEMENTED]
    end

    subgraph "Horreum Integration ✅"
        direction TB
        CLIENT[Generated OpenAPI Client<br/>✅ IMPLEMENTED]
        FETCH[Rate-Limited Fetch<br/>+ Retries/Backoff<br/>✅ IMPLEMENTED]
    end

    subgraph "LLM Integration ✅"
        direction TB
        LLM_CLIENT[Configurable LLM Client<br/>✅ IMPLEMENTED]
        PROVIDERS[OpenAI / Anthropic / Azure<br/>✅ IMPLEMENTED]
    end

    subgraph "Observability ✅"
        direction TB
        METRICS[Prometheus Metrics<br/>metrics.ts<br/>✅ IMPLEMENTED]
        TRACING[OpenTelemetry<br/>tracing.ts<br/>✅ IMPLEMENTED]
        LOGGING[Pino Structured Logs<br/>✅ IMPLEMENTED]
    end

    ENTRY --> ENV
    ENTRY --> TOOLS
    ENTRY --> STDIO_T
    ENTRY --> HTTP_T
    TOOLS --> CLIENT
    CLIENT --> FETCH
    HTTP_T --> LLM_CLIENT
    LLM_CLIENT --> PROVIDERS
    TOOLS --> METRICS
    TOOLS --> TRACING
    TOOLS --> LOGGING

    classDef implemented fill:#c8e6c9,stroke:#4caf50,stroke-width:2px,color:#000000
    classDef planned fill:#fff3e0,stroke:#ff9800,stroke-width:2px,stroke-dasharray: 5 5,color:#000000

    class ENTRY,TOOLS,ENV,STDIO_T,CLIENT,FETCH,METRICS,TRACING,LOGGING,HTTP_T,LLM_CLIENT,PROVIDERS implemented

    %% Implementation Status
    subgraph Status[" "]
        S1[✅ Implemented & Tested]
        S2[🚧 Phase 6+ Development]
    end

    class S1 implemented
    class S2 planned
```

### Key Components

- **Transport Layer**: Supports both stdio (default) and HTTP server modes
- **Horreum Integration**: Generated OpenAPI client with rate limiting and retries
- **LLM Integration**: Multi-provider support (OpenAI, Anthropic, Azure)
- **Observability**: Comprehensive logging, metrics, and tracing with correlation IDs
- **Security**: Bearer token authentication, CORS, and session management

## Configuration

The server is configured using environment variables. Create a `.env` file for
local development:

```bash
# Required - Your Horreum instance
HORREUM_BASE_URL=https://horreum.example.com
HORREUM_TOKEN=your-api-token

# Optional - Performance tuning
HORREUM_RATE_LIMIT=10
HORREUM_TIMEOUT=30000

# Optional - HTTP mode (for persistent server)
HTTP_MODE_ENABLED=false
HTTP_PORT=3000
HTTP_AUTH_TOKEN=changeme

# Optional - Observability
LOG_LEVEL=info
METRICS_ENABLED=false
TRACING_ENABLED=false
```

### Key Configuration Options

| Variable             | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `HORREUM_BASE_URL`   | **Required.** Base URL of your Horreum instance                   |
| `HORREUM_TOKEN`      | **Conditional.** API token (required for writes/private data)     |
| `HORREUM_RATE_LIMIT` | Client-side rate limit in requests per second (default: 10)       |
| `HORREUM_TIMEOUT`    | Per-request timeout in milliseconds (default: 30000)              |
| `HTTP_MODE_ENABLED`  | Enable HTTP server mode (default: stdio)                          |
| `HTTP_PORT`          | HTTP server port (default: 3000)                                  |
| `HTTP_AUTH_TOKEN`    | Secure your HTTP endpoints                                        |
| `LOG_LEVEL`          | Logging verbosity (`trace`,`debug`,`info`,`warn`,`error`,`fatal`) |
| `LOG_FORMAT`         | Log output format (`json` or `pretty`)                            |
| `METRICS_ENABLED`    | Enable Prometheus metrics endpoint (default: false)               |
| `METRICS_PORT`       | Port for metrics endpoint (default: 9464)                         |
| `TRACING_ENABLED`    | Enable OpenTelemetry tracing (default: false)                     |

> [!NOTE]
> When using with AI clients, these variables are typically configured in the client's MCP server settings rather than a local `.env` file.

## Deployment

### Multi-Architecture Support

The container images support both AMD64 and ARM64 architectures with automatic
QEMU emulation detection. When running under emulation, the container
automatically applies compatibility flags to prevent WebAssembly-related crashes
while preserving performance on native architectures.

### Production Deployment

For production or shared environments, see the [Quick Start](#quick-start)
section above for container deployment examples.

### Kubernetes/OpenShift Deployment

For production Kubernetes or OpenShift deployments with high availability and
persistent HTTP mode, see the complete
[Kubernetes Deployment Guide](docs/deployment/kubernetes-deployment.md).

The guide includes:

- Complete deployment manifests (Deployment, Service, Ingress, ConfigMap, Secret)
- OpenShift-specific configuration (Routes, SCCs, CA certificate mounting)
- High availability setup with multiple replicas and health checks
- Monitoring integration (Prometheus ServiceMonitor)
- Advanced scenarios (Helm, Kustomize, HPA, Network Policies)
- Comprehensive troubleshooting and security best practices

### Local Development

For testing and development:

```bash
# Start in stdio mode (for AI client testing)
npm start -- --log-level debug

# Or start in HTTP mode (for API testing)
HTTP_MODE_ENABLED=true npm start
```

## Integration

### Domain MCP Integration (Recommended)

**Primary use case:** Connect Domain MCP servers to Horreum MCP for data access.

Deploy Horreum MCP in HTTP mode (see [Quick Start](#quick-start)) and use the
Direct REST API endpoints from your Domain MCP:

```bash
# From your Domain MCP server
curl -X POST http://horreum-mcp:3000/api/tools/horreum_get_test_label_values \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "123",
    "from": "last 30 days",
    "include": ["cpu_usage", "memory_used"]
  }'
```

See [Domain MCP Integration Guide](docs/architecture/domain-mcp-integration.md)
for complete details on building Domain MCPs.

### AI Client Configuration (Standalone Usage)

For direct AI assistant integration (standalone mode), see the complete
**[AI Client Configuration Guide](docs/user-guide/ai-clients.md)** with
detailed setup instructions:

| Client                  | Direct HTTP | HTTP (mcp-remote) | STDIO       | Notes                   |
| ----------------------- | ----------- | ----------------- | ----------- | ----------------------- |
| **Claude Desktop/Code** | ❓ Untested | ✅ Verified       | ✅ Verified | Universal compatibility |
| **Cursor**              | ✅ Verified | ✅ Verified       | ✅ Verified | All methods work        |
| **Gemini CLI**          | ✅ Verified | ✅ Verified       | ✅ Verified | Use interactive mode    |
| **Cline**               | 🧪 Untested | 🧪 Untested       | 🧪 Untested | VS Code extension       |

**Connection Methods (all supported):**

1. **Direct HTTP** — Native HTTP connection using `url`/`httpUrl` field
   - ✅ No proxy process required
   - ✅ Lowest overhead
   - ✅ Simplest architecture for remote/containerized deployments
   - ⚠️ Not supported by all clients (e.g., Claude Desktop)

2. **HTTP via mcp-remote** — Standard MCP proxy (`npx mcp-remote`)
   - ✅ Universal client compatibility
   - ✅ Works with all tested clients
   - ⚠️ Requires spawning local proxy process

3. **STDIO** — Local subprocess with stdin/stdout communication
   - ✅ Simplest setup for local development
   - ✅ No network configuration needed
   - ⚠️ Requires local build and absolute paths

**Quick Start Example (Cursor/Gemini - Direct HTTP):**

```json
{
  "mcpServers": {
    "horreum": {
      "url": "http://horreum-mcp.example.com:3000/mcp",
      "headers": {
        "Authorization": "Bearer mcp_auth_token_xyz789abc"
      }
    }
  }
}
```

> [!NOTE]
> Cursor uses `url` field, Gemini CLI uses `httpUrl` field

**Alternative: HTTP via mcp-remote (all clients):**

```json
{
  "mcpServers": {
    "horreum": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://horreum-mcp.example.com:3000/mcp",
        "--header",
        "Authorization: Bearer mcp_auth_token_xyz789abc"
      ]
    }
  }
}
```

**Alternative: STDIO for local development:**

```json
{
  "mcpServers": {
    "horreum": {
      "command": "node",
      "args": ["/absolute/path/to/horreum-mcp/build/index.js"],
      "env": {
        "HORREUM_BASE_URL": "https://horreum.example.com",
        "HORREUM_TOKEN": "horreum_api_token_abc123xyz"
      }
    }
  }
}
```

> [!IMPORTANT]
> Use absolute paths - many clients don't resolve `~` or relative paths
> correctly. See the [full guide](docs/user-guide/ai-clients.md) for
> client-specific configuration locations and troubleshooting.

### HTTP API (Advanced)

For persistent servers, remote access, or server-to-server integration:

#### MCP over HTTP (Direct Connection)

**Important:** Most AI clients (Claude, Cursor) use stdio mode. Direct HTTP
connections are primarily for:

- Server-to-server integration (e.g., Domain MCP → Horreum MCP)
- Custom client implementations
- Testing and debugging

**Requirements:**

- Server uses POST-based JSON-RPC over HTTP
- Client must send `Accept: application/json, text/event-stream` header
- Sessions initialized via POST `/mcp` with initialize message

#### Direct HTTP API (Server-to-Server)

For backend integration without MCP protocol overhead:

```bash
# List runs with time filtering
curl -X POST http://localhost:3000/api/tools/horreum_list_runs \
  -H "Authorization: Bearer changeme" \
  -H "Content-Type: application/json" \
  -d '{
    "test": "boot-time-verbose",
    "from": "2025-09-23T00:00:00Z",
    "to": "2025-09-30T23:59:59Z",
    "pageSize": 10
  }'

# Discover capabilities
curl -X POST http://localhost:3000/api/tools/source.describe \
  -H "Authorization: Bearer changeme" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Available HTTP endpoints:**

- `POST /api/tools/horreum_list_runs` - List runs with time filtering
- `POST /api/tools/horreum_get_run` - Get specific run by ID
- `POST /api/tools/horreum_list_tests` - List tests with optional name filter
- `POST /api/tools/horreum_list_schemas` - List available schemas
- `POST /api/tools/horreum_get_schema` - Get schema by ID or name
- `POST /api/tools/horreum_list_datasets` - Search/list datasets by test, schema, or time
- `POST /api/tools/horreum_get_dataset` - Get raw dataset content by ID
- `POST /api/tools/horreum_get_run_data` - Raw run data (optional schemaUri)
- `POST /api/tools/horreum_get_run_metadata` - Run metadata (optional schemaUri)
- `POST /api/tools/horreum_get_run_summary` - Run summary
- `POST /api/tools/horreum_list_runs_by_schema` - Runs filtered by schema URI
- `POST /api/tools/horreum_get_run_count` - Run count for a test
- `POST /api/tools/horreum_list_all_runs` - Global run search with time filters
- `POST /api/tools/horreum_get_dataset_summary` - Dataset summary (optional viewId)
- `POST /api/tools/horreum_get_run_label_values` - Run label values with
  filtering and pagination
- `POST /api/tools/horreum_get_test_label_values` - Test-wide label values with
  filtering and natural language time
- `POST /api/tools/horreum_get_dataset_label_values` - Dataset label values
- `POST /api/tools/source.describe` - Discover server capabilities

See [RHIVOS_INTEGRATION.md](RHIVOS_INTEGRATION.md) for complete HTTP API
documentation and [Time Range Filtering](docs/TIME_RANGE_FILTERING.md) for
time-based query details.

## Usage

Once connected to an AI assistant (see [AI Client Configuration](#ai-client-configuration)),
you can query Horreum data.

> [!IMPORTANT]
> **Standalone Usage**: When using Horreum MCP directly (not through a Domain MCP),
> queries must be specific and include all required parameters. Vague queries like
> "show me recent performance" will fail without established context (test names, IDs,
> time ranges, etc.).
>
> **Domain MCP Usage**: Domain-specific MCPs provide contextual understanding and can
> handle natural language queries. See the
> [Domain MCP Integration Guide](docs/architecture/domain-mcp-integration.md).

### Example Queries (Standalone - Direct/Specific)

- _"List all tests in Horreum"_
- _"Get test by name 'api-performance-test'"_
- _"Show runs for test ID 123 from the last 7 days"_
- _"Get label values for run ID 456"_
- _"Find datasets for test 'load-test' created after 2025-01-01"_

### Example Queries (Domain MCP - Natural Language)

- _"Compare the performance of the last 5 runs"_
- _"Show me any failed runs from yesterday"_
- _"What's the average runtime for the api-performance test?"_
- _"Has response time regressed in the latest version?"_

### Manage Schemas and Data

- _"Get the schema definition for 'boot-metrics'"_
- _"Upload this test run data to the performance-test"_
- _"Show me all schemas containing 'memory' fields"_

### Testing and Validation

Run the included smoke tests to verify everything works:

```bash
# Quick validation
npm run smoke        # Test connectivity
npm run smoke:tests  # List available tests
npm run smoke:runs   # Query test runs

# Enable debug logging for troubleshooting
npm start -- --log-level debug
```

### Logging and Diagnostics

The server provides comprehensive logging and diagnostics designed to make
failures fast to diagnose in production:

```bash
# Set log level (trace|debug|info|warn|error|fatal|silent)
export LOG_LEVEL=info  # Default
npm start

# Or use CLI flags
npm start -- --log-level debug
npm start -- --debug  # Shorthand

# Enable JSON format for production
export LOG_FORMAT=json
npm start
```

**Key features:**

- **Correlation IDs**: Every request gets a unique `req_id` that appears in all
  related logs, propagated to upstream Horreum calls, and echoed in response
  headers
- **Upstream Error Capture**: HTTP error bodies (with preview), timeout
  detection, and connection errors logged with retry hints
- **SSE-Safe Middleware**: Request logging that doesn't break streaming
  responses
- **Structured Events**: Consistent event naming (`mcp.request.*`,
  `mcp.tools.*`, `query.*`, `upstream.*`, `normalize.hint`)
- **Tool Instrumentation**: Track tool calls, query durations, and result
  counts
- **Structured Errors**: Machine-parseable error responses with correlation IDs

**Recommended timeout configuration:**

```bash
HORREUM_TIMEOUT=30000   # Default: 30s for simple queries
# For complex queries (label values with heavy filtering):
HORREUM_TIMEOUT=300000  # 300s (5 minutes)
```

See [Logging and Diagnostics Guide](docs/LOGGING_AND_DIAGNOSTICS.md) for:

- Correlation ID workflows and tracing requests end-to-end
- Complete log event taxonomy and field reference
- Timeout configuration and retry strategy
- Debugging workflows and common troubleshooting
- Integration with log aggregation and monitoring systems

### Observability Features

Enable comprehensive monitoring and debugging:

```bash
# Enable Prometheus metrics
export METRICS_ENABLED=true
export METRICS_PORT=9464
npm start
# Scrape http://localhost:9464/metrics

# Enable OpenTelemetry tracing
export TRACING_ENABLED=true
# Configure OTLP endpoint via standard envs
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
npm start
```

Features include:

- **Distributed Tracing**: Full request spans including HTTP calls with
  correlation IDs
- **Prometheus Metrics**: Request rates, durations, error counts by endpoint
- **Structured Logging**: JSON output with contextual metadata and correlation
  IDs

## Connecting to Other MCP Servers

### How to Connect Domain MCP Servers

Want to connect specialized performance analysis servers to your Horreum MCP server? This guide shows you how to set up a complete performance analysis pipeline using containers.

#### What You'll Build

```mermaid
flowchart LR
    Client[🤖 Your AI Assistant<br/>Claude, ChatGPT, Cursor]
    Domain[📊 Domain MCP Server<br/>Performance Analysis]
    Horreum[🔗 Horreum MCP Server<br/>Data Access]
    HorreumDB[🗄️ Your Horreum Instance<br/>Performance Database]

    Client <--> Domain
    Domain <-->|HTTP API| Horreum
    Horreum <-->|REST API| HorreumDB

    style Domain fill:#e1f5fe,stroke:#333,stroke-width:2px,color:#000
    style Horreum fill:#fff3e0,stroke:#333,stroke-width:2px,color:#000
    style Client fill:#f3e5f5,stroke:#333,stroke-width:2px,color:#000
    style HorreumDB fill:#e8f5e8,stroke:#333,stroke-width:2px,color:#000
```

Your AI assistant will be able to ask questions like _"Analyze the boot time trends for the last 10 runs"_ and get intelligent responses that combine data from Horreum with specialized performance analysis.

#### Step-by-Step Setup

**Step 1: Start Your Horreum MCP Server**

First, start the Horreum MCP server in HTTP mode so other servers can connect to it:

```bash
# Replace with your actual Horreum instance URL
podman run -d --name horreum-mcp \
  -p 127.0.0.1:3001:3000 \
  -e HORREUM_BASE_URL=https://your-horreum-instance.com \
  -e HTTP_MODE_ENABLED=true \
  -e HTTP_AUTH_TOKEN=your-secure-token \
  -e LOG_LEVEL=info \
  quay.io/redhat-performance/horreum-mcp:main

# Test that it's working
curl -H 'Authorization: Bearer your-secure-token' http://localhost:3001/health
# You should see: {"status":"ok"}
```

**Step 2: Configure the Domain MCP Connection**

Create a configuration file that tells the Domain MCP server how to connect to your Horreum MCP server:

```json
{
  "sources": {
    "my-horreum": {
      "endpoint": "http://localhost:3001",
      "api_key": "your-secure-token",
      "type": "horreum",
      "timeout_seconds": 30
    }
  },
  "enabled_plugins": {
    "boot-time-verbose": true
  }
}
```

Save this as `domain-config.json` on your system.

**Step 3: Start the Domain MCP Server**

Now start the Domain MCP server and connect it to your Horreum MCP server:

```bash
# Start the Domain MCP server with your configuration
podman run -d --name domain-mcp \
  -p 127.0.0.1:8080:8080 \
  -v $(pwd)/domain-config.json:/config/config.json:ro,Z \
  -e DOMAIN_MCP_HTTP_TOKEN=another-secure-token \
  -e DOMAIN_MCP_CONFIG=/config/config.json \
  -e DOMAIN_MCP_LOG_LEVEL=INFO \
  quay.io/redhat-performance/rhivos-perfscale-mcp:main

# Test that it's working
curl -H 'Authorization: Bearer another-secure-token' http://localhost:8080/ready
# You should see: {"status":"ready"}
```

#### Testing Your Setup

**Test 1: Verify Horreum MCP is Working**

Let's test that your Horreum MCP server is responding correctly:

```bash
# Test the ping tool (this should work immediately)
# First, get a session ID
INIT_RESPONSE=$(curl -s -i -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Authorization: Bearer your-secure-token' \
  http://localhost:3001/mcp \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
  }')

# Extract the session ID from the response
SESSION_ID=$(echo "$INIT_RESPONSE" | grep -i 'mcp-session-id:' | sed 's/.*: //' | tr -d '\r')

# Now test the ping tool
curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Authorization: Bearer your-secure-token' \
  -H "Mcp-Session-Id: $SESSION_ID" \
  http://localhost:3001/mcp \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "ping",
      "arguments": {"message": "Hello Horreum!"}
    }
  }' | jq .

# ✅ Success: You should see the message echoed back
```

**Test 2: Try Domain MCP Raw Mode**

The Domain MCP server can analyze performance data you provide directly:

```bash
# Test with some sample data (this will work once plugin issues are fixed)
curl -X POST \
  -H 'Authorization: Bearer another-secure-token' \
  -H 'Content-Type: application/json' \
  http://localhost:8080/tools/get_key_metrics_raw \
  -d '{
    "dataset_types": ["boot-time-verbose"],
    "data": [{"$schema": "urn:boot-time-verbose:04", "test_results": []}]
  }' | jq .

# 🔄 Currently: This will show plugin registration issues that need to be fixed
```

**Test 3: Try the Full Pipeline**

Once everything is working, you'll be able to fetch data through the full pipeline:

```bash
# This will fetch data from Horreum via your Horreum MCP server
curl -X POST \
  -H 'Authorization: Bearer another-secure-token' \
  -H 'Content-Type: application/json' \
  http://localhost:8080/tools/get_key_metrics \
  -d '{
    "dataset_types": ["boot-time-verbose"],
    "source_id": "my-horreum",
    "test_id": "boot-time-test",
    "limit": 3
  }' | jq .

# 🎯 Goal: Get intelligent performance analysis combining Horreum data with Domain MCP insights
```

#### What's Working Right Now

**✅ Horreum MCP Server** - Ready to use!

Your Horreum MCP server is production-ready with these features:

- **Ping tool** - Test connectivity anytime ✅
- **All 5 tools available** - `list_tests`, `get_schema`, `list_runs`, `upload_run` ✅
- **Session management** - Proper MCP protocol implementation ✅
- **Authentication** - Secure with bearer tokens ✅
- **Container deployment** - Runs reliably in containers ✅

**⚠️ What Needs Your Horreum Instance**

The data-fetching tools will show "fetch failed" errors unless you have:

- Network access to your Horreum instance
- A valid Horreum API token
- Proper DNS resolution for your Horreum URL

This is expected - the server is working correctly, it just needs real Horreum credentials.

**🔄 Domain MCP Server - Needs Some Fixes**

The Domain MCP server runs but has some issues to resolve:

- Plugin registration needs to be fixed for `boot-time-verbose` datasets
- Configuration loading should be more visible in logs
- Error messages need to be more helpful
- Source connections need debugging

These are all fixable issues with the Domain MCP project.

#### Troubleshooting Tips

**Check Your Logs**

If something isn't working, the logs will tell you what's happening:

```bash
# Check Horreum MCP server
podman logs horreum-mcp
# Look for: "MCP server running in HTTP mode", session messages

# Check Domain MCP server
podman logs domain-mcp
# Look for: plugin loading, configuration messages
```

**Common Issues**

- **Port already in use**: Try different ports like `3002:3000` or `8081:8080`
- **Can't connect between containers**: Add `--network host` to both containers
- **Authentication errors**: Make sure your tokens match in config files and curl commands
- **Config not found**: Check that your volume mount path is correct

**Getting Help**

If you run into issues:

1. Check the server logs first
2. Verify your configuration files match the examples
3. Test each server individually before connecting them
4. Make sure your Horreum instance is accessible

#### Next Steps

Once you have both servers running:

1. **Connect your AI assistant** to the Domain MCP server using the stdio or HTTP modes
2. **Ask natural language questions** like _"Show me the latest boot time results"_
3. **Get intelligent analysis** that combines Horreum data with performance insights

The Horreum MCP server is ready to go - it just needs the Domain MCP fixes to complete the pipeline!

## Development

### Quick Start for Contributors

```bash
# Setup development environment
git clone https://github.com/dustinblack/horreum-mcp.git
cd horreum-mcp
npm ci
npm run build

# Run tests and validation
npm run check     # Type checking and linting
npm test         # Run test suite with coverage
npm run format   # Auto-format code

# Regenerate API client (if needed)
npm run gen:api -- --input https://horreum.example.com/q/openapi?format=json
```

### Code Quality Standards

- **TypeScript** with strict type checking
- **ESLint + Prettier** for consistent formatting
- **Pre-commit hooks** for security and quality checks
- **Comprehensive testing** with Vitest and smoke tests

### Project Roadmap

See [mcp_development_plan.md](mcp_development_plan.md) for detailed development
phases and upcoming features.

## Contributing

We welcome contributions! All commits should include the tag
"AI-assisted-by: <AI agent model(s)>" when AI agents were used for development
work.

## License

This project is licensed under the Apache 2.0 License. See the
[LICENSE](LICENSE) file for details.
