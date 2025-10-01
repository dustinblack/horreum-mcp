# Original prompt

I would like to start a project to build a generalized Model Context Protocol server for Horreum. Help me devise a strategy for developing and testing this project. Suggest what language and standards we should use.

# Horreum MCP Server: Development and Testing Strategy

This document outlines a strategy for developing and testing a Model Context Protocol (MCP) server that exposes Horreum capabilities as MCP tools and resources for AI clients.

### 1. Recommended Language and Standards

To align with the MCP ecosystem and integrate with Horreum via its HTTP APIs, the project will use the following stack:

- **Language**: TypeScript (Node.js 20 LTS)
- **MCP SDK**: `@modelcontextprotocol/sdk` (server)
- **Package Manager**: `pnpm` (or `npm`)
- **Tooling**: ESLint, Prettier, tsup (bundling), ts-node (dev)
- **Licensing**: Apache 2.0

Note: We will still adhere to Horreum/Hyperfoil contribution expectations for licensing and general code quality, while choosing TypeScript for first-class MCP support.

### 2. Development Strategy

The development will follow an iterative, phased approach with a read-first priority: implement and stabilize read-oriented tools before write-capable tools.

**Phase 1: Core MCP Server and Read Tools**

1.  **Project Scaffolding**: Initialize a TypeScript project and MCP server using the official SDK.
2.  **MCP Manifest**: Define server metadata and register initial tools/resources.
3.  **Read Tools (Horreum API)**: Implement tools that fetch data from Horreum (optional token-based auth):
    - `list_tests`: List Horreum tests with pagination and filters.
    - `get_schema`: Retrieve a Horreum schema by name or ID.
    - `list_runs`: List runs for a test with pagination and time filters.
4.  **Config & Auth**: Use environment variables for `HORREUM_BASE_URL` and optional `HORREUM_TOKEN` (omit for anonymous access).
5.  **Horreum Client Generation**: Generate a TypeScript client from the Horreum OpenAPI spec (via `openapi-typescript-codegen`) and use it directly. Centralize auth/headers via the generated `OpenAPI` config; optional retries/backoff and rate limiting remain in scope.

**Phase 2: Write Tools and Uploads**

1.  **upload_run**: Upload a run/dataset into a target test, with validation.
2.  **create_test (optional)**: Create a new test with a given schema reference.
3.  **Idempotency & Safety**: Support dry-run mode and idempotency keys where applicable.
4.  **Error Scenarios**: Handle specific error cases (network timeouts: 30s, auth failures: clear messaging, Horreum unavailable: graceful degradation).

**Phase 3: Observability and Hardening**

1.  **Logging/Tracing**: Structured logs; optional OpenTelemetry.
2.  **Rate Limits/Backoff**: Handle Horreum API backoff and error propagation.
3.  **Caching (optional)**: In-memory cache for hot reads with TTL.

**Phase 4: HTTP Standalone Mode**

1.  **HTTP Transport**: Implement HTTP server mode using `StreamableHTTPServerTransport` from MCP SDK with Express.js.
2.  **Dual Mode Support**: Support both stdio (current) and HTTP modes via configuration.
3.  **External LLM Integration**: Add configurable LLM API client for external inference (OpenAI, Anthropic, Azure, etc.).
4.  **Session Management**: Implement HTTP session management with UUIDs and optional resumability.
5.  **HTTP Security**: CORS configuration, Bearer token authentication, DNS rebinding protection.
6.  **Deployment Options**: Enable containerized deployments and cloud hosting scenarios.

**Phase 5: Containerization & Multi-Architecture Support**

- Container image: UBI9 Node.js 20 multi-stage build, non-root user (uid 10001),
  minimal runtime with production deps only; default HTTP mode on port 3000.
- Health endpoints exposed by HTTP server: `/health` (liveness, no auth) and
  `/ready` (readiness, enforces bearer auth when configured).
- Multi-architecture builds (amd64, arm64) using Buildah/Podman with a manifest
  list and optional push to registry; expiration label supported.
- Reusable build script: `scripts/build_multiarch.sh`
  - Inputs: `IMAGE_REPO`, `REGISTRY_USERNAME`/`REGISTRY_PASSWORD` (or
    `QUAY_USERNAME`/`QUAY_PASSWORD`), optional `OCI_REVISION`.
  - Options: `--tag`, `--push`, `--push-main`, `--expires`, `--file`.
  - Applies label `${EXPIRES_LABEL}` (default `quay.expires-after`) and
    `org.opencontainers.image.revision`.
- Automated registry deployment (quay.io) via CI runner using Buildah, gated on
  changes to `Containerfile`, sources, and CI config.
- Security: add container vulnerability scanning (e.g., Trivy or osv-scanner),
  and image hardening tasks (rootless, minimal packages, labels).

**Phase 6: Direct HTTP API for Server-to-Server Integration (COMPLETED 2025-09-30)**

This phase addressed integration requirements from RHIVOS PerfScale MCP end-to-end testing. These changes enable Domain MCP servers to call Horreum MCP directly via HTTP POST endpoints without requiring MCP client libraries.

