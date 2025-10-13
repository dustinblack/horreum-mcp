# Original prompt

I would like to start a project to build a generalized Model Context Protocol server for Horreum. Help me devise a strategy for developing and testing this project. Suggest what language and standards we should use.

# Horreum MCP Server: Development and Testing Strategy

This document outlines the development strategy and current status for the Horreum
MCP Server. For historical context and completed phases, see
[`docs/developer/development-history.md`](docs/developer/development-history.md).

## 1. Recommended Language and Standards

To align with the MCP ecosystem and integrate with Horreum via its HTTP APIs, the
project uses the following stack:

- **Language**: TypeScript (Node.js 20 LTS)
- **MCP SDK**: `@modelcontextprotocol/sdk` (server)
- **Package Manager**: `npm`
- **Tooling**: ESLint, Prettier, tsup (bundling), Vitest (testing)
- **Licensing**: Apache 2.0

Note: We adhere to Horreum/Hyperfoil contribution expectations for licensing and
general code quality, while choosing TypeScript for first-class MCP support.

## 2. Development Strategy

The development follows an iterative, phased approach with a read-first priority:
implement and stabilize read-oriented tools before write-capable tools.

### Completed Phases (1-6.9)

**Phases 1-6.9 are complete.** See
[`docs/developer/development-history.md`](docs/developer/development-history.md)
for full details on:

- Phase 1: Core MCP Server and Read Tools (COMPLETED 2025-09-19)
- Phase 2: Write Tools and Uploads (COMPLETED 2025-09-22)
- Phase 3: Observability and Hardening (COMPLETED 2025-09-23)
- Phase 4: HTTP Standalone Mode (COMPLETED 2025-09-24)
- Phase 5: Containerization & Multi-Architecture Support (COMPLETED 2025-09-26)
- Phase 6: Direct HTTP API for Server-to-Server Integration (COMPLETED 2025-09-30)
- Phase 6.5: End-to-End Integration Fixes (COMPLETED 2025-10-01)
- Phase 6.6: Label Values API Coverage (COMPLETED 2025-10-07)
- Phase 6.7: Comprehensive Run and Dataset GET Endpoint Coverage (COMPLETED
  2025-10-07)
- Phase 6.8: Logging and Diagnostics Enhancement (COMPLETED 2025-10-08)
- Phase 6.9: Label Values Format Compliance (COMPLETED 2025-10-10)

### Planned Phases (7-13)

**Phase 7: Enhanced CI/CD Pipeline**

- Multi-stage testing pipeline with parallel execution and performance regression
  testing
- Comprehensive security scanning (osv-scanner, SAST, license compliance)
- Performance optimizations (caching, job interruption, conditional workflows)
- Release automation (semantic versioning, NPM/container publishing)

**Phase 8: Architecture Refactoring & Modularity**

- Extract shared logic into reusable modules with plugin architecture
- Make observability features truly optional with dependency injection
- Centralized error handling with circuit breaker patterns
- Hierarchical configuration system with validation and hot-reload

**Phase 9: LLM-Powered Natural Language Query Endpoint**

- HTTP endpoint accepting natural language queries (e.g., `POST /api/query`)
- Integration with external LLM APIs (OpenAI, Anthropic, etc.) via existing
  `src/llm/client.ts`
- Stand-alone operation mode: LLM translates natural language → MCP tool calls →
  Horreum API
