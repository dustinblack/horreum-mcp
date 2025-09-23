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

**Phase 5: Testing & Security Hardening**

1.  **Testing Framework**: Set up formal testing framework (Vitest) to complement existing smoke tests.
2.  **Unit Tests**: Add unit tests for core utilities (rate-limited fetch, environment validation).
3.  **Integration Tests**: Add integration tests for each MCP tool, building on current mocked API approach.
4.  **Security Scanning**: Add CI security scanning (`npm audit`, dependency vulnerability checks).
5.  **Health Monitoring**: Implement startup health check endpoint with Horreum connectivity validation.
6.  **Security Hardening**: Add token redaction to startup error messages and logs.
7.  **Resource Consistency**: Standardize resource error handling and improve URI validation.
8.  **Documentation**: Document testing strategy and maintain `CHANGELOG.md` following SemVer practices.

**Phase 6: Data Analysis**

1.  **Analysis Tool Design**: Design `analyze_run_data` tool for server-side statistical analysis.
2.  **Statistics Integration**: Implement analysis tool leveraging suitable statistics library.
3.  **Analysis Testing**: Add unit and integration tests for the new analysis capabilities.

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

1. Build/format: Node 20, ESLint/Prettier, type-check with `tsc`.
2. Tests: Unit/integration/E2E orchestrated via GitHub Actions.
3. Security: **REQUIRED** - Dependency scan (`npm audit`, `osv-scanner`); fail on high/critical severity; run on every PR and main branch push.
4. Releases: Tag-based npm package and/or Docker image.
5. Live smoke (optional, gated): Provide an optional workflow that runs a minimal read-only smoke test against a sandbox Horreum instance using repository/environment secrets. Skip on forks and by default; keep main CI fully mocked.
6. Versioning: Use SemVer for the npm package. Version MCP tool JSON Schemas; when making breaking changes, deprecate previous versions with warnings for at least one minor release before removal. **REQUIRED** - Maintain a human-readable `CHANGELOG.md` with all changes documented.

### 10. Deployment and Configuration

1. Runtime: Node 20 LTS.
2. Packaging: NPM package and/or container image using non-root user and minimal base.
3. Config: Required variables (`HORREUM_BASE_URL`) and optional (`HORREUM_TOKEN` for authenticated access, `HORREUM_RATE_LIMIT=10`, `HORREUM_TIMEOUT=30000`, `HORREUM_API_VERSION=latest`); document all variables with examples and auth modes.
4. HTTP Mode Config: Optional HTTP server variables (`HTTP_MODE_ENABLED=false`, `HTTP_PORT=3000`) and LLM integration (`LLM_PROVIDER=openai`, `LLM_API_KEY`, `LLM_MODEL=gpt-4`).
5. Kubernetes: Minimal manifests (optional initially).

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
   - Development is authorized for Phase 4 (HTTP Standalone Mode).
     Proceed with HTTP transport implementation and external LLM integration.

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
     - [ ] Extend environment configuration for HTTP mode and LLM settings
     - [ ] Implement HTTP transport using StreamableHTTPServerTransport with Express.js
     - [ ] Add configurable LLM client for external API calls (OpenAI, Anthropic, Azure)
     - [ ] Create hybrid entrypoint supporting both stdio and HTTP modes
     - [ ] Implement session management with UUIDs and optional resumability
     - [ ] Add HTTP security features (CORS, Bearer auth, DNS rebinding protection)
     - [ ] Update documentation with HTTP standalone mode usage and deployment
     - [ ] Add smoke tests for HTTP mode functionality
   - Phase 5 — Testing & Security Hardening
     - [ ] Set up a formal testing framework (e.g., Vitest) to complement existing smoke tests
     - [ ] Add unit tests for core utilities (e.g., rate-limited fetch, environment validation)
     - [ ] Add integration tests for each MCP tool, building on current mocked API approach
     - [ ] Document the innovative smoke test strategy using in-memory MCP transport
     - [ ] Add CI security scanning (`npm audit`, dependency vulnerability checks)
     - [ ] Implement startup health check endpoint with Horreum connectivity validation
     - [ ] Add token redaction to startup error messages and logs
     - [ ] Standardize resource error handling (add structured logging/metrics to `test` resource)
     - [ ] Improve resource URI validation with structured error responses
     - [ ] Create and maintain `CHANGELOG.md` file following SemVer practices
   - Phase 6 — Data Analysis
     - [ ] Design `analyze_run_data` tool for server-side statistical analysis.
     - [ ] Implement `analyze_run_data` tool, leveraging a suitable statistics
           library.
     - [ ] Add unit and integration tests for the new analysis tool.

6. How to update this document
   1. Review open tasks and repository state (commits, CI, issues).
   2. Adjust the Status Checklist items and statuses; add new items if scope changes.
   3. Append a Changelog entry with date, author/agent, and a concise summary.
   4. Commit with a clear message (e.g., `docs(plan): update status checklist and add changelog`).

7. Changelog (most recent first)
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
