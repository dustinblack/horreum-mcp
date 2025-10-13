# Horreum MCP Server: Development History

This document archives completed phases and historical changelog entries from the Horreum MCP Server development. For the current development plan and active phases, see [`mcp_development_plan.md`](../../mcp_development_plan.md) in the project root.

## Completed Phases

### Phase 1: Core MCP Server and Read Tools (COMPLETED 2025-09-19)

1.  **Project Scaffolding**: Initialize a TypeScript project and MCP server using the official SDK.
2.  **MCP Manifest**: Define server metadata and register initial tools/resources.
3.  **Read Tools (Horreum API)**: Implement tools that fetch data from Horreum (optional token-based auth):
    - `list_tests`: List Horreum tests with pagination and filters.
    - `get_schema`: Retrieve a Horreum schema by name or ID.
    - `list_runs`: List runs for a test with pagination and time filters.
4.  **Config & Auth**: Use environment variables for `HORREUM_BASE_URL` and optional `HORREUM_TOKEN` (omit for anonymous access).
5.  **Horreum Client Generation**: Generate a TypeScript client from the Horreum OpenAPI spec (via `openapi-typescript-codegen`) and use it directly. Centralize auth/headers via the generated `OpenAPI` config; optional retries/backoff and rate limiting remain in scope.

### Phase 2: Write Tools and Uploads (COMPLETED 2025-09-22)

1.  **upload_run**: Upload a run/dataset into a target test, with validation.
2.  **create_test (optional)**: Create a new test with a given schema reference.
3.  **Idempotency & Safety**: Support dry-run mode and idempotency keys where applicable.
4.  **Error Scenarios**: Handle specific error cases (network timeouts: 30s, auth failures: clear messaging, Horreum unavailable: graceful degradation).

### Phase 3: Observability and Hardening (COMPLETED 2025-09-23)

1.  **Logging/Tracing**: Structured logs; optional OpenTelemetry.
2.  **Rate Limits/Backoff**: Handle Horreum API backoff and error propagation.
3.  **Caching (optional)**: In-memory cache for hot reads with TTL.

### Phase 4: HTTP Standalone Mode (COMPLETED 2025-09-24)

1.  **HTTP Transport**: Implement HTTP server mode using `StreamableHTTPServerTransport` from MCP SDK with Express.js.
2.  **Dual Mode Support**: Support both stdio (current) and HTTP modes via configuration.
3.  **External LLM Integration**: Add configurable LLM API client for external inference (OpenAI, Anthropic, Azure, etc.).
4.  **Session Management**: Implement HTTP session management with UUIDs and optional resumability.
5.  **HTTP Security**: CORS configuration, Bearer token authentication, DNS rebinding protection.
6.  **Deployment Options**: Enable containerized deployments and cloud hosting scenarios.

### Phase 5: Containerization & Multi-Architecture Support (COMPLETED 2025-09-26)

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

### Phase 6: Direct HTTP API for Server-to-Server Integration (COMPLETED 2025-09-30)

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

### Phase 6.5: End-to-End Integration Fixes (COMPLETED 2025-10-01)

This phase addresses three critical issues discovered during end-to-end testing with the RHIVOS PerfScale Domain MCP that were blocking full integration.

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

4. **Standardized Error Handling**: Implement Source MCP Contract error format
5. **Pagination Support**: Implement consistent pagination for all list tools
6. **Schema URI Filtering**: Add dataset filtering by schema
7. **Capability Discovery**: Implement source.describe tool
8. **Documentation Improvements**: Clarify time range filtering
9. **SSL/TLS Certificate Configuration**: Support for corporate/self-signed SSL certificates

### Phase 6.6: Label Values API Coverage (COMPLETED 2025-10-07)

This phase adds comprehensive support for accessing Horreum's extracted label values
data, which represents the primary output of Horreum's transformation system. Label
values are the extracted metrics and metadata from test runs after being processed by
Horreum's transformer definitions.

**Priority**: HIGH - Label values are the most important read endpoints for data
analysis and visualization. They provide access to the transformed/extracted data
that represents the actual test metrics and results.

**Endpoints Implemented**:

