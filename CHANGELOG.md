# Changelog

All notable changes to the Horreum MCP Server project will be documented in
this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-14

### Initial Release

First public release of the Horreum MCP Server - a Source MCP adapter
providing standardized access to Horreum performance testing databases.

### Added

#### Core MCP Functionality (Phases 1-2)

- **MCP Tools**: Complete read/write tool coverage for Horreum operations
  - Test management: `list_tests`, `get_test`
  - Schema operations: `get_schema`, `list_schemas`
  - Run operations: `list_runs`, `get_run`, `get_run_data`, `get_run_metadata`,
    `get_run_summary`, `list_runs_by_schema`, `get_run_count`, `list_all_runs`
  - Dataset operations: `list_datasets`, `get_dataset`, `get_dataset_summary`
  - Label values: `get_run_label_values`, `get_test_label_values`,
    `get_dataset_label_values`
  - Upload capability: `upload_run`
- **Multiple Transport Modes**:
  - STDIO mode for local AI client integration
  - HTTP/SSE mode for remote connections (`/mcp` endpoint)
  - Direct REST API for server-to-server integration (`/api/tools/*`)
- **Authentication**: Bearer token support for Horreum API access
- **Pagination**: Full pagination support with configurable page sizes
- **Filtering**: Advanced filtering by test, schema, time ranges, and labels

#### Natural Language Features (Phase 6.5)

- **Natural Language Time Queries**: Use "last week", "yesterday", "last 30
  days" instead of timestamps
- **Intelligent Defaults**: Automatically defaults to last 30 days when no time
  range specified
- **Multiple Time Formats**: Support for ISO 8601, epoch milliseconds, natural
  language, and simple dates

#### LLM-Powered Natural Language Queries (Phase 9)

- **Query Endpoint**: `POST /api/query` accepts natural language questions
  about Horreum data
- **Multi-Provider LLM Support**: OpenAI, Anthropic, Google Gemini, Azure
  OpenAI
- **Tool Orchestration**: Automatic translation of natural language to MCP tool
  calls
- **Multi-Step Queries**: Handle complex queries requiring multiple tool
  invocations
- **Corporate Gemini Support**: Custom endpoint and project configuration for
  enterprise deployments
- **Configuration**: Environment variables for LLM provider, API keys, models,
  and endpoints

#### Observability & Diagnostics (Phases 3, 6.8)

- **Structured Logging**: JSON logging with configurable levels via `LOG_LEVEL`
- **Correlation IDs**: Request tracing via `AsyncLocalStorage` for distributed
  debugging
- **Metrics**: Prometheus metrics for monitoring (tool invocations, durations,
  errors)
- **OpenTelemetry**: Distributed tracing support (optional)
- **Health Checks**: `/health` endpoint for container orchestration
- **Upstream Error Visibility**: Detailed error propagation from Horreum API

#### Containerization & Deployment (Phase 5)

- **Multi-Architecture Support**: Pre-built container images for amd64 and
  arm64
- **Container Registry**: Published to `ghcr.io/dustinblack/horreum-mcp`
- **Kubernetes/OpenShift**: Complete deployment manifests and guides
- **SSL/TLS Configuration**: Support for custom CA certificates and corporate
  proxies
- **Environment-Based Config**: 12-factor app configuration via environment
  variables

#### Source MCP Contract (Phase 6)

- **Standardized Interface**: Implements Source MCP Contract for Domain MCP
  integration
- **Source Description**: `source.describe` endpoint exposing capabilities and
  limits
- **Contract Compliance**: Schema-validated responses for Domain MCP
  compatibility
- **Integration Guide**: Comprehensive documentation for Domain MCP developers

#### API Compatibility (2025-10-14)

- **Horreum 0.19 Support**: Updated to latest Horreum API endpoints
  - Dataset endpoints: `/api/dataset/list/bySchema`,
    `/api/dataset/list/byTest/{testId}`
  - Regenerated TypeScript client from Horreum 0.19 OpenAPI spec
  - Backward compatible tool interface (no breaking changes)