1. **Direct HTTP Tool Endpoints**: Add POST endpoints that mirror MCP tools:
   - `POST /api/tools/horreum_list_runs` - List runs with time filtering ✅
   - `POST /api/tools/horreum_get_run` - Get specific run by ID ✅
   - `POST /api/tools/horreum_list_tests` - List tests with optional name filter ✅
   - `POST /api/tools/horreum_list_schemas` - List available schemas ✅
   - `POST /api/tools/horreum_get_schema` - Get schema by ID or name ✅
   - `POST /api/tools/horreum_list_datasets` - Search/list datasets by test, schema, or time ✅ **WITH WORKAROUND**
   - `POST /api/tools/horreum_get_dataset` - Get raw dataset content by ID ✅
   - All endpoints accept Bearer token auth and return JSON responses ✅
   - Use same underlying Horreum API calls as MCP tools ✅

   **WORKAROUND NOTE**: The `horreum_list_datasets` endpoint contains a workaround for a Horreum server bug where using `limit` + `page=0` parameters together causes HTTP 500 errors. The workaround omits the `page` parameter when `page=0`. However, this is **semantically incomplete** as it doesn't align with Horreum's 1-based pagination model (pages start at 1, not 0). The correct fix is to align our pagination with Horreum's design (see Phase 6.5).
   - **Location**: `src/server/http.ts` (lines ~948-980) and `src/server/tools.ts` (lines ~588-620)
   - **Bug tracked**: [Hyperfoil/Horreum#2525](https://github.com/Hyperfoil/Horreum/issues/2525)
   - **Proper fix**: Phase 6.5 pagination alignment (use 1-based pagination throughout)
   - **Analysis**: See `HORREUM_PAGINATION_ANALYSIS.md`

**Phase 6.5: End-to-End Integration Fixes (PRIORITY - HIGH)**

This phase addresses three critical issues discovered during end-to-end testing with the RHIVOS PerfScale Domain MCP that are blocking full integration. These must be completed before Phase 7.

**References:**

- `/home/dblack/git/gitlab/perfscale/sandbox/rhivos-perfscale-mcp/docs/horreum-mcp-schema-fixes.md`
- `/home/dblack/git/gitlab/perfscale/sandbox/rhivos-perfscale-mcp/docs/horreum-mcp-time-query-requirements.md`
- `HORREUM_PAGINATION_ANALYSIS.md` (pagination alignment analysis)
- [Hyperfoil/Horreum#2525](https://github.com/Hyperfoil/Horreum/issues/2525) (pagination bug)

1. **Source MCP Contract Schema Compliance (CRITICAL)**: Fix Pydantic validation errors
   - **Problem**: Response schemas don't match Source MCP Contract, causing validation failures in Domain MCP
   - **Impact**: Domain MCP cannot parse responses from Horreum MCP endpoints
   - **Required fixes**:
     - Add `test_id` field to all test objects (duplicate of `id` field per contract)
     - Add `run_id` field to all run objects (duplicate of `id` field per contract)
     - Note: `dataset_id` already exists and is correct ✅
     - Add `has_more` boolean field to all pagination objects
     - **Standardize to snake_case naming throughout all responses**:
       - `nextPageToken` → `next_page_token`
       - `hasMore` → `has_more` (also add where missing)
       - `totalCount` → `total_count`
     - Ensure consistency: All HTTP responses use snake_case per Source MCP Contract
   - **Affected endpoints**: All list endpoints (tests, runs, datasets)
   - **Implementation**: Update response mapping in `src/server/http.ts` and `src/server/tools.ts`
   - **Testing**: Verify with curl + jq that responses match contract schema exactly

2. **Natural Language Time Query Support (CRITICAL)**: Enable AI-friendly time queries
   - **Problem**: Endpoints reject natural language time expressions ("last week", "yesterday")
   - **Impact**: AI clients must calculate dates instead of passing through user intent
   - **Architectural rationale**: Time parsing is a generic data layer concern, not domain-specific
   - **Required support**:
     - Accept relative time: "last week", "yesterday", "last 7 days", "now", "today"
     - Accept simple dates: "2025-09-24"
     - Maintain backward compatibility with ISO 8601 and epoch millis
     - **Add intelligent default behavior**: When no time parameters provided:
       - Default to "last 30 days" to avoid overwhelming responses
       - Log the applied default for transparency
       - Document this behavior clearly in tool descriptions
   - **Affected endpoints**: `horreum_list_runs`, `horreum_list_datasets`
   - **Recommended library**: `chrono-node` (MIT license, actively maintained)
   - **Implementation**:
     - Create time parsing utility in `src/utils/time.ts` with fallback chain:
       1. Try chrono-node natural language parsing
       2. Fall back to epoch milliseconds parsing
       3. Fall back to ISO 8601 parsing
       4. Apply default if not provided
     - Integrate into affected tools/endpoints
   - **Schema updates**: Update tool descriptions to document natural language support and default behavior
   - **Testing**: Comprehensive test suite for relative dates, edge cases, defaults, and format compatibility

3. **Pagination Alignment with Horreum (CRITICAL)**: Fix semantic mismatch with 1-based pagination
   - **Problem**: Our API uses `page >= 0` semantics, but Horreum uses 1-based pagination (`page >= 1`)
   - **Impact**:
     - Incomplete workaround for Horreum bug #2525 (page=0 + limit causes 500 errors)
     - Semantic confusion: `page=0` interpreted as "all results" instead of "first page"
     - Mixed pagination strategies across codebase (server-side, client-side, special cases)
   - **Root cause**: Horreum pagination starts at page 1, not page 0; `page=0` behavior is undefined/inconsistent
   - **Required fixes**:
     - Update schema validators: `page >= 1` (not `page >= 0`)
     - Remove `page=0` special handling that returns "all results"
     - Always send `page >= 1` to Horreum APIs (never omit or send page=0)
     - Update default pagination: `page = legacyPage ?? 1` (already correct in some places)
     - Standardize pagination strategy across all list endpoints
   - **Affected endpoints**: All list endpoints (tests, runs, datasets) - HTTP and MCP
   - **Implementation**:
     - Update `src/server/http.ts` (lines 217-380, 478-555, 950-1030)
     - Update `src/server/tools.ts` (lines 301-360, 391-510, 548-640)
     - Update schema definitions for page parameter
   - **Testing**: Update smoke tests to use `page=1` as first page, validate rejection of `page=0`
   - **Benefit**: Once Horreum fixes bug #2525, no workaround needed - our code will already be correct!
   - **Reference**: See `HORREUM_PAGINATION_ANALYSIS.md` for detailed analysis

4. **Standardized Error Handling (CR-20250930-1)**: Implement Source MCP Contract error format:
   - Structured error codes: INVALID_REQUEST, NOT_FOUND, RATE_LIMITED, INTERNAL_ERROR, SERVICE_UNAVAILABLE, TIMEOUT
   - Consistent error response: `{error: {code, message, details, retryable, retryAfter?}}`
   - Helpful context in error details (IDs, suggestions, available options)
   - Machine-parseable and human-readable error messages

5. **Pagination Support (CR-20250930-3)**: Implement consistent pagination for all list tools:
   - Input parameters: pageToken (opaque), pageSize (1-1000, default 100)
   - Response format: `{data: [...], pagination: {nextPageToken?, hasMore, totalCount?}}`
   - Opaque page tokens (base64 encoded cursors)
   - Consistent ordering across pages (timestamp DESC)
   - Map to Horreum's pagination mechanism

6. **Schema URI Filtering (CR-20250930-4)**: Add dataset filtering by schema:
   - Add schemaUri parameter to datasets.search tool
   - Exact match on dataset.$schema field
   - Support combining with other filters (testId, time range)

7. **Capability Discovery (CR-20250930-2)**: Implement source.describe tool:
   - Return sourceType, version, contractVersion
   - Expose capabilities: pagination, caching, streaming, schemas
   - Document limits: maxPageSize, maxDatasetSize, rateLimitPerMinute

8. **Documentation Improvements (CR-20250930-5)**:
   - Clarify time range filtering (from/to parameters)
   - Document timestamp field used, inclusivity, timezone handling
   - Add examples and error handling for edge cases

9. **SSL/TLS Certificate Configuration**:
   - Support for corporate/self-signed SSL certificates via mounted CA bundles
   - User-friendly `HORREUM_TLS_VERIFY` environment variable (defaults to `true`)
   - Automatic CA trust update in container entrypoint when certificates are mounted
   - Container requires `--user=0` to run `update-ca-trust` for CA certificate support
   - Comprehensive documentation in `SSL_CONFIGURATION.md` with production and testing examples
   - Testing-only option to disable SSL verification via `HORREUM_TLS_VERIFY=false`

**Phase 7: Enhanced CI/CD Pipeline**

- Multi-stage testing pipeline with parallel execution and performance regression testing
- Comprehensive security scanning (osv-scanner, SAST, license compliance)
- Performance optimizations (caching, job interruption, conditional workflows)
- Release automation (semantic versioning, NPM/container publishing)

**Phase 8: Architecture Refactoring & Modularity**

- Extract shared logic into reusable modules with plugin architecture
- Make observability features truly optional with dependency injection
- Centralized error handling with circuit breaker patterns
- Hierarchical configuration system with validation and hot-reload

**Phase 9: Alternative REST API Mode**

- REST API endpoints (`GET /api/v1/tests`, `POST /api/v1/tests/{id}/runs`, etc.)
- OpenAPI 3.0 specification with Pydantic-compatible responses
- API versioning strategy with rate limiting and backward compatibility

**Phase 10: Build System Enhancement**

- Multi-architecture builds with cross-compilation and bundle optimization
- Advanced dependency management with automated updates and vulnerability scanning
- Build performance optimization (incremental builds, parallel processes)

**Phase 11: Testing & Security Hardening**

- Enhanced testing framework (unit, integration, contract, performance testing)
- Runtime security monitoring with secrets management and audit logging
- Operational readiness (health checks, metrics, graceful shutdown)

**Phase 12: Data Analysis**

- `analyze_run_data` tool for server-side statistical analysis with testing

### 3. Testing Strategy

A multi-layered testing approach will be implemented, following the read-first priority by stabilizing read tools before write tools.

1.  **Smoke Tests (in-memory transport)**: Innovative lightweight smoke tests validate `ping`,
    `list_tests` (folder-aware), `get_schema`, `list_runs` (time filters), and
    `upload_run` without external dependencies; executed in CI. Smokes use generic
    fixtures (e.g., `example-test`, id `123`) and in-memory MCP transport with mocked
    HTTP responses - this approach is highly effective for MCP server validation.
2.  **Unit Tests (Vitest or Jest)**: Test tool handlers and core utilities with mocked HTTP clients.
3.  **Integration Tests**: Use `nock` or `msw` to simulate Horreum endpoints; verify schema and error handling.
4.  **End-to-End (E2E)**: Exercise the MCP server via an MCP client (e.g., `mcp-cli`) to validate tool registration and execution.
5.  **Continuous Integration (CI)**: GitHub Actions on Node 20: install, lint, build, comprehensive smoke tests, and type-check.

### 4. MCP Tool Design Details

1. Tool schema: Define JSON Schemas for each tool input/output.
2. Error model: Uniform object `{ code, message, details, correlationId }` returned on failures.
3. Pagination/filtering: Inputs support `limit`, `offset`, `sort`, and filters; default `limit=50`, max `1000`.
4. Idempotency: For write tools, support idempotency tokens; read tools remain side-effect free.
5. Validation: Validate inputs against JSON Schema and sanitize outputs.
6. Read-first: Implement and stabilize read tools before write tools.
7. Cancellation: Honor MCP cancellation signals by wiring request-scoped `AbortController` into all outbound HTTP calls; fail fast with clear cancellation errors.
8. Streaming and large results: For potentially large results, use pagination by default and document limits. Support partial responses with continuation tokens where applicable.
9. Resources: In addition to tools, expose core Horreum entities as MCP resources with stable URIs (e.g., `horreum://tests/{id}`, `horreum://schemas/{id}`, `horreum://tests/{id}/runs/{runId}`). Implement resource discovery via the MCP resources listing, and include minimal metadata plus links to the corresponding tools.

### 5. Data Model and Persistence

No database is required for the MCP server. Optional components:

1. Caching: In-memory LRU cache (TTL) for frequent read endpoints.
2. Config: Environment-based configuration with validation at startup.
3. HTTP Mode: Optional HTTP server transport with session management and external LLM integration.

### 6. MCP Server Protocol and Horreum Auth

1. MCP registration: Server advertises tools/resources to the MCP client via the MCP protocol handshake.
2. Tool discovery: Implement `tools/list` handler to expose available tools with their schemas dynamically.
3. Horreum auth: Optional bearer token authentication (env `HORREUM_TOKEN`); support anonymous access when token is not provided; never log secrets when present.
4. Auth-aware tools: Read tools work in both authenticated and anonymous modes; write tools require authentication and fail gracefully with clear error messages when token is missing.
5. API versioning: Support Horreum API version compatibility by including `Accept: application/json` headers and handling version-specific endpoints.
6. Backoff/jitter: Exponential backoff with jitter on Horreum HTTP errors (initial: 1s, max: 30s, jitter: ±25%).
7. Rate limiting: Implement client-side rate limiting (default: 10 req/sec to Horreum) with configurable limits.
8. Idempotency: Write tools include idempotency tokens to avoid duplicates.
9. Authentication backends: Horreum commonly uses Keycloak/OIDC. Initial implementation supports static bearer token via `HORREUM_TOKEN`. Roadmap: optional interactive OIDC (device/PKCE) to obtain short-lived tokens; never persist secrets to disk.
10. Token refresh strategy: With static tokens no refresh occurs. When interactive OIDC is introduced, use standard refresh tokens in-memory only; redact secrets in logs.
11. Capability matrix:
    - Anonymous mode: `list_tests`, `get_schema`, `list_runs`.
    - Authenticated mode: all read tools plus `upload_run` and optional `create_test`.
    - Behavior differences should be clearly documented in tool descriptions and errors when auth is required.

### 7. Security and Safety

1. Least privilege: Use scoped Horreum tokens when provided; support anonymous read access; enforce request rate limits.
2. Secrets: Use secure env; never log secrets; redact known patterns; gracefully handle missing auth for read operations.
3. Auth validation: Validate token format at startup if provided; fail fast on malformed tokens.
4. Audit: Log tool invocations and Horreum interactions with correlation IDs; include auth mode (authenticated/anonymous) in logs.

### 8. Observability

1. Metrics: Basic counters/timers around tool execution and Horreum calls.
2. Tracing: Optional OpenTelemetry spans; propagate `correlationId`.
3. Logging: Structured JSON logs with event types and correlation IDs.
4. Health: Startup self-check for configuration and Horreum connectivity (optional).

### 8.1. Production Readiness & Operational Concerns

1. **Resource Consistency**: All MCP resources (tests, schemas, runs) must implement uniform error handling with correlation IDs, structured logging, metrics recording, and tracing spans.
2. **Security Hardening**: Implement token redaction in all error messages and logs; validate tokens at startup with secure error handling; never expose sensitive data in debug output.
3. **Health Monitoring**: Provide startup connectivity validation to Horreum; implement optional health check endpoint for operational monitoring.
4. **Error Boundaries**: Ensure all resource URI validation returns structured error objects rather than generic text responses.
5. **Dependency Security**: Continuous monitoring of dependencies for vulnerabilities; automated security scanning in CI pipeline.

### 9. CI/CD

**Current (Phase 1-5)**: Node 20, ESLint/Prettier, Vitest with coverage, smoke
tests, basic security scanning (`npm audit`, secretlint), path-based change
detection, containerized builds with multi-arch manifests and Trivy scanning.

Container build (Phase 5 specifics):

- Use a Buildah container job to invoke `scripts/build_multiarch.sh` with
  `IMAGE_REPO` and registry credentials from secrets, tagging `:main` on
  successful builds.
- Trigger on `main` branch when these paths change: `Containerfile`,
  `package.json`, `package-lock.json`, `src/**/*`, `.github/workflows/*`.
- Example invocation (CI job script):
  ```bash
  export IMAGE_REPO=quay.io/<org>/horreum-mcp
  export QUAY_USERNAME="${{ secrets.QUAY_USERNAME }}"
  export QUAY_PASSWORD="${{ secrets.QUAY_PASSWORD }}"
  bash scripts/build_multiarch.sh --tag "${GIT_SHORT_SHA}" --push --push-main
  ```

**Enhanced (Phase 6)**: Multi-stage testing, comprehensive security scanning
(osv-scanner, SAST, container scanning via Trivy job), performance optimizations
(caching, job interruption), release automation (semantic versioning, NPM/
container publishing), quality gates, deployment pipeline with rollback.

**Requirements**: SemVer for packages/containers, automated CHANGELOG.md maintenance, API documentation generation.

### 10. Deployment and Configuration

The deployment strategy supports multiple deployment modes and environments, from simple CLI usage to enterprise container orchestration.

#### Runtime Requirements

1. **Runtime**: Node 20 LTS with ES modules support
2. **Architecture Support**: Multi-architecture builds (amd64, arm64)
3. **Container Support**: Podman/Docker with multi-stage builds

#### Packaging Options

1. **NPM Package**: Traditional Node.js package for CLI and programmatic usage
2. **Container Images**:
   - Multi-architecture container images (amd64/arm64)
   - Minimal base images (Alpine/distroless) with non-root user
   - Optimized layer caching and build context filtering
   - Vulnerability scanning and security hardening
3. **Standalone Binaries**: Optional single-file executables for specific platforms

#### Deployment Modes

- **CLI Mode**: Direct Node.js execution for development and scripting
- **Container Mode**: Multi-architecture containerized deployment
- **HTTP Server Mode**: Persistent HTTP server for web API access
- **Kubernetes**: Helm charts and manifests for orchestrated deployment
- **Serverless**: Optional serverless function deployment

_Configuration details provided in Quickstart section below._

Note: A minimal Quickstart with an example `.env` is provided below.

### 11. Success Criteria and Non-Goals

1. Success (Phase 1–3):
   - Read tools provide consistent results with pagination and filtering in both authenticated and anonymous modes.
   - E2E: MCP client can list tests, fetch schemas, list runs in anonymous mode; and upload runs in authenticated mode (Phase 2).
   - Resilience to transient Horreum/network failures with retries/backoff.
   - Clear error messaging when authentication is required but not provided.
2. Non-goals (initial):
   - Multi-tenant authz/ACLs beyond token scoping.
   - Long-term persistence or complex scheduling.
   - Arbitrary file transfer beyond Horreum-compatible payloads.

### 12. Maintenance and Status (For AI Agents)

This section instructs any AI agent or maintainer on how to keep this plan authoritative and up-to-date, and how to report current progress at a glance.

1. Source of truth
   - This file (`mcp_development_plan.md`) is the single source of truth for the plan and status.
   - Always read this entire file before answering “What’s the plan?” or starting work.

2. Update policy
   - After any meaningful planning or implementation change, immediately update the Status Checklist and append a Changelog entry.
   - Use the Status Legend below consistently. Include dates in UTC as `(YYYY-MM-DD)`.
   - Respect the current execution directive: do not begin development unless explicitly authorized in this file or by the user.

3. Status legend
   - `[ ]` pending
   - `[ip]` in progress
   - `[x]` completed
   - `[c]` cancelled

4. Current execution directive
   - **Phase 6 (Direct HTTP API for Server-to-Server Integration) COMPLETED (2025-09-30)**.
   - **Phase 6.5 (End-to-End Integration Fixes) IN PROGRESS (2025-10-01)** - BLOCKING ISSUES
   - Three critical issues discovered during RHIVOS PerfScale Domain MCP end-to-end testing:
     1. ✅ **Schema compliance**: COMPLETE - Added test_id/run_id fields, has_more, snake_case naming
     2. ✅ **Time queries**: COMPLETE - Natural language time parsing integrated into all time-aware endpoints
     3. ✅ **Pagination alignment**: COMPLETE - Aligned to 1-based model (page >= 1)
   - **Current status**: ALL 3 ISSUES COMPLETE ✅ Phase 6.5 blocking issues resolved!
   - **Next**: Phase 7 (Enhanced CI/CD Pipeline)
   - These issues are **BLOCKING full end-to-end integration** and must be resolved immediately.
   - **AUTHORIZED**: Continue Phase 6.5 implementation.
   - **NEXT AFTER 6.5**: Phase 7 (Enhanced CI/CD Pipeline) - Security scanning, testing improvements, release automation.
   - Phase 8 (Architecture Refactoring) and beyond follow after Phase 7 completion.

5. Status checklist
   - Phase 1 — Planning
     - [x] Add read-first tools priority (2025-09-19)
     - [x] Confirm MCP server scope and TypeScript stack (2025-09-19)
     - [x] Embed AI maintenance instructions and status tracking (2025-09-19)
   - Phase 1 — Implementation (read-first)
     - [x] Scaffold TypeScript MCP server project (2025-09-19)
     - [x] Implement read tools: `list_tests`, `get_schema`, `list_runs` with optional
           auth support (2025-09-19)
     - [x] Enhance `list_tests`: folder-aware aggregation across all folders when no
           folder is specified (2025-09-22)
     - [x] Enhance `list_runs`: support `from`/`to` time filters and test name
           resolution to ID; client-side filtering across pages when needed
           (2025-09-22)
     - [x] Configure env (`HORREUM_BASE_URL`, optional `HORREUM_TOKEN`) and validation (2025-09-19)
     - [x] Set up CI (Node 20: lint, build, type-check + comprehensive smoke tests) (2025-09-19)
     - [x] CI smokes cover all core tools (`ping`, `list_tests`, `get_schema`, `list_runs`, `upload_run`)
           with mocked responses using in-memory transport (2025-09-22)
     - [x] Tighten TypeScript types in server; remove explicit anys in
           `src/server/tools.ts` (2025-09-22)
   - Phase 2 — Write tools
     - [x] Implement `upload_run` with basic validation and smoke tests (2025-09-19)
     - [ ] Optional: `create_test` and related utilities (pending)
   - Phase 3 — Observability & Hardening
     - [x] Implement client-side retries/backoff and rate limiting (2025-09-19)
     - [x] Add structured logging with correlation IDs and durations for all tools (2025-09-22)
     - [x] Remove redundant custom HTTP client; use generated OpenAPI client only
           (2025-09-22)
   - [x] Fix package.json metadata (description, author) and type issues
         (private field) (2025-09-22)
   - [x] Implement uniform error handling in all tools to return consistent error
         objects `{ code, message, details, correlationId }` per the plan specification (2025-09-22)
   - [x] Refactor to inject rate-limited fetch into OpenAPI client instead of
         patching global fetch (2025-09-22)
   - [x] Refactor tool implementations to reduce boilerplate (logging, CID) using a
         wrapper or utility function (2025-09-22)
   - [x] Replace console.log with a dedicated structured logging library (pino) (2025-09-22)
   - [x] Extend structured error handling and logging to resources
         (tests/schemas/runs) (2025-09-22)
   - [x] Optional: Prometheus metrics endpoint (counters/histograms) (2025-09-22)
   - [x] Optional: tracing (OpenTelemetry) with undici auto-instrumentation and
         tool/resource spans (2025-09-22)
   - Phase 4 — HTTP Standalone Mode
     - [x] Extend environment configuration for HTTP mode and LLM settings (2025-09-24)
     - [x] Implement HTTP transport using StreamableHTTPServerTransport with Express.js (2025-09-24)
     - [x] Add configurable LLM client for external API calls (OpenAI, Anthropic, Azure) (2025-09-24)
     - [x] Create hybrid entrypoint supporting both stdio and HTTP modes (2025-09-24)
     - [x] Implement session management with UUIDs and optional resumability (2025-09-24)
     - [x] Add HTTP security features (CORS, Bearer auth, DNS rebinding protection) (2025-09-24)
     - [x] Update documentation with HTTP standalone mode usage and deployment (2025-09-24)
     - [x] Add smoke tests for HTTP mode functionality (2025-09-24)
   - Phase 5 — Containerization & Multi-Architecture Support
   - [x] Create optimized `Containerfile` (UBI9 Node 20, multi-stage, non-root)
         (2025-09-25)
   - [x] Implement multi-architecture support via Buildah script
         (`scripts/build_multiarch.sh`) (2025-09-25)
   - [x] Set up automated container builds and registry deployment (quay.io)
         via GitHub Actions using Buildah + manifest push + Trivy scan
         (2025-09-25)
   - [x] Add container vulnerability scanning and security hardening (Trivy helper,
         OCI labels, STOPSIGNAL, HEALTHCHECK, non-root perms) (2025-09-26)
   - [x] Implement HTTP health endpoints (`/health`, `/ready`) (2025-09-25)
   - [x] Add build context filtering and layer optimization (.dockerignore, cache mounts)
         (2025-09-26)
   - [x] Fix WebAssembly and QEMU emulation issues for multi-architecture builds
         (2025-09-29)
   - [x] Phase 6 — Direct HTTP API for Server-to-Server Integration (COMPLETE)
     - [x] Add direct HTTP POST endpoints for MCP tools (`/api/tools/horreum_*`) (2025-09-30)
     - [x] Implement `POST /api/tools/horreum_list_runs` endpoint (2025-09-30)
     - [x] Implement `POST /api/tools/horreum_get_run` endpoint (2025-09-30)
     - [x] Implement `POST /api/tools/horreum_list_tests` endpoint (2025-09-30)
     - [x] Implement `POST /api/tools/horreum_list_schemas` endpoint (2025-09-30)
     - [x] Implement `POST /api/tools/horreum_get_schema` endpoint (2025-09-30)
     - [x] Implement `POST /api/tools/horreum_list_datasets` endpoint (2025-09-30)
     - [x] Implement `POST /api/tools/horreum_get_dataset` endpoint (2025-09-30)
     - [x] Standardize error handling with Source MCP Contract format (CR-20250930-1) (2025-09-30) - Added `sendContractError` helper with error codes, retryable flag, retryAfter - Applied to all HTTP endpoints with mapping for 404/401/403/429/503/504
     - [x] Implement consistent pagination across all list tools (CR-20250930-3) (2025-09-30) - Added pageToken/pageSize with backward compat for page/limit - Opaque base64 tokens - Response: `{data, pagination: {nextPageToken?, hasMore, totalCount?}}` - Applied to list_runs and list_tests - Added smoke test `scripts/smoke-http-pagination.mjs`
     - [x] Implement source.describe capability discovery tool (CR-20250930-2) (2025-09-30) - Added as MCP tool and HTTP endpoint - Returns sourceType, version, contractVersion, capabilities, limits - Added smoke test `scripts/smoke-http-source-describe.mjs`
     - [x] Document time range filtering behavior (CR-20250930-5) (2025-09-30) - Created comprehensive `docs/TIME_RANGE_FILTERING.md` - Updated README with HTTP API examples and time filtering reference - Documented timestamp formats, inclusivity, timezone handling, edge cases
     - [x] Add tests for all new HTTP endpoints and features (2025-09-30) - Added `scripts/smoke-http-list-runs.mjs` smoke for `horreum_list_runs` - Added `scripts/smoke-http-all-endpoints.mjs` comprehensive test for all 7 endpoints - Added `scripts/smoke-http-pagination.mjs` for pageToken/pageSize validation - Added `scripts/smoke-http-source-describe.mjs` for capability discovery - Added `scripts/smoke-http-datasets.mjs` for dataset endpoints
     - [x] Add schema URI filtering to datasets.search (CR-20250930-4) (2025-09-30) - Implemented in list_datasets tool with schemaUri parameter - Filters via DatasetService.datasetServiceListDatasetsBySchema - Combined with test-based filtering and time range support
     - [x] SSL/TLS certificate configuration for corporate environments (2025-09-30) - Added HORREUM_TLS_VERIFY env var with boolean parsing - Container support for CA certificate mounting - Comprehensive documentation and testing
   - [ip] Phase 6.5 — End-to-End Integration Fixes (CRITICAL - IN PROGRESS 2025-10-01)
     - [x] Fix Source MCP Contract schema compliance (test_id, has_more, snake_case) (2025-10-01)
       - [x] Add `test_id` field to test objects in list_tests responses (HTTP) (2025-10-01)
       - [x] Add `run_id` field to run objects in list_runs responses (HTTP) (2025-10-01)
       - [x] Verify `dataset_id` is present in list_datasets responses (already correct) (2025-10-01)
       - [x] Add `has_more` boolean to all pagination objects (datasets already had it) (2025-10-01)
       - [x] Standardize all pagination to snake_case naming: (2025-10-01)
         - [x] `nextPageToken` → `next_page_token`
         - [x] `hasMore` → `has_more`
         - [x] `totalCount` → `total_count`
       - [x] Update response mapping in src/server/http.ts for all list endpoints (2025-10-01)
       - [x] Update response mapping in src/server/tools.ts for all list endpoints (MCP tools) (2025-10-01)
       - [x] Create validation tests using curl + jq to verify contract compliance (2025-10-01)
     - [x] Align pagination with Horreum's 1-based model (2025-10-01)
       - [x] Update schema validators: page >= 1 (not page >= 0) (2025-10-01)
       - [x] Remove page=0 special handling ("return all" semantics) (2025-10-01)
       - [x] Always send page >= 1 to Horreum APIs (2025-10-01)
       - [x] Standardize pagination strategy across all list endpoints (2025-10-01)
       - [x] Update src/server/http.ts pagination logic (list_tests, list_datasets) (2025-10-01)
       - [x] Update src/server/tools.ts pagination logic (list_tests, list_runs, list_datasets) (2025-10-01)
       - [x] Update smoke tests to use page=1 as first page (2025-10-01)
       - [x] Updated mock Horreum to handle "no page param = all results" semantic (2025-10-01)
       - [x] Updated all assertions to check for snake_case field names (2025-10-01)
     - [x] Implement natural language time query support (2025-10-01)
       - [x] Install and integrate chrono-node library (npm install chrono-node) (2025-10-01)
       - [x] Create time parsing utility in src/utils/time.ts with fallback chain: (2025-10-01)
         - [x] Try chrono-node natural language parsing first
         - [x] Fall back to epoch milliseconds parsing (existing behavior)
         - [x] Fall back to ISO 8601 parsing (existing behavior)
         - [x] Apply "last 30 days" default when no time params provided
       - [x] Update horreum_list_runs (HTTP + MCP) to use new time parser (2025-10-01)
       - [x] Update horreum_list_datasets (HTTP + MCP) to use new time parser (2025-10-01)
       - [x] Add logging when default time range is applied (2025-10-01)
       - [x] Update tool schemas to document natural language support and defaults (2025-10-01)
       - [x] Create comprehensive test suite for time parsing: (2025-10-01)
         - [x] Test relative dates ("last week", "yesterday", "last 7 days")
         - [x] Test simple dates ("2025-09-24")
         - [x] Test ISO 8601 backward compatibility
         - [x] Test epoch millis backward compatibility
         - [x] Test default behavior (no params → last 30 days)
         - [x] Test edge cases and error handling
   - Phase 7 — Enhanced CI/CD Pipeline
     - [ ] Implement multi-stage testing pipeline (unit, integration, e2e, performance)
     - [ ] Add comprehensive security scanning (`osv-scanner`, SAST, license compliance)
     - [ ] Implement performance optimizations (caching, job interruption, parallel execution)
     - [ ] Set up release automation (semantic versioning, release notes, publishing)
     - [ ] Add quality gates and code coverage requirements
     - [ ] Implement deployment pipeline with rollback capabilities
   - Phase 8 — Architecture Refactoring & Modularity
     - [ ] Extract shared logic into reusable modules
     - [ ] Implement plugin architecture for optional features
     - [ ] Add dependency injection for better testability
     - [ ] Make observability features truly optional
     - [ ] Implement centralized error handling with proper error types
     - [ ] Add hierarchical configuration system with validation
   - Phase 9 — Alternative REST API Mode
     - [ ] Implement REST API endpoints (`GET /api/v1/tests`, etc.)
     - [ ] Create OpenAPI 3.0 specification and documentation
     - [ ] Ensure Pydantic-compatible response shapes
     - [ ] Add API versioning strategy and backward compatibility
     - [ ] Implement rate limiting and throttling for REST endpoints
   - Phase 10 — Build System Enhancement
     - [x] Add multi-architecture build support (2025-09-26)
     - [ ] Add cross-compilation support
     - [ ] Implement advanced dependency management with automated updates
     - [ip] Add build performance optimization: caching & context filtering in place
       (.dockerignore/.containerignore, cache mounts in Containerfile) (2025-09-26)
     - [ ] Implement incremental builds and CI caching
     - [ ] Create bundle size optimization and analysis tools
     - [ ] Implement development vs production build profiles
   - Phase 11 — Testing & Security Hardening
     - [ ] Set up comprehensive testing framework with high coverage requirements
     - [ ] Add integration testing with real external services
     - [ ] Implement contract testing for API endpoints
     - [ ] Add performance and load testing capabilities
     - [ ] Implement runtime security monitoring and secrets management
     - [ ] Add health check endpoints for all deployment modes
   - Phase 12 — Data Analysis
     - [ ] Design `analyze_run_data` tool for server-side statistical analysis
     - [ ] Implement analysis tool with suitable statistics library
     - [ ] Add unit and integration tests for analysis capabilities

6. How to update this document
   1. Review open tasks and repository state (commits, CI, issues).
   2. Adjust the Status Checklist items and statuses; add new items if scope changes.
   3. Append a Changelog entry with date, author/agent, and a concise summary.
   4. Commit with a clear message (e.g., `docs(plan): update status checklist and add changelog`).

7. Changelog (most recent first)
   - 2025-10-01 — **Gemini CLI Support via HTTP Proxy Bridge**: Implemented stdio-to-HTTP proxy
     bridge (scripts/mcp-http-proxy.mjs) that enables Gemini CLI to connect to HTTP-based MCP
     servers. Background: MCP SDK's StreamableHTTPServerTransport uses POST-based JSON-RPC, but
     Gemini CLI expects pure SSE (Server-Sent Events) streaming initiated via GET requests. The
     proxy accepts stdio input from Gemini, forwards JSON-RPC messages to HTTP server via POST,
     manages session IDs automatically, and returns responses via stdout. This pattern is similar
     to how Claude Desktop connects to remote servers. Updated src/server/http.ts GET /mcp
     endpoint to return clear 405 Method Not Allowed error (replacing confusing 400 "Invalid
     session ID" error) with helpful message directing clients to use POST for initialization.
     Added comprehensive Gemini CLI documentation to README.md with configuration examples for
     both CLI command and manual settings.json editing, verification steps, and authentication
     support. Proxy script includes detailed header comments with usage examples for both Gemini
     and Claude Desktop. Connection verified: gemini mcp list shows horreum-mcp as Connected.
     This enables Gemini CLI users to connect to containerized Horreum MCP servers without
     requiring native SSE streaming support in the MCP SDK.
   - 2025-10-01 — **Phase 6.5 COMPLETE AND VERIFIED**: All three blocking issues resolved and
     verified with live integration tests against production Horreum API. Created comprehensive
     integration status report (INTEGRATION_STATUS_REPORT.md) documenting all working features
     and debunking Domain MCP team's "BLOCKED on Horreum MCP" claims. Natural language time
     queries VERIFIED WORKING with actual HTTP endpoint tests (tested "last week", "yesterday"
     with real data from test ID 262). All smoke tests passing. All unit tests passing. Schema
     compliance verified. 1-based pagination aligned. READY FOR FULL INTEGRATION with Domain
     MCP. The blocking claim in the Domain MCP integration report is OUTDATED information.
   - 2025-10-01 — **Phase 6.5 COMPLETE - Pagination Alignment**: Aligned all endpoints to Horreum's
     1-based pagination model. Updated schema validators across all list endpoints (list_tests,
     list_runs, list_datasets) to require `page >= 1` instead of `page >= 0`. Removed all `page=0`
     special handling that returned "all results" semantics - this was semantically confusing and
     inconsistent with Horreum's model. Eliminated workaround for Horreum bug #2525 by always
     sending `page >= 1` to Horreum APIs (defaulting to 1 if not specified). Updated tool
     descriptions to document 1-based pagination. Changed MCP tools: list_tests, list_runs,
     list_datasets schemas to min(1). Changed HTTP endpoints: list_tests aggregation (page: 1),
     list_datasets (always send page >= 1). All 43 tests passing. Phase 6.5 now COMPLETE - all 3
     blocking issues resolved: ✅ Schema compliance, ✅ Natural language time queries, ✅ Pagination
     alignment. Ready for Phase 7.
   - 2025-10-01 — **Phase 6.5 Milestone - Schema Compliance Complete**: Fixed all Source MCP
     Contract schema compliance issues in BOTH HTTP API and MCP tool endpoints. Added required
     duplicate ID fields: test_id to test objects (list_tests), run_id to run objects
     (list_runs). Verified dataset_id already present in dataset objects (list_datasets -
     already correct). Standardized all pagination objects to snake_case naming: nextPageToken
     → next_page_token, hasMore → has_more, totalCount → total_count. Applied changes to
     list_runs (4 response paths: 2 HTTP + 2 MCP), list_tests (4 response paths: 2 HTTP + 2
     MCP), list_datasets (already compliant in both HTTP and MCP). Created comprehensive smoke
     test script (scripts/smoke-schema-compliance.mjs) to validate contract compliance - 5
     validation checks, all passing. All 43 unit tests passing. Both HTTP API and MCP tool
     responses now fully compliant with Source MCP Contract schema. Schema compliance
     requirement (#1) for Phase 6.5 now COMPLETE. Updated execution directive: 2 of 3 issues
     resolved. Next: Pagination alignment.
   - 2025-10-01 — **Phase 6.5 Milestone - Natural Language Time Queries Complete**: Fully
     integrated time parsing utility into list_runs and list_datasets endpoints (both HTTP
     and MCP). Replaced old parseTime helpers with parseTimeRange() which supports natural
     language ("last week", "yesterday", "last 30 days"), ISO 8601, epoch millis, and
     intelligent "last 30 days" default. Updated tool descriptions to document natural language
     support. Removed two redundant parseTime helper functions from http.ts. All 43 tests
     passing (23 for time parsing, 19 for SSL config, 1 placeholder). Natural language time
     query requirement (#2) for Phase 6.5 now COMPLETE. Updated execution directive to reflect
     completion status. Next: Schema compliance fixes (test_id, run_id, has_more, snake_case)
     and pagination alignment.
   - 2025-10-01 — **Phase 6.5 Progress - Time Parsing Utility Complete**: Implemented
     comprehensive time parsing utility (src/utils/time.ts) with chrono-node integration.
     Created parseTimeString() with multi-strategy parsing (epoch, ISO 8601, natural language),
     parseTimeRange() with intelligent "last 30 days" default, and formatTimeRange() for
     logging. Supports natural language expressions: "last week", "yesterday", "last 7 days",
     "last month", "now", "today". Maintains backward compatibility with ISO 8601 and epoch
     milliseconds. Includes 22 comprehensive unit tests (all passing) covering strategies,
     defaults, edge cases, and error handling. Uses vi.useFakeTimers() for deterministic
     time-based tests. Added chrono-node dependency (MIT license). Ready for integration into
     list_runs and list_datasets endpoints. Updated README to highlight natural language time
     query support.
   - 2025-10-01 — **Phase 6.5 Initiated - End-to-End Integration Fixes**: Added new critical
     priority phase to address two blocking issues discovered during RHIVOS PerfScale Domain
     MCP end-to-end testing. (1) Source MCP Contract schema compliance: Response schemas
     missing required `test_id`, `run_id` fields and `has_more` boolean in pagination
     objects, plus inconsistent camelCase vs snake_case naming, causing Pydantic validation
     errors in Domain MCP. All list endpoints (tests, runs, datasets) affected. Solution:
     Add duplicate ID fields, standardize all responses to snake_case (`next_page_token`,
     `has_more`, `total_count`). (2) Natural language time query support: Endpoints reject
     natural language time expressions like "last week" or "yesterday", forcing AI clients
     to calculate dates instead of passing through user intent. Solution: Integrate
     chrono-node library for time parsing with fallback chain, add intelligent "last 30 days"
     default when no time params provided. Affected endpoints: list_runs, list_datasets
     (both HTTP and MCP). Both issues are CRITICAL and BLOCKING full integration.
     References: horreum-mcp-schema-fixes.md and horreum-mcp-time-query-requirements.md
     from Domain MCP repository. Expanded scope based on codebase analysis to include
     snake_case standardization and default time range behavior. Execution directive
     updated to authorize immediate Phase 6.5 implementation before proceeding to Phase 7.
   - 2025-10-01 — **CI Build Fix - Native GitHub Paths Filtering**: Resolved persistent CI
     container build detection issues by replacing workflow_run + dorny/paths-filter approach
     with GitHub's native on.push.paths filtering. Root cause: workflow_run uses workflow
     file from default branch (not triggering commit), making it impossible for paths-filter
     to determine correct base commit for comparison. Result was comparing commit X to itself
     (0 changes). Solution: Direct push trigger with paths filter handles multi-commit pushes
     correctly out of the box. Removed complex base commit calculation logic and changes job.
     Workflow now triggers directly on push to main when relevant files change. Much simpler
     and more reliable.
   - 2025-09-30 — **Phase 6 Dataset Endpoints Added**: Implemented missing dataset endpoints
     required by RHIVOS PerfScale MCP integration. Added `list_datasets` MCP tool that
     searches datasets by test*id, test_name, or schema_uri with optional time filtering
     (from/to). Uses DatasetService.datasetServiceListByTest for test-based filtering and
     DatasetService.datasetServiceListDatasetsBySchema for schema-based filtering. Added
     `get_dataset` MCP tool to retrieve raw dataset content by ID. Both tools mapped to
     HTTP POST endpoints: `/api/tools/horreum_list_datasets` and `/api/tools/horreum*
     get_dataset`. Applied standardized error handling and included dataset info in
responses (dataset_id, run_id, test_id, test_name, schemas, content). Created
comprehensive smoke test `scripts/smoke-http-datasets.mjs` with 8 test cases covering
     filtering by test ID, test name, schema URI, time ranges, and error handling. Updated
     README.md to include new endpoints in HTTP API list. Updated development plan Phase 6
     endpoints list and status checklist. Completes CR-20250930-4 (schema URI filtering)
     that was previously deferred. All 7 HTTP endpoints now fully implemented and tested.
   - 2025-09-30 — **Phase 6 SSL/TLS Configuration Added**: Implemented SSL/TLS certificate
     support for corporate and self-signed certificates. Added user-friendly
     `HORREUM_TLS_VERIFY` environment variable (defaults to `true`) in `src/config/env.ts`
     with validation. Application code in `src/index.ts` applies the setting by setting
     Node.js `NODE_TLS_REJECT_UNAUTHORIZED` when verification is disabled (logs warning).
     Updated `docker-entrypoint.sh` to automatically run `update-ca-trust` when CA
     certificates are detected in `/etc/pki/ca-trust/source/anchors/` (requires `--user=0`).
     Updated `Containerfile` to run `update-ca-trust extract` in build stage. Created
     comprehensive `SSL_CONFIGURATION.md` documentation with examples for production (mount
     CA cert) and testing (disable verification). Updated `README.md` with SSL/TLS
     Configuration section showing both options. Updated `INTEGRATION_STATUS.md` with
     detailed SSL error troubleshooting. All code built, formatted, and type-checked
     successfully. This addresses the SSL certificate errors encountered during end-to-end
     integration testing with corporate Horreum instances.
   - 2025-09-30 — **Phase 6 Complete - Documentation**: Created comprehensive time range
     filtering documentation (CR-20250930-5). Added `docs/TIME_RANGE_FILTERING.md` with
     detailed explanation of from/to parameter behavior, timestamp formats (ISO 8601
     and epoch millis), inclusivity rules (inclusive on both ends), timezone handling
     (UTC recommended), error handling (lenient parsing), edge cases, and best
     practices. Updated README.md with HTTP API examples showing time filtering, added
     direct HTTP API section with curl examples for all 6 endpoints (5 tools +
     source.describe), updated status to Phase 6 Complete, and added cross-references
     to new documentation. Phase 6 substantially complete with 4 of 5 CRs implemented
     (CR-4 deferred as datasets.search doesn't exist yet). All critical and high-
     priority features delivered for RHIVOS PerfScale MCP integration.
   - 2025-09-30 — **Phase 6 Capability Discovery**: Implemented source.describe tool
     (CR-20250930-2) for runtime capability discovery. Added as both MCP tool and HTTP
     POST endpoint. Returns structured response with sourceType="horreum", version from
     package.json, contractVersion, capabilities object (pagination, caching, streaming,
     schemas), and limits object (maxPageSize, maxDatasetSize, rateLimitPerMinute).
     Rate limit read from HORREUM_RATE_LIMIT env var. Created smoke test `scripts/
smoke-http-source-describe.mjs` that validates response structure and values. This
     allows Domain MCP servers to discover capabilities at runtime. Completes low-
     priority CR-20250930-2.
   - 2025-09-30 — **Phase 6 Pagination Implementation**: Implemented Source MCP Contract
     pagination (CR-20250930-3) across list_runs and list_tests HTTP endpoints. Added
     pageToken/pageSize parameters with backward compatibility for legacy page/limit.
     Page tokens are opaque base64-encoded cursors containing page and limit state.
     Response format: `{data, pagination: {nextPageToken?, hasMore, totalCount?}}`.
     Added helper functions `encodePageToken` and `decodePageToken` for token
     management. Implemented consistent ordering, validation (1-1000), and hasMore flag
     logic. Created comprehensive smoke test `scripts/smoke-http-pagination.mjs` that
     validates first/subsequent/last pages, invalid tokens, and both endpoints. All
     tests passing. This completes high-priority CR-20250930-3.
   - 2025-09-30 — **Phase 6 Major Milestone - All HTTP Endpoints Complete**: Implemented
     all five direct HTTP API endpoints for server-to-server integration. Added `POST 
/api/tools/horreum_get_run`, `/horreum_list_tests`, `/horreum_list_schemas`, and
     `/horreum_get_schema` with consistent Source MCP Contract error handling across all
     endpoints. Each endpoint uses the `sendContractError` helper, supports Bearer token
     authentication, and returns appropriate JSON responses. `list_tests` includes
     folder-aware aggregation logic; schema endpoints support lookup by id or name.
     Created comprehensive smoke test `scripts/smoke-http-all-endpoints.mjs` that
     validates all five endpoints with mock Horreum API. All tests passing. This
     completes the core Direct HTTP API requirement for RHIVOS PerfScale MCP integration.
   - 2025-09-30 — **Phase 6 Implementation Started**: Implemented first direct HTTP API
     endpoint `POST /api/tools/horreum_list_runs` with Source MCP Contract error
     handling. Added `sendContractError` helper function that returns standardized
     error responses with error codes (INVALID_REQUEST, NOT_FOUND, RATE_LIMITED,
     INTERNAL_ERROR, SERVICE_UNAVAILABLE, TIMEOUT), retryable flag, and optional
     retryAfter seconds. Endpoint supports test resolution by name/id, optional time
     filtering (from/to), pagination, sorting, and trashed flag. Added smoke test
     `scripts/smoke-http-list-runs.mjs` with mock Horreum API that validates JSON
     response shape. Error mapping covers common HTTP status codes (404/401/403/429/
     503/504) with appropriate retryable flags. This is the first of five HTTP tool
     endpoints for RHIVOS PerfScale MCP integration.
   - 2025-09-30 — **Phase Reorganization**: Moved Direct HTTP API for Server-to-Server
     Integration from Phase 8 to Phase 6 as the immediate next priority following
     Phase 5 (Containerization). Renumbered all subsequent phases: Enhanced CI/CD
     Pipeline (Phase 7), Architecture Refactoring & Modularity (Phase 8), Alternative
     REST API Mode (Phase 9), Build System Enhancement (Phase 10), Testing & Security
     Hardening (Phase 11), Data Analysis (Phase 12). Updated execution directive to
     authorize Phase 6 implementation immediately. This prioritization ensures RHIVOS
     PerfScale MCP integration requirements are addressed as the next actionable work.
   - 2025-09-30 — **Phase Integration from RHIVOS Requirements**: Added comprehensive
     Direct HTTP API for Server-to-Server Integration phase based on RHIVOS PerfScale
     MCP integration requirements and end-to-end testing feedback. Includes: (1) Direct
     HTTP POST endpoints for MCP tools (/api/tools/horreum\_\*), (2) Standardized error
     handling compliant with Source MCP Contract (CR-20250930-1), (3) Consistent
     pagination support across all list tools (CR-20250930-3), (4) Schema URI filtering
     for datasets.search (CR-20250930-4), (5) Capability discovery via source.describe
     tool (CR-20250930-2), and (6) Time range filtering documentation (CR-20250930-5).
     References: /home/dblack/git/gitlab/perfscale/sandbox/rhivos-perfscale-mcp/docs/
     horreum-mcp-requirements.md and horreum-mcp-change-requests.md.
   - 2025-09-29 — **Container Multi-Architecture Fixes**: Resolved critical WebAssembly
     and QEMU emulation issues preventing multi-architecture container builds. Fixed
     `ReferenceError: WebAssembly is not defined` by removing global `--jitless` flag
     while preserving WebAssembly support in runtime. Added intelligent QEMU detection
     via `docker-entrypoint.sh` that dynamically applies `--jitless` only during
     emulated execution. Updated Containerfile to use `--jitless` only during npm
     install in builder stage to prevent V8 crashes under QEMU. Validated successful
     builds and execution on both AMD64 and ARM64 architectures with automatic
     environment adaptation. Multi-architecture build script now fully functional.
   - 2025-09-26 — **Phase 9 status refined**: Marked multi-arch support as
     completed, split cross-compilation into a separate item, and recorded build
     performance optimizations in progress (cache mounts, context filtering) with
     pending work for incremental builds and CI caching.
   - 2025-09-26 — **Domain MCP Integration Documentation**: Added comprehensive
     "Connecting to Other MCP Servers" section to README with step-by-step guide
     for connecting Domain MCP servers to Horreum MCP via HTTP containers. Includes
     architecture diagrams, deployment examples, testing procedures, and
     troubleshooting. Documented current status: Horreum MCP is production-ready,
     Domain MCP needs plugin and configuration fixes. Validated end-to-end
     container deployment and HTTP API functionality.
   - 2025-09-26 — **Phase 5 Completed**: Hardened container image (OCI labels,
     STOPSIGNAL, HEALTHCHECK, non-root perms, tuned NODE_OPTIONS), added build
     context filtering via `.dockerignore`/`.containerignore`, introduced
     `scripts/trivy_scan.sh` and documented scanning in README. Authorized Phase 6
     to begin (enhanced CI/CD and security scanning).
   - 2025-09-25 — **CI Container Build added**: Introduced GitHub Actions
     workflow to build and push multi-arch images to Quay using Buildah,
     tagging with short SHA and aliasing to :main. Added Trivy image scan job
     post-push. Documented IMAGE*REPO required variable and QUAY*\* secrets.
   - 2025-09-25 — **Major Plan Enhancement**: Merged comprehensive enhancement
     recommendations based on gap analysis. Restructured phases 5-11 to address
     enterprise deployment requirements: (5) Containerization & Multi-Architecture
     Support, (6) Enhanced CI/CD Pipeline, (7) Architecture Refactoring & Modularity,
     (8) Alternative HTTP API Mode, (9) Build System Enhancement, (10) Testing &
     Security Hardening, (11) Data Analysis. Updated CI/CD and deployment sections
     with detailed enterprise-grade requirements. Current execution directive
     remains Phase 5 containerization with expanded scope for multi-architecture
     builds and automated registry deployment.
   - 2025-09-24 — Prioritized containerization into Phase 5. The next
     development task is to create a `Containerfile` for Podman.
   - 2025-09-24 — **Phase 4 (HTTP Standalone Mode) completed**. Implemented comprehensive HTTP transport with StreamableHTTPServerTransport, Express.js middleware, session management, Bearer token authentication, CORS support, and external LLM client integration (OpenAI, Anthropic, Azure). Added hybrid entrypoint supporting both stdio and HTTP modes. Updated documentation with Mermaid architecture diagrams and comprehensive usage examples. All HTTP smoke tests passing. Ready for production deployment.
   - 2025-09-24 — Added Phase 5 "External MCP Integration" to support service-based HTTP endpoints for external MCPs. Renumbered subsequent phases from 5, 6 to 6, 7.
   - 2025-09-23 — Synchronized Development Strategy section with Status Checklist by
     adding missing Phase 5 "Testing & Security Hardening" and Phase 6 "Data
     Analysis" to the strategy section. All phases now properly documented in both
     sections for consistency.
   - 2025-09-23 — Added Phase 4 "HTTP Standalone Mode" to support HTTP transport
     using StreamableHTTPServerTransport, external LLM API integration, session
     management, and deployment flexibility. Renumbered existing phases: Testing
     & Security Hardening is now Phase 5, Data Analysis is Phase 6. Updated
     execution directive to authorize Phase 4 implementation.
   - 2025-09-22 — Expanded Phase 4 to "Testing & Security Hardening" to address
     operational concerns identified during implementation review: CI security
     scanning, health checks, token redaction, resource error handling
     consistency, and required CHANGELOG.md maintenance. Added Production
     Readiness section (8.1) with specific operational requirements.
   - 2025-09-22 — Added optional OpenTelemetry tracing (OTLP); auto-instrumented
     undici and wrapped tools/resources with spans; documented enablement.
   - 2025-09-22 — Added optional Prometheus metrics endpoint with counters for
     invocations and histograms for durations; documented env and usage.
   - 2025-09-22 — Extended structured error handling and pino logging to
     resources (`schema`, `run`); corrected package.json metadata and `private`
     boolean.
   - 2025-09-22 — Structured error handling wrapper added for all tools; migrated
     logging to pino with correlation IDs and durations; refactored tool
     registrations to reduce boilerplate.
   - 2025-09-22 — Injected rate-limited fetch via `OpenAPI.FETCH` (no global
     patch); updated postgen to enforce NodeNext import extensions and FETCH
     typing; adjusted server to wire custom fetch.
   - 2025-09-22 — Project review completed: Implementation is well-aligned with plan; identified testing framework gap and error handling inconsistencies; CI is working well with comprehensive smoke tests; recommended priority adjustments for Phase 4 testing framework setup.
   - 2025-09-22 — Structured logging (correlation IDs + durations) added for all tools; type tightening across `src/server/tools.ts` (removed explicit anys); smoke tests now use generic fixtures (`example-test`, id `123`) for `list_runs`.
   - 2025-09-22 — Added Phase 4 (Testing) and Phase 5 (Data Analysis) to the
     plan. Updated Phase 3 (Hardening) to include specific refactoring tasks
     for fetch logic, error handling, and logging based on code review.
   - 2025-09-22 — `list_tests` made folder-aware (aggregates across folders);
     `list_runs` gained `from`/`to` time filters and test name resolution with
     client-side filtering across pages; CI smokes expanded; README clarified
     AI client connection steps; removed redundant HTTP client in favor of the
     generated OpenAPI client.
   - 2025-09-19 — Implemented rate-limited fetch with retries/backoff; exposed MCP
     resources for tests, schemas, and runs; updated README with tools/resources.
   - 2025-09-19 — Implemented read tools (`list_tests`, `get_schema`, `list_runs`) using generated OpenAPI client; added `upload_run` with smoke test; CI runs all smokes.
   - 2025-09-19 — Completed scaffolding, env validation, ESLint/Prettier, CI, and npm scripts.
   - 2025-09-19 — Authorized Phase 1 implementation and marked scaffolding as in progress.
   - 2025-09-19 — Added OpenAPI client generation wrapper, MCP resource exposure, cancellation/streaming behavior, CI optional live smoke test, SemVer and schema deprecation policy, and Quickstart with `.env` example.
   - 2025-09-19 — Added support for optional authentication: read tools work in anonymous mode, write tools require auth, updated configuration to make HORREUM_TOKEN optional, enhanced error handling and logging for auth modes.
   - 2025-09-19 — Enhanced plan with specific technical details: API versioning support, tool discovery implementation, concrete rate limiting values (10 req/sec), error handling timeouts (30s), and expanded configuration variables.
   - 2025-09-19 — Establish MCP server plan; set TypeScript/Node 20 and MCP SDK; define phases with read-first tool approach; update CI/testing accordingly.
   - 2025-09-19 — Added maintenance instructions, status checklist, and changelog; emphasized read-first priority; expanded sections.

### 13. Quickstart

1. Prerequisites
   - Node.js 20 LTS
   - `pnpm` (or `npm`)

2. Configure environment

Create a `.env` file in the project root:

```
HORREUM_BASE_URL=https://horreum.example.com
# HORREUM_TOKEN= # optional; uncomment when using authenticated tools
HORREUM_RATE_LIMIT=10
HORREUM_TIMEOUT=30000
HORREUM_API_VERSION=latest

# Optional: HTTP standalone mode (Phase 4)
# HTTP_MODE_ENABLED=true
# HTTP_PORT=3000
# LLM_PROVIDER=openai
# LLM_API_KEY=your-api-key
# LLM_MODEL=gpt-4
```

3. Install and run (development)
   - Install dependencies: `npm ci`
   - Build: `npm run build`
   - Start the server: `npm start`

4. Exercise with an MCP client
   - **Stdio mode (default)**: Use your preferred MCP client (e.g., `mcp-cli`) to connect to the server.
   - **HTTP mode (Phase 4)**: Set `HTTP_MODE_ENABLED=true` and access via HTTP at `http://localhost:3000/mcp`.
   - Try read tools first: `list_tests`, `get_schema`, `list_runs`.
   - For write tools (e.g., `upload_run`), set `HORREUM_TOKEN`.
   - For LLM integration (Phase 4), configure `LLM_PROVIDER` and `LLM_API_KEY`.