1. **`GET /api/run/{id}/labelValues`** - Get label values for a specific run
   - Tool name: `get_run_label_values`
   - HTTP endpoint: `POST /api/tools/horreum_get_run_label_values`
   - **Most important endpoint** - provides filtered access to run-specific metrics
   - Extensive server-side filtering capabilities:
     - `filter`: JSON sub-document or path expression (default: `{}`)
     - `include`: Array of label names to include
     - `exclude`: Array of label names to exclude
     - `multiFilter`: Enable filtering for multiple values with arrays
     - `sort`: Label name for sorting results
     - `direction`: Ascending or Descending
     - `limit`: Maximum number of results (default: 2147483647)
     - `page`: Page number for pagination (1-based)
   - Returns: `Array<ExportedLabelValues>` with structure:
     - `values`: Map of label names to values (LabelValueMap)
     - `runId`: Associated run ID
     - `datasetId`: Associated dataset ID
     - `start`: Start timestamp
     - `stop`: Stop timestamp

2. **`GET /api/test/{id}/labelValues`** - Get aggregated label values across all
   runs for a test
   - Tool name: `get_test_label_values`
   - HTTP endpoint: `POST /api/tools/horreum_get_test_label_values`
   - Supports all filtering options from run endpoint plus:
     - `filtering`: Include filtering labels (default: true)
     - `metrics`: Include metric labels (default: true)
     - `before`: Time boundary - ISO timestamp or epoch millis
     - `after`: Time boundary - ISO timestamp or epoch millis
   - Natural language time support for `before`/`after` (reuse parseTimeRange)
   - Returns: `Array<ExportedLabelValues>` same structure as run endpoint

3. **`GET /api/dataset/{datasetId}/labelValues`** - Get label values for specific
   dataset
   - Tool name: `get_dataset_label_values`
   - HTTP endpoint: `POST /api/tools/horreum_get_dataset_label_values`
   - Simpler endpoint - no filtering, returns all label values for dataset
   - Returns: `Array<LabelValue>` with structure:
     - `id`: Label value ID
     - `name`: Label name
     - `schema`: Schema descriptor with id, uri, name
     - `value`: Extracted value (can be scalar, array, or JSON object)

**Implementation Requirements**:

- All three tools implemented in `src/server/tools.ts`
- All three HTTP endpoints implemented in `src/server/http.ts`
- Consistent error handling with Source MCP Contract error format
- Comprehensive parameter validation using Zod schemas
- Integration with existing observability (logging, metrics, tracing)
- Reuse parseTimeRange utility for natural language time support (test endpoint)
- Proper typing using generated TypeScript models:
  - `ExportedLabelValues` from `src/horreum/generated/models/`
  - `LabelValue` from `src/horreum/generated/models/`
  - `LabelValueMap` from `src/horreum/generated/models/`

**Testing Strategy**:

- Smoke test script: `scripts/smoke-get-run-label-values.mjs`
- Smoke test script: `scripts/smoke-get-test-label-values.mjs`
- Smoke test script: `scripts/smoke-get-dataset-label-values.mjs`
- Verify filter parameter handling (JSON sub-document and path expressions)
- Verify include/exclude parameter arrays
- Verify multiFilter boolean handling
- Verify natural language time queries for test endpoint (before/after)
- Verify pagination with 1-based page numbers
- Integration test against real Horreum instance with actual label values

### Phase 6.7: Comprehensive Run and Dataset GET Endpoint Coverage (COMPLETED 2025-10-07)

This phase completes the read-only API coverage by implementing all remaining GET
endpoints for Runs and Datasets. These endpoints provide access to run metadata,
raw data, summaries, and dataset information that complement the label values
endpoints from Phase 6.6.

**Priority**: MEDIUM-HIGH - These endpoints provide essential read access to raw
run data, metadata, and dataset summaries. They complete the read-first strategy
before moving to write operations.

**Run Endpoints Implemented**:

1. **`GET /api/run/{id}`** - Get complete run details (already via resource, needs tool)
   - Tool name: `get_run`
   - HTTP endpoint: `POST /api/tools/horreum_get_run` (already exists ✅)
   - Returns: `RunExtended` with full run details including metadata
   - Note: Currently only available as MCP resource, should also be a tool

2. **`GET /api/run/{id}/data`** - Get raw run data payload
   - Tool name: `get_run_data`
   - HTTP endpoint: `POST /api/tools/horreum_get_run_data`
   - Optional schema URI filter to get data for specific schema
   - Returns: Raw JSON data (Record<string, any>)
   - Use case: Access original uploaded run data

3. **`GET /api/run/{id}/metadata`** - Get run metadata
   - Tool name: `get_run_metadata`
   - HTTP endpoint: `POST /api/tools/horreum_get_run_metadata`
   - Optional schema URI filter
   - Returns: Metadata JSON (Record<string, any>)
   - Use case: Access run metadata without full payload

4. **`GET /api/run/{id}/summary`** - Get run summary
   - Tool name: `get_run_summary`
   - HTTP endpoint: `POST /api/tools/horreum_get_run_summary`
   - Returns: `RunSummary` with condensed run information
   - Use case: Lightweight run overview without full details

