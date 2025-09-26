# Horreum MCP Server

A Model Context Protocol (MCP) server that connects AI assistants to
[Horreum](https://horreum.hyperfoil.io/) performance testing databases. This
enables AI agents to query performance data, analyze test results, and manage
testing workflows through natural language.

**What this does:**

- 🔍 **Query performance data** from Horreum instances
- 📊 **Analyze test results** with built-in tools and filters
- 🤖 **Works with AI assistants** through the Model Context Protocol (MCP)
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

## Status

**Phase 5 Complete** - Production ready with full observability:

- ✅ **Core Tools**: `ping`, `list_tests`, `get_schema`, `list_runs`, `upload_run`
- ✅ **Dual Transport**: stdio (default) and HTTP server modes
- ✅ **Production Ready**: Structured logging, metrics, tracing, security
- 🚀 **Next Phase**: Enhanced CI/CD and security scanning

## Features

### Core Tools

- **`ping`**: Simple connectivity check and health monitoring
- **`list_tests`**: Browse tests with pagination and filtering support
- **`get_schema`**: Retrieve schema definitions by ID or name
- **`list_runs`**: Query test runs with sorting and time-based filtering
- **`upload_run`**: Submit new test run data to Horreum

### MCP Resources

In addition to tools, the server exposes key resources as URIs:

- `horreum://tests/{id}` - Individual test configurations
- `horreum://schemas/{id}` - Schema definitions
- `horreum://tests/{testId}/runs/{runId}` - Specific test run data

### Transport Modes

- **Stdio Mode** (default): Direct integration with MCP-compatible AI clients
- **HTTP Mode**: Persistent server for network access and web API integration
- **Container Mode**: Multi-architecture containerized deployment

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

    class AI,STDIO,MCP,HORREUM,PROM,OTEL,LOGS,HTTP,LLM implemented

    %% Future Enhancements (Phase 6+)
    subgraph "Enterprise Features 🚧"
        direction TB
        REST[REST API Endpoints<br/>🚧 PHASE 8]
        PLUGIN[Plugin Architecture<br/>🚧 PHASE 7]
    end

    HTTP -.->|"Future"| REST
    MCP -.->|"Future"| PLUGIN

    class REST,PLUGIN planned

    %% Legend
    subgraph Legend[" "]
        L1[✅ Implemented - Phase 1-5 Complete]
        L2[🚧 Planned - Phase 6+ Roadmap]
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

| Variable             | Required | Description                                                       |
| -------------------- | -------- | ----------------------------------------------------------------- |
| `HORREUM_BASE_URL`   | ✅       | Base URL of your Horreum instance                                 |
| `HORREUM_TOKEN`      | ⚠️       | API token (required for writes/private data)                      |
| `HORREUM_RATE_LIMIT` | ❌       | Client-side rate limit in requests per second (default: 10)       |
| `HORREUM_TIMEOUT`    | ❌       | Per-request timeout in milliseconds (default: 30000)              |
| `HTTP_MODE_ENABLED`  | ❌       | Enable HTTP server mode (default: stdio)                          |
| `HTTP_PORT`          | ❌       | HTTP server port (default: 3000)                                  |
| `HTTP_AUTH_TOKEN`    | ❌       | Secure your HTTP endpoints                                        |
| `LOG_LEVEL`          | ❌       | Logging verbosity (`trace`,`debug`,`info`,`warn`,`error`,`fatal`) |
| `LOG_FORMAT`         | ❌       | Log output format (`json` or `pretty`)                            |
| `METRICS_ENABLED`    | ❌       | Enable Prometheus metrics endpoint (default: false)               |
| `METRICS_PORT`       | ❌       | Port for metrics endpoint (default: 9464)                         |
| `TRACING_ENABLED`    | ❌       | Enable OpenTelemetry tracing (default: false)                     |

> [!NOTE]
> When using with AI clients, these variables are typically configured in the client's MCP server settings rather than a local `.env` file.

## Usage

### With AI Assistants (Recommended)

The primary use case is connecting AI assistants to Horreum for natural language
performance analysis.

**Supported AI Clients:**

- Claude Desktop/Code
- Cursor
- Any MCP-compatible client

**Setup Steps:**

1. Build the project: `npm ci && npm run build`
2. Configure your AI client with the server details (see examples below)
3. Start asking questions like: _"List all tests in Horreum"_ or _"Show me the
   latest runs for test 123"_

### Container Deployment

For production or shared environments:

```bash
# Run with HTTP mode for network access
podman run --rm -p 127.0.0.1:3000:3000 \
  -e HORREUM_BASE_URL=https://horreum.example.com \
  -e HTTP_MODE_ENABLED=true \
  -e HTTP_AUTH_TOKEN=changeme \
  quay.io/redhat-performance/horreum-mcp:main

# Test the deployment
curl -H 'Authorization: Bearer changeme' \
     http://localhost:3000/health
```

### Local Development

For testing and development:

```bash
# Start in stdio mode (for AI client testing)
npm start -- --log-level debug

# Or start in HTTP mode (for API testing)
HTTP_MODE_ENABLED=true npm start
```

## AI Client Configuration

### Stdio Mode (Recommended)

Configure your AI client to spawn the MCP server as a local process:

**Core Settings (all clients):**

- **Command:** `node`
- **Args:** `/absolute/path/to/horreum-mcp/build/index.js`
- **Environment:** `HORREUM_BASE_URL=https://horreum.example.com`

> [!IMPORTANT]
> Use absolute paths - many clients don't resolve `~` or relative paths
> correctly.

**Claude Desktop/Code** (`claude_mcp.json` or Preferences → MCP):

```json
{
  "mcpServers": {
    "horreum": {
      "command": "node",
      "args": ["/absolute/path/to/horreum-mcp/build/index.js"],
      "env": {
        "HORREUM_BASE_URL": "https://horreum.example.com",
        "HORREUM_TOKEN": "${HORREUM_TOKEN}"
      }
    }
  }
}
```

**Cursor** (Settings → MCP → Add Server):

- Command: `node`
- Args: `/absolute/path/to/horreum-mcp/build/index.js`
- Env: `HORREUM_BASE_URL`, `HORREUM_TOKEN`

### HTTP Mode (Advanced)

For persistent servers or remote access:

1. Start the server: `HTTP_MODE_ENABLED=true npm start`
2. Configure client to connect to `http://localhost:3000/mcp`
3. Add `Authorization: Bearer changeme` header if auth is enabled

## What You Can Do

Once connected to an AI assistant, you can use natural language to interact
with Horreum:

### Query Performance Data

- _"List all available tests in Horreum"_
- _"Show me the latest 10 runs for the boot-time test"_
- _"Get details for test run ID 12345"_
- _"Find tests created in the last month"_

### Analyze Results

- _"Compare the performance of the last 5 runs"_
- _"Show me any failed runs from yesterday"_
- _"What's the average runtime for test 'api-performance'?"_

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

# Enable structured JSON logging
export LOG_FORMAT=json
npm start -- --log-level trace
```

Features include:

- **Correlation IDs**: Track requests across all components
- **Distributed Tracing**: Full request spans including HTTP calls
- **Prometheus Metrics**: Request rates, durations, error counts
- **Structured Logging**: JSON output with contextual metadata

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
