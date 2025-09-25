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

**Phase 6: Enhanced CI/CD Pipeline**

- Multi-stage testing pipeline with parallel execution and performance regression testing
- Comprehensive security scanning (osv-scanner, SAST, license compliance)
- Performance optimizations (caching, job interruption, conditional workflows)
- Release automation (semantic versioning, NPM/container publishing)

**Phase 7: Architecture Refactoring & Modularity**

- Extract shared logic into reusable modules with plugin architecture
- Make observability features truly optional with dependency injection
- Centralized error handling with circuit breaker patterns
- Hierarchical configuration system with validation and hot-reload

**Phase 8: Alternative HTTP API Mode & External MCP Integration**

- REST API endpoints (`GET /api/v1/tests`, `POST /api/v1/tests/{id}/runs`, etc.)
- OpenAPI 3.0 specification with Pydantic-compatible responses
- API versioning strategy with rate limiting and backward compatibility
- Service-based HTTP endpoints for external MCP consumption (`POST /tools/tests.list`, etc.)
- Support for "Independent MCPs" topology for MCP-to-MCP communication

**Phase 9: Build System Enhancement**

- Multi-architecture builds with cross-compilation and bundle optimization
- Advanced dependency management with automated updates and vulnerability scanning
- Build performance optimization (incremental builds, parallel processes)

**Phase 10: Testing & Security Hardening**

- Enhanced testing framework (unit, integration, contract, performance testing)
- Runtime security monitoring with secrets management and audit logging
- Operational readiness (health checks, metrics, graceful shutdown)

**Phase 11: Data Analysis**

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

**Current (Phase 1-4)**: Node 20, ESLint/Prettier, Vitest with coverage, smoke
tests, basic security scanning (`npm audit`, secretlint), path-based change
detection.

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
   - Phase 4 (HTTP Standalone Mode) completed (2025-09-24).
   - Development is now authorized for Phase 5 (Containerization & Multi-Architecture Support).
   - Priority focus: Implement comprehensive containerization with multi-architecture builds and automated registry deployment as the foundation for enterprise deployment capabilities.

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
   - [ ] Add container vulnerability scanning and security hardening
   - [x] Implement HTTP health endpoints (`/health`, `/ready`) (2025-09-25)
   - [ ] Add build context filtering and layer optimization
   - Phase 6 — Enhanced CI/CD Pipeline
     - [ ] Implement multi-stage testing pipeline (unit, integration, e2e, performance)
     - [ ] Add comprehensive security scanning (`osv-scanner`, SAST, license compliance)
     - [ ] Implement performance optimizations (caching, job interruption, parallel execution)
     - [ ] Set up release automation (semantic versioning, release notes, publishing)
     - [ ] Add quality gates and code coverage requirements
     - [ ] Implement deployment pipeline with rollback capabilities
   - Phase 7 — Architecture Refactoring & Modularity
     - [ ] Extract shared logic into reusable modules
     - [ ] Implement plugin architecture for optional features
     - [ ] Add dependency injection for better testability
     - [ ] Make observability features truly optional
     - [ ] Implement centralized error handling with proper error types
     - [ ] Add hierarchical configuration system with validation
   - Phase 8 — Alternative HTTP API Mode & External MCP Integration
     - [ ] Implement REST API endpoints (`GET /api/v1/tests`, etc.)
     - [ ] Create OpenAPI 3.0 specification and documentation
     - [ ] Ensure Pydantic-compatible response shapes
     - [ ] Add API versioning strategy and backward compatibility
     - [ ] Implement rate limiting and throttling for REST endpoints
     - [ ] Implement service-based HTTP endpoints for external MCP consumption
     - [ ] Add support for "Independent MCPs" topology and MCP-to-MCP communication
   - Phase 9 — Build System Enhancement
     - [ ] Add multi-architecture build support and cross-compilation
     - [ ] Implement advanced dependency management with automated updates
     - [ ] Add build performance optimization (incremental builds, caching)
     - [ ] Create bundle size optimization and analysis tools
     - [ ] Implement development vs production build profiles
   - Phase 10 — Testing & Security Hardening
     - [ ] Set up comprehensive testing framework with high coverage requirements
     - [ ] Add integration testing with real external services
     - [ ] Implement contract testing for API endpoints
     - [ ] Add performance and load testing capabilities
     - [ ] Implement runtime security monitoring and secrets management
     - [ ] Add health check endpoints for all deployment modes
   - Phase 11 — Data Analysis
     - [ ] Design `analyze_run_data` tool for server-side statistical analysis
     - [ ] Implement analysis tool with suitable statistics library
     - [ ] Add unit and integration tests for analysis capabilities

6. How to update this document
   1. Review open tasks and repository state (commits, CI, issues).
   2. Adjust the Status Checklist items and statuses; add new items if scope changes.
   3. Append a Changelog entry with date, author/agent, and a concise summary.
   4. Commit with a clear message (e.g., `docs(plan): update status checklist and add changelog`).

7. Changelog (most recent first)
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