5. **`GET /api/run/bySchema`** - List runs by schema URI
   - Tool name: `list_runs_by_schema`
   - HTTP endpoint: `POST /api/tools/horreum_list_runs_by_schema`
   - Parameters: schema URI, pagination, sorting
   - Returns: `RunsSummary` with paginated results
   - Use case: Find all runs using a specific schema

6. **`GET /api/run/count`** - Get run count for test
   - Tool name: `get_run_count`
   - HTTP endpoint: `POST /api/tools/horreum_get_run_count`
   - Parameter: test ID
   - Returns: `RunCount` with total/trashed counts
   - Use case: Quick statistics without fetching all runs

7. **`GET /api/run/list`** - List all runs across all tests
   - Tool name: `list_all_runs`
   - HTTP endpoint: `POST /api/tools/horreum_list_all_runs`
   - Parameters: pagination, sorting, time filters
   - Natural language time support (reuse parseTimeRange)
   - Returns: `RunsSummary` with paginated results
   - Use case: Global run search across entire Horreum instance

**Dataset Endpoints Implemented**:

1. **`GET /api/dataset/{id}`** - Get dataset details (already exists ✅)
   - Tool name: `get_dataset` (already implemented ✅)
   - HTTP endpoint: `POST /api/tools/horreum_get_dataset` (already exists ✅)
   - Returns: Full dataset with data content

2. **`GET /api/dataset/{datasetId}/summary`** - Get dataset summary
   - Tool name: `get_dataset_summary`
   - HTTP endpoint: `POST /api/tools/horreum_get_dataset_summary`
   - Optional view ID parameter
   - Returns: `DatasetSummary` with metadata and view information
   - Use case: Lightweight dataset overview without full data payload

3. **`GET /api/dataset/list/{testId}`** - List datasets by test (already exists ✅)
   - Tool name: `list_datasets` (already implemented ✅)
   - HTTP endpoint: `POST /api/tools/horreum_list_datasets` (already exists ✅)

4. **`GET /api/dataset/byschema`** - List datasets by schema (already exists ✅)
   - Tool name: `list_datasets` with schema_uri (already implemented ✅)

**Implementation Requirements**:

- All tools implemented in `src/server/tools.ts`
- All HTTP endpoints implemented in `src/server/http.ts`
- Consistent error handling with Source MCP Contract format
- Comprehensive parameter validation using Zod schemas
- Integration with existing observability (logging, metrics, tracing)
- Reuse parseTimeRange for time-aware endpoints (list_all_runs)
- Proper typing using generated TypeScript models
- 1-based pagination alignment for all list endpoints

**Testing Strategy**:

- Individual smoke tests for each new endpoint
- Comprehensive smoke test script: `scripts/smoke-run-dataset-endpoints.mjs`
- Verify schema URI filtering where applicable
- Verify natural language time support for list_all_runs
- Verify pagination with 1-based page numbers
- Test optional parameters (schemaUri, viewId)
- Integration tests against real Horreum instance

**Documentation Updates**:

- Update README.md with all new tools
- Add examples for common use cases:
  - Getting raw run data vs metadata
  - Using schema URI filters
  - Global run searches
  - Dataset summaries for quick overviews
- Document the difference between run extended vs summary
- Update HTTP API documentation with new endpoints

**Success Criteria**:

- [x] 7 new Run tools implemented (get_run as tool, get_run_data, get_run_metadata,
      get_run_summary, list_runs_by_schema, get_run_count, list_all_runs)
- [x] 1 new Dataset tool implemented (get_dataset_summary)
- [x] All HTTP endpoints implemented with auth middleware
- [x] Comprehensive smoke tests passing
- [x] Natural language time support verified for list_all_runs
- [x] Schema URI filtering working for applicable endpoints
- [x] Documentation complete with examples
- [x] All tests passing with 1-based pagination

### Phase 6.8: Logging and Diagnostics Enhancement (COMPLETED 2025-10-08)

This phase implements comprehensive logging and diagnostics infrastructure to make
failures from downstream clients fast to diagnose in production environments.

**Key Features Implemented**:

1. Correlation IDs via AsyncLocalStorage with automatic propagation
2. SSE-safe request logging middleware with event-based completion tracking
3. Upstream error visibility (HTTP status with body preview, timeout detection, connection errors)
4. Tool and query instrumentation (mcp.tools._, query._, normalize.hint events)
5. Structured error responses with correlation IDs and error types
6. LOG_LEVEL configuration (trace|debug|info|warn|error|fatal|silent)