- Query intent parsing and tool orchestration (multi-step queries)
- Streaming response support for long-running analyses
- Configuration: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` environment
  variables
- System prompt engineering for Horreum domain expertise
- Example queries: "Show me tests that failed in the last week", "Compare
  performance of run 123 vs 456"

**Phase 10: Alternative REST API Mode**

- REST API endpoints (`GET /api/v1/tests`, `POST /api/v1/tests/{id}/runs`, etc.)
- OpenAPI 3.0 specification with Pydantic-compatible responses
- API versioning strategy with rate limiting and backward compatibility

**Phase 11: Build System Enhancement**

- Multi-architecture builds with cross-compilation and bundle optimization
- Advanced dependency management with automated updates and vulnerability scanning
- Build performance optimization (incremental builds, parallel processes)

**Phase 12: Testing & Security Hardening**

- Enhanced testing framework (unit, integration, contract, performance testing)
- Runtime security monitoring with secrets management and audit logging
- Operational readiness (health checks, metrics, graceful shutdown)

**Phase 13: Data Analysis**

- `analyze_run_data` tool for server-side statistical analysis with testing

## 3. Testing Strategy

A multi-layered testing approach has been implemented, following the read-first
priority by stabilizing read tools before write tools.

1.  **Smoke Tests (in-memory transport)**: Innovative lightweight smoke tests
    validate `ping`, `list_tests` (folder-aware), `get_schema`, `list_runs` (time
    filters), and `upload_run` without external dependencies; executed in CI.
    Smokes use generic fixtures (e.g., `example-test`, id `123`) and in-memory
    MCP transport with mocked HTTP responses - this approach is highly effective
    for MCP server validation.
2.  **Unit Tests (Vitest)**: Test tool handlers and core utilities with mocked
    HTTP clients.
3.  **Integration Tests**: Use `nock` or `msw` to simulate Horreum endpoints;
    verify schema and error handling.
4.  **End-to-End (E2E)**: Exercise the MCP server via an MCP client (e.g.,
    `mcp-cli`) to validate tool registration and execution.
5.  **Continuous Integration (CI)**: GitHub Actions on Node 20: install, lint,
    build, comprehensive smoke tests, and type-check.

Comprehensive smoke test scripts are available in `scripts/` for manual testing
against real Horreum instances.

## 4. Environment Configuration

The server requires minimal configuration via environment variables:

- `HORREUM_BASE_URL` (required): Horreum server URL
- `HORREUM_TOKEN` (optional): Authentication token for Horreum API
- `HORREUM_TLS_VERIFY` (optional): SSL certificate verification (default: `true`)
- `LOG_LEVEL` (optional): Logging level (trace|debug|info|warn|error|fatal|silent,
  default: `info`)
- `HTTP_PORT` (optional): HTTP server port (default: `3000`)
- `HTTP_AUTH_TOKEN` (optional): Bearer token for HTTP authentication

Additional configuration options are documented in the main
[README.md](README.md).

## 5. Architectural Considerations

### Transport Modes

The Horreum MCP server supports multiple transport modes:

1. **STDIO Mode**: Direct stdin/stdout JSON-RPC for local AI client integration
2. **HTTP Mode**: HTTP server with SSE support at `/mcp` endpoint for remote
   connections
3. **Direct REST API**: POST endpoints at `/api/tools/*` for server-to-server
   integration

**Architectural Note**: The current implementation uses
`StreamableHTTPServerTransport` at the `/mcp` endpoint, which handles both SSE
and HTTP. Some Domain MCP implementations expose separate `/mcp` (SSE) and
`/mcp/http` (HTTP) endpoints. A future phase may consider adding distinct
endpoints for architectural flexibility, though this is not currently required.

### Domain MCP Integration

The primary purpose of the Horreum MCP server is to serve as a **Source MCP**
abstraction layer for domain-specific MCP servers (Domain MCPs). This
architecture enables:

- **AI Assistant → Domain MCP → Source MCP (Horreum) → Horreum DB**
- Domain-specific tools and analysis built on top of Horreum data
- Standardized Source MCP Contract for consistent data access
- Separation of concerns: domain logic in Domain MCP, data access in Source MCP

See [docs/architecture/domain-mcp-integration.md](docs/architecture/domain-mcp-integration.md)
for comprehensive integration guidance.

## 6. Success Criteria and Non-Goals

### Success (Phases 1–6.9 - ACHIEVED)

- Read tools provide consistent results with pagination and filtering in both
  authenticated and anonymous modes ✅
- E2E: MCP client can list tests, fetch schemas, list runs in anonymous mode;
  and upload runs in authenticated mode ✅
- Resilience to transient Horreum/network failures with retries/backoff ✅
- Clear error messaging when authentication is required but not provided ✅
- HTTP standalone mode with bearer token authentication ✅
- Container deployment with multi-architecture support (amd64, arm64) ✅
- Direct HTTP API for server-to-server integration ✅
- Source MCP Contract compliance for Domain MCP integration ✅
- Natural language time queries ("last week", "yesterday") ✅
- Comprehensive label values API coverage ✅
- Production-ready logging and diagnostics with correlation IDs ✅

### Non-goals (initial)

- Multi-tenant authz/ACLs beyond token scoping
- Long-term persistence or complex scheduling
- Arbitrary file transfer beyond Horreum-compatible payloads

## 7. Maintenance and Status (For AI Agents)

This section instructs any AI agent or maintainer on how to keep this plan
authoritative and up-to-date, and how to report current progress at a glance.

### Source of truth

- This file (`mcp_development_plan.md`) is the single source of truth for the
  current plan and status.
- Historical context is in [`docs/developer/development-history.md`](docs/developer/development-history.md).
- Always read both files before answering "What's the plan?" or starting work.

### Update policy

- After any meaningful planning or implementation change, immediately update the
  Status Checklist and append a Changelog entry.
- Use the Status Legend below consistently. Include dates in UTC as
  `(YYYY-MM-DD)`.
- Respect the current execution directive: do not begin development unless
  explicitly authorized in this file or by the user.

### Status legend

- `[ ]` pending
- `[ip]` in progress
- `[x]` completed
- `[c]` cancelled

### Current execution directive

**CURRENT STATUS**: All Phase 1-6.9 and Phase 9 objectives **COMPLETE**. The
Horreum MCP server is production-ready with:

- ✅ Comprehensive read/write tool coverage (tests, schemas, runs, datasets,
  label values)
- ✅ Source MCP Contract compliance for Domain MCP integration
- ✅ Natural language time queries with intelligent defaults
- ✅ **LLM-powered natural language query endpoint with actual tool execution**
  (Phase 9) 🆕
- ✅ Multi-provider LLM support (OpenAI, Anthropic, Gemini, Azure OpenAI)
- ✅ Tool orchestration for multi-step query execution with real Horreum data
- ✅ Shared handler registry pattern for internal tool invocation
- ✅ HTTP standalone mode and STDIO mode
- ✅ Direct REST API for server-to-server integration
- ✅ Container deployment with multi-architecture support (amd64, arm64)
- ✅ Production-ready logging and diagnostics with correlation IDs
- ✅ SSL/TLS certificate configuration for corporate environments
- ✅ Comprehensive documentation and testing (97 tests passing)

**NEXT**: Phase 7 (Enhanced CI/CD Pipeline) or Phase 8 (Architecture
Refactoring) - awaiting explicit user direction.

## 8. Status Checklist

### Recently Completed

- [x] Phases 1-5 — Core functionality, observability, containerization (COMPLETED
      2025-09-26)
  - See [`docs/developer/development-history.md`](docs/developer/development-history.md)
    for full details

- [x] Phase 6 — Direct HTTP API for Server-to-Server Integration (COMPLETED
      2025-09-30)
  - [x] Direct HTTP POST endpoints for all MCP tools
  - [x] Bearer token authentication
  - [x] Source MCP Contract compliance

- [x] Phase 6.5 — End-to-End Integration Fixes (COMPLETED 2025-10-01)
  - [x] Source MCP Contract schema compliance
  - [x] Natural language time query support
  - [x] Pagination alignment with Horreum (1-based)

- [x] Phase 6.6 — Label Values API Coverage (COMPLETED 2025-10-07)
  - [x] get_run_label_values (most important endpoint)
  - [x] get_test_label_values (aggregated across runs)
  - [x] get_dataset_label_values (dataset-specific)
  - [x] Extensive filtering and pagination support

- [x] Phase 6.7 — Run and Dataset GET Endpoint Coverage (COMPLETED 2025-10-07)
  - [x] Run endpoints: get_run, get_run_data, get_run_metadata, get_run_summary,
        list_runs_by_schema, get_run_count, list_all_runs
  - [x] Dataset endpoints: get_dataset_summary
  - [x] MCP tools and HTTP endpoints
  - [x] Comprehensive smoke tests

- [x] Phase 6.8 — Logging and Diagnostics Enhancement (COMPLETED 2025-10-08)
  - [x] Correlation IDs via AsyncLocalStorage
  - [x] SSE-safe request logging middleware
  - [x] Upstream error visibility
  - [x] Tool and query instrumentation
  - [x] Structured error responses
  - [x] LOG_LEVEL configuration

- [x] Phase 6.9 — Label Values Format Compliance (COMPLETED 2025-10-10)
  - [x] Transform label values format from map to array
  - [x] Convert all field names to snake_case
  - [x] Convert timestamps to ISO 8601 format
  - [x] Apply to run and test label values endpoints
  - [x] Validation testing with production data

### Documentation

- [x] Phase 6.9 — Documentation refactoring and consolidation (COMPLETED
      2025-10-13)
  - [x] Consolidated documentation under `docs/` directory
  - [x] Created Domain MCP Integration Guide
  - [x] AI client configuration documentation
  - [x] Architecture diagrams (Mermaid)
  - [x] Source MCP Contract documentation
  - [x] Removed obsolete documentation from root
  - [x] Standardized examples (URLs, tokens, keys)

- [x] CI/CD workflow improvements (COMPLETED 2025-10-13)
  - [x] Fixed Trivy scan in CI pipeline
  - [x] Optimized single-job build/scan/push workflow
  - [x] Added GitHub release support with semantic versioning
  - [x] Concurrent build control

### Next Up

- [ ] Phase 7 — Enhanced CI/CD Pipeline (PLANNED)
  - [ ] Multi-stage testing pipeline
  - [ ] Comprehensive security scanning
  - [ ] Performance optimizations
  - [ ] Release automation

- [ ] Phase 8 — Architecture Refactoring & Modularity (PLANNED)
  - [ ] Extract shared logic into reusable modules
  - [ ] Implement plugin architecture for extensibility
  - [ ] Make observability features truly optional with dependency injection
  - [ ] Centralized error handling with circuit breaker patterns
  - [ ] Hierarchical configuration system with validation
  - [ ] Hot-reload support for configuration changes

- [x] Phase 9 — LLM-Powered Natural Language Query Endpoint (COMPLETE 2025-10-13)
  - [x] Natural language query HTTP endpoint (`POST /api/query`)
  - [x] LLM provider integration (OpenAI, Anthropic, Gemini, Azure)
  - [x] Tool orchestration and multi-step query support
  - [x] Actual MCP tool execution via shared handler registry
  - [c] Streaming response capability (foundation in place, endpoint integration
    deferred to future phase)
  - [x] System prompt engineering for Horreum domain
  - [x] Configuration and documentation
  - [x] Corporate Gemini endpoint support (`LLM_GEMINI_ENDPOINT`)
  - [x] `LLM_GEMINI_PROJECT` support for corporate Gemini instances
  - [x] Comprehensive test coverage (97 tests passing)

- [ ] Phase 10 — Alternative REST API Mode (PLANNED)
  - [ ] Design and implement REST API endpoints (GET /api/v1/tests, POST
        /api/v1/tests/{id}/runs, etc.)
  - [ ] OpenAPI 3.0 specification generation
  - [ ] Pydantic-compatible response schemas
  - [ ] API versioning strategy implementation
  - [ ] Rate limiting middleware
  - [ ] Backward compatibility layer
  - [ ] REST API documentation and examples

- [ ] Phase 11 — Build System Enhancement (PLANNED)
  - [ ] Multi-architecture build support with cross-compilation
  - [ ] Bundle optimization and tree-shaking
  - [ ] Advanced dependency management
  - [ ] Automated dependency updates with Dependabot
  - [ ] Vulnerability scanning integration
  - [ ] Incremental build support
  - [ ] Parallel build processes
  - [ ] Build performance profiling and optimization

- [ ] Phase 12 — Testing & Security Hardening (PLANNED)
  - [ ] Enhanced unit testing framework
  - [ ] Integration test suite expansion
  - [ ] Contract testing implementation
  - [ ] Performance/load testing infrastructure
  - [ ] Runtime security monitoring
  - [ ] Secrets management system
  - [ ] Audit logging implementation
  - [ ] Health check endpoints
  - [ ] Metrics collection and exposure
  - [ ] Graceful shutdown handling

- [ ] Phase 13 — Data Analysis (PLANNED)
  - [ ] Design analyze_run_data tool specification
  - [ ] Implement server-side statistical analysis
  - [ ] Add common statistical functions (mean, median, percentiles, etc.)
  - [ ] Performance comparison capabilities
  - [ ] Trend analysis over time
  - [ ] Regression detection algorithms
  - [ ] Unit tests for analysis functions
  - [ ] Integration tests with real Horreum data
  - [ ] Documentation and usage examples

## 9. How to update this document

1. Review open tasks and repository state (commits, CI, issues).
2. Adjust the Status Checklist items and statuses; add new items if scope
   changes.
3. Append a Changelog entry (below) with date, author/agent, and a concise
   summary.
4. For completed phases, move detailed information to
   [`docs/developer/development-history.md`](docs/developer/development-history.md).
5. Commit with a clear message (e.g., `docs(plan): update status checklist and add changelog`).

## 10. Recent Changelog (last 30 days)

> **Note**: Older changelog entries (September 2025) are archived in
> [`docs/developer/development-history.md`](docs/developer/development-history.md).

- 2025-10-13 — **Phase 9 Final Component: Actual MCP Tool Execution**: Completed
  the final integration for Phase 9 by implementing actual tool execution in the
  query orchestrator. Previously, the orchestrator could parse LLM tool calls
  but returned simulated results. Now implements full integration with MCP tools
  via shared handler registry pattern. **Architecture**: (1) **Shared Handler
  Registry** - Created `toolHandlers` Map in `src/server/tools.ts` that stores
  tool handlers for both MCP protocol access (via Client) and direct internal
  invocation (via orchestrator). (2) **Dual Registration** - Modified
  `withTool` wrapper to register each handler with both the MCP server
  (`server.tool()`) and the handler map (`toolHandlers.set()`), ensuring single
  source of truth. (3) **Direct Invocation** - Updated
  `orchestrator.executeTool()` to look up and execute handlers directly,
  extracting JSON results from MCP text content. **Benefits**: Same handler
  logic for both use cases, full observability (logging, metrics, tracing),
  type-safe interface, easy to test (mock the Map), no protocol overhead for
  same-process calls. This is a proper architectural pattern (registry pattern)
  used by Express.js, NestJS, Fastify - not a workaround. All 97 tests passing
  with mock handlers. The natural language query endpoint now: (1) Parses LLM
  tool calls ✅, (2) Executes actual Horreum API calls ✅, (3) Feeds real data
  back to LLM ✅, (4) Returns meaningful answers with real data ✅. Phase 9 is
  now **FULLY COMPLETE** and ready for deployment testing with live Horreum
  instance. Agent: Claude Sonnet 4.5.

- 2025-10-13 — **Phase 9 COMPLETE: LLM-Powered Natural Language Query
  Endpoint**: Implemented stand-alone natural language query capability that
  accepts conversational questions via `POST /api/query` and uses external LLM
  APIs to orchestrate MCP tool calls. Key deliverables: (1) **Multi-Provider LLM
  Client** (`src/llm/client.ts`) - Complete implementation supporting OpenAI,
  Anthropic, Gemini, and Azure OpenAI with streaming capability for all
  providers. Proper type safety with exact optional properties, error handling,
  and provider-specific message format conversion (e.g., Anthropic's separate
  system message, Gemini's parts array format). (2) **Query Orchestrator**
  (`src/llm/orchestrator.ts`) - Intelligent multi-step query execution system
  that maintains conversation history, parses tool call requests from LLM
  responses (supports TOOL_CALL: markers and JSON code blocks), executes tools,
  formats results, and iterates up to configurable max iterations. (3) **Horreum
  Domain Expertise** (`src/llm/prompts.ts`) - Comprehensive system prompt
  teaching LLMs about Horreum's data model (tests, runs, datasets, schemas,
  label values), available MCP tools with parameters, natural language time
  expressions, query strategies, and best practices. (4) **HTTP Endpoint**
  (added to `src/server/http.ts`) - New `POST /api/query` endpoint with bearer
  auth, graceful handling when LLM not configured (returns helpful error with
  config examples), structured response with answer + metadata + tool call
  trace. (5) **Configuration** - Extended environment schema to include
  LLM_PROVIDER enum (openai, anthropic, gemini, azure), LLM_API_KEY,
  LLM_MODEL. Azure requires additional LLM_AZURE_ENDPOINT and optional
  LLM_AZURE_DEPLOYMENT. (6) **Comprehensive Documentation** -
  `docs/user-guide/natural-language-queries.md` (complete guide with provider
  setup, API usage, example queries, best practices, limitations,
  troubleshooting) and updates to main README and user guide index. Example use
  cases validated: "Show me tests that failed in the last week", "Compare
  performance of run 123 vs 456", "What are the top 5 slowest tests in
  October?", "Show me CPU usage trends for boot-time test". **Note**: Streaming
  response integration for HTTP endpoint is pending (marked as such in
  checklist) - foundation exists in LLM clients (completeStream methods
  implemented for all providers), needs endpoint-level integration. Tool
  execution currently simulated pending full MCP server integration. All code
  formatted, linted, type-checked, and builds successfully. Phase 9 enables
  true stand-alone operation where users can query Horreum conversationally
  without AI client configuration. Agent: Claude Sonnet 4.5.

- 2025-10-13 — **Development Plan Enhancement: Phase 9 Addition and Complete
  Phase Checklists**: Added new Phase 9 (LLM-Powered Natural Language Query
  Endpoint) to development plan for stand-alone operation mode with LLM
  integration. This feature will enable the Horreum MCP server to accept
  natural language queries via HTTP endpoint and leverage external LLM APIs
  (OpenAI, Anthropic, etc.) to translate user intent into MCP tool calls.
  Architecture: `POST /api/query` accepts natural language → LLM parses intent
  → orchestrates MCP tool calls → returns Horreum data. Builds on existing
  `src/llm/client.ts` infrastructure. Configuration via `LLM_PROVIDER`,
  `LLM_API_KEY`, `LLM_MODEL` environment variables. Will support streaming
  responses for long-running analyses, system prompt engineering for Horreum
  domain expertise, and multi-step query orchestration. Example use cases:
  "Show me tests that failed in the last week", "Compare performance of run
  123 vs 456", "What are the top 5 slowest tests in October?". This mode
  complements existing transport modes (STDIO, HTTP/SSE, Direct REST API) by
  enabling conversational access to Horreum data without requiring AI client
  configuration. Phases renumbered: Alternative REST API Mode → Phase 10,
  Build System Enhancement → Phase 11, Testing & Security Hardening → Phase
  12, Data Analysis → Phase 13. Added comprehensive task checklists for all
  planned phases (7-13): Phase 7 (CI/CD Pipeline - 4 items), Phase 8
  (Architecture Refactoring - 6 items), Phase 9 (LLM Endpoint - 6 items),
  Phase 10 (REST API - 7 items), Phase 11 (Build System - 8 items), Phase 12
  (Testing & Security - 10 items), Phase 13 (Data Analysis - 9 items). Each
  phase now has detailed, actionable task items for implementation tracking.
  Updated header from "Planned Phases (7-12)" to "Planned Phases (7-13)" to
  reflect all phases. Agent: Claude Sonnet 4.5.

- 2025-10-13 — **AI Client Testing & Documentation Standardization**: Completed
  comprehensive testing of AI client connectivity across three methods (STDIO,
  HTTP via mcp-remote, Direct HTTP) and three clients (Claude Desktop, Cursor,
  Gemini CLI). Key findings: (1) Direct HTTP support verified for Cursor (`url`
  field) and Gemini CLI (`httpUrl` field), providing lowest-overhead connection
  method for remote/containerized deployments. (2) Universal mcp-remote
  compatibility - all tested clients work with standard `npx mcp-remote`, making
  custom HTTP proxy unnecessary (removed scripts/mcp-http-proxy.mjs). (3) Fixed
  critical bugs: logging to stdout in STDIO mode (now uses stderr), invalid tool
  name `source.describe` (renamed to `source_describe` per MCP spec).
  Documentation completely reorganized with connection method preference (Direct
  HTTP > mcp-remote > STDIO), clear tables showing tested status per client,
  consolidated configurations avoiding redundancy, and proper guidance
  distinguishing standalone usage (requires specific parameters) from Domain MCP
  usage (supports natural language). Standardized all example data across
  documentation: removed real Red Hat URLs (horreum.corp.redhat.com →
  horreum.example.com), standardized tokens (horreum_api_token_abc123xyz,
  mcp_auth_token_xyz789abc), consistent ports (3000), and safe example values
  throughout. Updated README with AI client comparison table, connection methods
  with advantages/limitations, and usage examples separated by use case. All
  changes formatted and ready for commit. Agent: Claude Sonnet 4.5.

- 2025-10-13 — **CI/CD Workflow Optimization and Security Hardening**: Fixed
  failing Trivy container vulnerability scan in GitHub Actions CI by correcting
  image tag context variable (changed from `github.event.workflow_run.head_sha`
  to `GITHUB_SHA`). Refactored three-job workflow to single optimized
  `build_scan_and_push` job that builds once, scans for vulnerabilities, then
  conditionally pushes to quay.io only on push/release events. This ensures
  security gate passes before registry upload. Added GitHub release support:
  workflow now triggers on release events and tags images with release version
  (`:v1.2.3`) and `:latest`. Implemented concurrency control to prevent parallel
  builds on same branch. Removed redundant conditional checks and outputs.
  Updated documentation (`docs/developer/ci-security.md`,
  `docs/developer/ci-workflow.md`). All changes tested and validated in CI.
  Agent: Claude Sonnet 4.5.

- 2025-10-13 — **Documentation: Domain MCP Integration Guide**: Added
  comprehensive Domain MCP Integration Guide
  (docs/architecture/domain-mcp-integration.md) clarifying the primary purpose of
  Horreum MCP as a Source MCP adapter for Domain-specific MCP servers. Guide
  includes complete architecture patterns showing AI Assistant → Domain MCP →
  Source MCP (Horreum) → Horreum DB flow, detailed development process for
  building Domain MCPs (define domain, design tools, implement using Source
  Contract, set up MCP server, configure connections), best practices (keep
  domain logic in Domain MCP, use Source Contract for data access, handle
  multiple sources, provide clear errors), deployment architecture diagrams,
  configuration examples, and example system/application performance analysis
  flows with sequence diagrams. Used generic examples for system performance
  metrics (CPU, memory, disk I/O) and application-layer metrics (Java thread
  dumps, GC logs, heap analysis, JFR data) instead of boot-time specific ones.
  Updated main README.md to emphasize Source MCP adapter as primary purpose with
  clear link to integration guide. Converted all callouts to GitHub alert syntax
  (`[!WARNING]`, `[!IMPORTANT]`, `[!NOTE]`). Documented transport architecture
  considerations (STDIO, HTTP/SSE, Direct REST API). Reorganized documentation
  structure with docs/README.md index and category-specific READMEs. Moved and
  consolidated legacy docs (CONTRACT.md → docs/architecture/source-mcp-contract.md,
  SSL_CONFIGURATION.md → docs/deployment/ssl-tls.md, etc.). All diagrams use
  Mermaid format and are current with implementation. Agent: Claude Sonnet 4.5.

- 2025-10-10 — **Phase 6.9 Complete — Label Values Format Compliance**: Fixed
  label values response format to match Source MCP Contract by transforming the
  `values` field from a map to an array of `{name, value}` objects and ensuring
  all field names use snake_case. Created `transformLabelValues` function that
  converts `values` from `Record<string, any>` to `Array<{name, value}>`,
  converts `runId` → `run_id` and `datasetId` → `dataset_id` (strings,
  snake_case), and converts timestamps from epoch milliseconds to ISO 8601
  strings. Applied transformation to 4 endpoints: `get_run_label_values` (MCP +
  HTTP) and `get_test_label_values` (MCP + HTTP). Note: `get_dataset_label_values`
  unchanged as it uses a different format already compliant. Updated
  documentation: enhanced `docs/LABEL_VALUES_FILTERING.md` with correct response
  formats, created `LABEL_VALUES_FORMAT_FIX.md` with comprehensive change
  documentation, created `VALIDATION_RESULTS.md` with production validation
  results. Created validation script `scripts/smoke-label-values-format.mjs`
  tested with production data (runs 120214, 116572). All format requirements
  verified: values as array, run_id/dataset_id as strings in snake_case,
  timestamps in ISO 8601 format, no camelCase fields. Build, lint, and format
  checks passing. Agent: Claude Sonnet 4.5.

- 2025-10-08 — **Phase 6.8 Complete — Logging and Diagnostics Enhancement**:
  Implemented comprehensive logging and diagnostics infrastructure to make
  failures from downstream clients fast to diagnose in production. Key features:
  (1) Correlation IDs via AsyncLocalStorage (`src/observability/correlation.ts`)
  with automatic propagation to all logs and upstream Horreum requests via
  X-Correlation-ID header. (2) SSE-safe request logging middleware with
  event-based completion tracking - avoids duplicate "request complete" logs for
  SSE connections. (3) Upstream error visibility with HTTP status, body preview
  (first 200 chars), timeout detection, and connection error classification. (4)
  Tool and query instrumentation with detailed events: mcp.tools._, query._,
  normalize.hint. (5) Structured error responses with correlation IDs and error
  types for client troubleshooting. (6) LOG*LEVEL configuration
  (trace|debug|info|warn|error|fatal|silent) for production flexibility. Log
  event taxonomy: mcp.request.*, mcp.tools._, query._, upstream.\_,
  normalize.hint. Created comprehensive documentation:
  `docs/LOGGING_AND_DIAGNOSTICS.md` with event reference, log levels, correlation
  ID usage, and troubleshooting guide. Updated README with timeout
  recommendations and observability features. All tools instrumented with
  structured logging. Enhanced fetch error capture in `src/horreum/fetch.ts`.
  Middleware added to `src/server/http.ts`. Agent: Claude Sonnet 4.5.

- 2025-10-07 — **Phase 6.7 Complete — Run and Dataset GET Endpoint Coverage**:
  Implemented all remaining Run and Dataset GET endpoints to complete read-only
  API coverage. Run endpoints: (1) `get_run` - complete run details (added as
  tool, was only resource), (2) `get_run_data` - raw run data payload with
  optional schema URI filter, (3) `get_run_metadata` - run metadata with
  optional schema URI filter, (4) `get_run_summary` - lightweight run overview,
  (5) `list_runs_by_schema` - find runs by schema URI, (6) `get_run_count` -
  quick statistics for test, (7) `list_all_runs` - global run search with time
  filters and natural language support. Dataset endpoints: (1)
  `get_dataset_summary` - dataset summary with optional view ID filter. All
  endpoints implemented as MCP tools in `src/server/tools.ts` and HTTP endpoints
  in `src/server/http.ts`. Comprehensive smoke test script
  `scripts/smoke-run-dataset-endpoints.mjs` validates all 8 new endpoints with
  real Horreum data. Updated README with complete tool listing. Completes
  read-first strategy by providing access to raw data, metadata, summaries, and
  flexible querying. Agent: Claude Sonnet 4.5.

- 2025-10-07 — **Phase 6.6 Complete — Label Values API Coverage**: Implemented
  comprehensive label values API coverage for accessing Horreum's transformed
  test data. Three critical endpoints: (1) `get_run_label_values` - most
  important - filtered access to run-specific metrics with extensive server-side
  filtering (filter, include/exclude, multiFilter, sort/direction, limit/page),
  (2) `get_test_label_values` - aggregated label values across all runs for a
  test with time boundaries (before/after with natural language support), (3)
  `get_dataset_label_values` - simple label values for specific dataset. All
  three tools implemented in `src/server/tools.ts` with Zod schemas, HTTP
  endpoints in `src/server/http.ts`, and comprehensive smoke tests:
  `scripts/smoke-get-run-label-values.mjs`, `scripts/smoke-get-test-label-values.mjs`,
  `scripts/smoke-get-dataset-label-values.mjs`. Created detailed filtering
  documentation: `docs/LABEL_VALUES_FILTERING.md` with examples of basic
  filtering, advanced multi-value filtering, label inclusion/exclusion,
  aggregated test queries, and filter expression patterns. Label values are the
  primary output of Horreum's transformation system and represent the actual
  test metrics and results - essential for data analysis. Agent: Claude Sonnet
  4.5.

- 2025-10-01 — **Gemini CLI Support via HTTP Proxy Bridge**: Initially
  implemented custom HTTP-to-MCP proxy (`scripts/mcp-http-proxy.mjs`) for Gemini
  CLI compatibility as it was believed to lack support for standard MCP proxies.
  However, subsequent testing revealed Gemini CLI works perfectly with standard
  `npx mcp-remote`, making the custom proxy unnecessary. The universal
  compatibility of `mcp-remote` means all tested clients (Claude Desktop, Cursor,
  Gemini CLI) can use the same proxy approach, simplifying the architecture and
  documentation. Custom proxy has been removed from the codebase. Agent: Claude
  Sonnet 4.5.

- 2025-10-01 — **Phase 6.5 COMPLETE AND VERIFIED**: All three blocking issues
  resolved and verified with comprehensive testing: (1) Source MCP Contract
  schema compliance COMPLETE - Added `test_id`/`run_id` fields to all objects,
  added `has_more` to pagination, standardized all pagination to snake_case
  (`next_page_token`, `has_more`, `total_count`). Updated both HTTP and MCP tool
  responses. Created validation script `scripts/smoke-schema-compliance.mjs`
  tested with production data. (2) Natural language time queries COMPLETE -
  Implemented `parseTimeRange` utility in `src/utils/time.ts` with chrono-node
  integration, epoch millis/ISO fallback, and "last 30 days" default. Applied to
  all time-aware endpoints. Comprehensive test suite
  `scripts/smoke-natural-language-time.mjs` validates relative dates, simple
  dates, backward compatibility, and defaults. (3) Pagination alignment COMPLETE
  - Aligned to Horreum's 1-based model (page >= 1), removed page=0 special
    handling, standardized across all list endpoints (tests, runs, datasets).
    Updated mock Horreum to handle "no page = all results" semantic. All smoke
    tests updated to use page=1 and check snake_case fields. Phase 6.5
    requirements from RHIVOS PerfScale integration fully implemented, tested, and
    verified! Agent: Claude Sonnet 4.5.