#### Documentation

- **User Guides**: Configuration, deployment, AI client setup, natural language
  queries
- **Architecture Docs**: Domain MCP integration, Source MCP contract, design
  patterns
- **Developer Guides**: Development history, CI/CD workflow, security practices
- **Troubleshooting**: Common issues, Horreum bugs, pagination, SSL/TLS
- **Examples**: Complete curl examples, client configurations, query patterns

#### Testing & Quality (All Phases)

- **97 Test Cases**: Comprehensive unit and integration tests
- **Smoke Tests**: Automated smoke tests for all major features
- **CI/CD Pipeline**: GitHub Actions with linting, type checking, testing,
  security scanning
- **Pre-commit Hooks**: Secret scanning, dependency audit, auto-formatting,
  linting
- **Security Scanning**: Trivy container scanning, npm audit

### Configuration

The server is configured via environment variables:

**Required:**

- `HORREUM_BASE_URL`: Horreum server URL

**Optional:**

- `HORREUM_TOKEN`: Authentication token for Horreum API
- `HORREUM_TLS_VERIFY`: SSL certificate verification (default: `true`)
- `HORREUM_TLS_CA_FILE`: Path to custom CA certificate
- `LOG_LEVEL`: Logging level (default: `info`)
- `HTTP_PORT`: HTTP server port (default: `3000`)
- `HTTP_AUTH_TOKEN`: Bearer token for HTTP authentication
- `LLM_PROVIDER`: LLM provider (openai, anthropic, gemini, azure-openai)
- `LLM_API_KEY`: API key for LLM provider
- `LLM_MODEL`: LLM model identifier
- `LLM_GEMINI_ENDPOINT`: Custom Gemini API endpoint (corporate)
- `LLM_GEMINI_PROJECT`: Google Cloud Project ID (corporate)
- `LLM_AZURE_ENDPOINT`: Azure OpenAI endpoint
- `LLM_AZURE_DEPLOYMENT`: Azure OpenAI deployment name

### Known Limitations

- **Streaming Responses**: Foundation in place, endpoint integration deferred
  to future release
- **Write Operations**: Limited to run uploads; test/schema creation not yet
  implemented
- **Dataset Comparison**: CSV export for comparisons planned for Phase 13

### Technical Details

- **Language**: TypeScript
- **Runtime**: Node.js 20 LTS
- **MCP SDK**: @modelcontextprotocol/sdk v1.18.1
- **License**: Apache 2.0
- **Repository**: https://github.com/dustinblack/horreum-mcp

### Deployment

**Container (Recommended):**

```bash
podman run -d \
  -e HORREUM_BASE_URL=https://horreum.example.com \
  -e HORREUM_TOKEN=your-token \
  -e HTTP_AUTH_TOKEN=mcp-token \
  -p 3000:3000 \
  ghcr.io/dustinblack/horreum-mcp:latest
```

**From Source:**

```bash
git clone https://github.com/dustinblack/horreum-mcp.git
cd horreum-mcp
npm install
npm run build
npm start
```

### Documentation

- **Quick Start**: [README.md](README.md)
- **Configuration Guide**: [docs/user-guide/configuration.md](docs/user-guide/configuration.md)
- **Kubernetes Deployment**: [docs/deployment/kubernetes-deployment.md](docs/deployment/kubernetes-deployment.md)
- **Domain MCP Integration**: [docs/architecture/domain-mcp-integration.md](docs/architecture/domain-mcp-integration.md)
- **Natural Language Queries**: [docs/user-guide/natural-language-queries.md](docs/user-guide/natural-language-queries.md)
- **AI Client Setup**: [docs/user-guide/ai-clients.md](docs/user-guide/ai-clients.md)

### Contributors

- Dustin Black (@dustinblack)
- AI-assisted development by Claude Sonnet 4.5

---

## Release History

For detailed development history and completed phases, see
[docs/developer/development-history.md](docs/developer/development-history.md).

[0.1.0]: https://github.com/dustinblack/horreum-mcp/releases/tag/v0.1.0