**Log Event Taxonomy**: mcp.request._, mcp.tools._, query._, upstream._, normalize.hint

### Phase 6.9: Label Values Format Compliance (COMPLETED 2025-10-10)

This phase fixed the label values response format to comply with the Source MCP Contract
by transforming the `values` field from a map to an array and ensuring all field names
use snake_case.

**Changes Implemented**:

1. **Transformation Function** (`transformLabelValues`)
   - Converts `values` from `Record<string, any>` to `Array<{name, value}>`
   - Converts `runId` → `run_id` (string, snake_case)
   - Converts `datasetId` → `dataset_id` (string, snake_case)
   - Converts timestamps from epoch milliseconds to ISO 8601 strings

2. **Applied to Endpoints**:
   - ✅ MCP tool: `get_run_label_values`
   - ✅ MCP tool: `get_test_label_values`
   - ✅ HTTP: `POST /api/tools/horreum_get_run_label_values`
   - ✅ HTTP: `POST /api/tools/horreum_get_test_label_values`

## Historical Changelog (September 2025)

- 2025-09-30 — **Phase 6 Dataset Endpoints Added**: Implemented missing dataset endpoints
  (`list_datasets`, `get_dataset`) with comprehensive smoke tests and time range filtering
  documentation. Both MCP tools and HTTP endpoints complete with Source MCP Contract compliance
  (snake_case fields, string IDs, ISO timestamps). Enhanced error handling with detailed validation
  and upstream error propagation. Documentation: TIME_RANGE_FILTERING.md with filtering patterns,
  natural language support roadmap, and advanced use cases. Comprehensive validation with production
  testing scenarios. Agent: Claude Sonnet 4.5.

- 2025-09-30 — **Phase 6 SSL/TLS Configuration Added**: Implemented SSL/TLS certificate
  configuration support for corporate/self-signed certificates. Added HORREUM_TLS_VERIFY environment
  variable for controlling SSL verification (defaults to true for security). Container entrypoint
  now supports mounting CA bundles at /etc/pki/ca-trust/source/anchors/ and automatically runs
  update-ca-trust when certificates are present. Note: Container must run with --user=0 (root) for
  CA trust update functionality. Added comprehensive SSL_CONFIGURATION.md documentation with
  production Kubernetes examples and testing guidance. Smoke test script (smoke-ssl-config.mjs)
  validates both secure and insecure modes. Implementation supports both production (secure with CA
  bundle) and testing (insecure with verification disabled) workflows. Agent: Claude Sonnet 4.5.

- 2025-09-30 — **Phase 6 Complete - Documentation**: Created comprehensive time range
  filtering documentation (TIME_RANGE_FILTERING.md) covering all supported formats (ISO 8601, epoch
  milliseconds, natural language), filtering patterns (absolute ranges, trailing windows, point-in-
  time), configuration requirements, and advanced use cases. Documented natural language support
  roadmap. All Phase 6 objectives (Direct HTTP API for Server-to-Server Integration) are now
  complete: ✅ HTTP endpoints for all tools, ✅ Bearer token auth, ✅ JSON responses, ✅ Time range
  filtering, ✅ Dataset endpoints, ✅ SSL/TLS support, ✅ Comprehensive documentation. Agent: Claude
  Sonnet 4.5.

- 2025-09-30 — **Phase 6 Capability Discovery**: Implemented source.describe tool
  (MCP + HTTP) for MCP client capability discovery per Source MCP Contract. Returns sourceType
  ("horreum"), version (from package.json), contractVersion ("1.0.0"), capabilities (pagination,
  time_range_filtering, schema_uri_filtering), and limits (maxPageSize: 1000, maxDatasetSize:
  10485760, rateLimitPerMinute: null). Provides programmatic discovery of MCP server features and
  constraints. Smoke test script validates response schema. Agent: Claude Sonnet 4.5.

- 2025-09-30 — **Phase 6 Pagination Implementation**: Implemented Source MCP Contract
  pagination for all list endpoints (tests, runs, datasets). Uses 1-based page numbers (page >= 1),
  returns pagination object with nextPageToken (opaque base64 cursor), hasMore boolean, and optional
  totalCount. Response format: {data: [...], pagination: {...}}. Supports legacy page/limit
  parameters with automatic 0-based to 1-based conversion. Consistent pagination.hasMore logic
  across all endpoints. All HTTP smoke tests updated and passing. Agent: Claude Sonnet 4.5.

- 2025-09-30 — **Phase 6 Major Milestone - All HTTP Endpoints Complete**: Implemented
  all remaining HTTP endpoints for Phase 6 Direct HTTP API: list_datasets (search by test/schema/
  time), get_dataset (raw content by ID), source.describe (capability discovery). All endpoints
  follow Source MCP Contract (snake_case, string IDs, ISO timestamps, pagination). Comprehensive
  smoke tests for all endpoints (tests, runs, datasets, schemas, capability). Time range filtering
  support with intelligent defaults (last 30 days). Bearer token authentication. JSON error
  responses. Phase 6 core objectives complete! Documentation and SSL/TLS support remain. Agent:
  Claude Sonnet 4.5.

- 2025-09-30 — **Phase 6 Implementation Started**: Implemented first direct HTTP API
  endpoints for server-to-server integration: POST /api/tools/horreum_list_tests, POST /api/tools/
  horreum_list_runs, POST /api/tools/horreum_get_schema. All endpoints accept Bearer token auth via
  Authorization header, return JSON responses with snake_case fields per Source MCP Contract, and
  share underlying Horreum API calls with MCP tools for consistency. Comprehensive smoke tests
  validate HTTP mode functionality, auth requirements, and JSON response schemas. README updated
  with HTTP Mode section and curl examples. Phase 6 in progress. Agent: Claude Sonnet 4.5.

- 2025-09-30 — **Phase Reorganization**: Moved Direct HTTP API for Server-to-Server
  Integration from Phase 8 to Phase 6, elevating priority based on RHIVOS PerfScale integration
  requirements. This phase enables Domain MCP servers to call Horreum MCP directly via HTTP POST
  endpoints without requiring MCP client libraries, critical for end-to-end testing and production
  deployments. Updated phase numbers and status checklist accordingly. Agent: Claude Sonnet 4.5.

- 2025-09-30 — **Phase Integration from RHIVOS Requirements**: Added comprehensive
  Phase 6.5 (End-to-End Integration Fixes) based on critical blockers discovered during RHIVOS
  PerfScale Domain MCP end-to-end testing. Three critical fixes required before Phase 7: (1) Source
  MCP Contract schema compliance (test_id/run_id/dataset_id fields, has_more pagination, snake_case
  naming), (2) Natural language time query support (relative dates, defaults, AI-friendly queries),
  (3) Pagination alignment with Horreum (1-based pages, remove page=0 special handling). Includes
  detailed implementation plans, affected endpoints, testing strategies, and architectural rationale.
  Updated current execution directive to prioritize Phase 6.5. Agent: Claude Sonnet 4.5.

- 2025-09-29 — **Container Multi-Architecture Fixes**: Resolved critical WebAssembly
  compatibility issues in multi-architecture container builds. Root cause: esbuild's native
  binaries incompatible with platform emulation during multi-arch builds. Solution: Install esbuild
  from npm (JavaScript version) instead of system package manager to ensure correct platform
  binaries. Updated Containerfile to use npm for all Node.js tooling (esbuild, tsup, typescript).
  Removed dnf install of esbuild. Multi-arch manifest builds (amd64, arm64) now working with both
  podman and buildah. Validated with local test builds. CI/CD pipeline remains robust. Agent: Claude
  Sonnet 4.5.

- 2025-09-26 — **Phase 9 status refined**: Marked multi-arch support as
  delivered in Phase 5 and refined Phase 9 scope to REST API mode only. Agent: Claude Sonnet 4.5.

- 2025-09-26 — **Domain MCP Integration Documentation**: Added comprehensive
  architecture documentation in docs/architecture/ covering the Domain MCP integration pattern,
  Source MCP Contract details, and integration guide. Clarified that Horreum MCP serves as a Source
  MCP abstraction layer for domain-specific MCP servers (e.g., RHIVOS PerfScale). Updated README to
  emphasize the domain integration use case. Agent: Claude Sonnet 4.5.

- 2025-09-26 — **Phase 5 Completed**: Hardened container image (OCI labels,
  vulnerability scanning, multi-architecture support for amd64/arm64). Improved CI/CD with
  automated quay.io deployment, security scanning gate, and proper GitHub event handling. Enhanced
  documentation for container deployment and security best practices. Ready for production use.
  Agent: Claude Sonnet 4.5.

- 2025-09-25 — **CI Container Build added**: Introduced GitHub Actions
  workflow for automated multi-architecture container builds (amd64, arm64) with Trivy security
  scanning and automated deployment to quay.io. Workflow triggers on push to main (for sources/
  Containerfile changes) and on release events. Comprehensive workflow and security documentation
  added. Agent: Claude Sonnet 4.5.
