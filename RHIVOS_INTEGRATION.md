# RHIVOS PerfScale MCP Integration Tracking

This document tracks the integration requirements and change requests from the
RHIVOS PerfScale MCP project's end-to-end testing with Horreum MCP.

## Source Documents

- **Requirements**: `/home/dblack/git/gitlab/perfscale/sandbox/rhivos-perfscale-mcp/docs/horreum-mcp-requirements.md`
- **Change Requests**: `/home/dblack/git/gitlab/perfscale/sandbox/rhivos-perfscale-mcp/docs/horreum-mcp-change-requests.md`

## Integration Summary

The RHIVOS PerfScale MCP Domain server requires direct HTTP API endpoints for
server-to-server communication. The MCP protocol (SSE) is intended for AI
clients, not for backend service integration. Adding direct HTTP endpoints
enables simpler, faster, and more debuggable integration.

## Implementation Plan

All changes have been integrated into **Phase 6** of the development plan
(`mcp_development_plan.md`), which is now the **immediate next priority**
following Phase 5 (Containerization).

### Phase 6: Direct HTTP API for Server-to-Server Integration

#### 1. Direct HTTP Tool Endpoints (Critical Priority)

**Status**: ✅ **COMPLETED** (5 of 5 endpoints complete)

Add POST endpoints that mirror MCP tools for server-to-server communication:

- ✅ `POST /api/tools/horreum_list_runs` - List runs with time filtering
- ✅ `POST /api/tools/horreum_get_run` - Get specific run by ID
- ✅ `POST /api/tools/horreum_list_tests` - List tests with optional name filter
- ✅ `POST /api/tools/horreum_list_schemas` - List available schemas
- ✅ `POST /api/tools/horreum_get_schema` - Get schema by ID or name

**Requirements**:

- ✅ Accept Bearer token authentication (same as MCP endpoint)
- ✅ Return JSON responses
- ✅ Use same underlying Horreum API calls as MCP tools
- ✅ Keep existing MCP endpoint for AI clients

**Implementation Details** (`horreum_list_runs`):

- Accepts `testId` (number) or `test` (name/ID string)
- Supports optional parameters: `trashed`, `limit`, `page`, `sort`, `direction`
- Supports time filtering with `from`/`to` (ISO timestamps or epoch millis)
- Client-side aggregation when time filters are used
- Returns `{total: number, runs: RunSummary[]}`
- Error handling via `sendContractError` helper with Source MCP Contract format

**Testing**:

- ✅ Added `scripts/smoke-http-list-runs.mjs` with mock Horreum API
- ✅ Added `scripts/smoke-http-all-endpoints.mjs` comprehensive test for all 5 endpoints
- ✅ Verify endpoints accept Bearer token auth
- ✅ Test JSON request/response format for all endpoints
- ✅ Validated response shapes for all endpoints
- ⏳ Integration test with Domain MCP adapter (pending)

#### 2. Standardized Error Handling (Medium Priority)

**Status**: ✅ **COMPLETED** (applied to all 5 HTTP endpoints)  
**Change Request**: CR-20250930-1

Implement Source MCP Contract error format for all tools and endpoints:

```typescript
{
  "error": {
    "code": "NOT_FOUND" | "INVALID_REQUEST" | "RATE_LIMITED" |
            "INTERNAL_ERROR" | "SERVICE_UNAVAILABLE" | "TIMEOUT",
    "message": "Human-readable error message",
    "details": {
      // Context-specific details (IDs, suggestions, etc.)
    },
    "retryable": boolean,
    "retryAfter"?: number  // Optional: seconds to wait
  }
}
```

**Common Cases to Handle**:

- Test not found
- Run not found
- Dataset not found
- Schema not found
- Horreum API authentication failures
- Horreum API rate limiting
- Network timeouts
- Invalid parameters

**Testing**:

- Call each tool with invalid parameters
- Verify error format matches specification
- Check error messages are helpful for debugging

#### 3. Pagination Support (High Priority)

**Status**: ✅ **COMPLETED**  
**Change Request**: CR-20250930-3

Implement consistent pagination for all list tools (`list_tests`, `list_runs`,
`datasets.search`):

**Input Parameters** (optional):

- `pageToken`: string - Opaque pagination token
- `pageSize`: integer - Number of items per page (default: 100, max: 1000)

**Response Format**:

```typescript
{
  "tests": [...],  // or runs, datasets depending on tool
  "pagination": {
    "nextPageToken"?: string,  // Only if more pages available
    "hasMore": boolean,
    "totalCount"?: number      // Optional but helpful
  }
}
```

**Implementation Details**:

- Use opaque page tokens (e.g., base64 encoded cursor)
- Maintain consistent ordering across pages (timestamp DESC)
- Handle pageSize validation (1-1000)
- Return hasMore=false on last page
- Map to Horreum's pagination mechanism

**Testing**:

- Fetch data with pageSize=5
- Use nextPageToken to get next page
- Verify consistent ordering
- Verify hasMore flag is correct
- Test invalid page tokens

#### 4. Schema URI Filtering (Medium Priority)

**Status**: Pending  
**Change Request**: CR-20250930-4

Add schema URI filtering to `datasets.search` tool:

**Input Parameter**:

- `schemaUri`: string (optional) - Filter datasets by their `$schema` field

**Expected Behavior**:

1. When schemaUri is provided, only return datasets where `$schema` matches
2. Match should be exact (not partial)
3. If no datasets match, return empty array with pagination metadata
4. Support combining with other filters (testId, time range)

**Example**:

```typescript
// Request
{
  "testId": "boot-test-123",
  "schemaUri": "urn:boot-time-verbose:04",
  "pageSize": 10
}

// Only includes datasets where:
// dataset.content.$schema === "urn:boot-time-verbose:04"
```

**Testing**:

1. Search with specific schema URI
2. Verify only matching datasets returned
3. Test with non-existent schema URI (should return empty)
4. Combine with other filters

#### 5. Capability Discovery (Low Priority)

**Status**: Pending  
**Change Request**: CR-20250930-2

Implement `source.describe` tool for runtime capability discovery:

**Response Format**:

```typescript
{
  "sourceType": "horreum",
  "version": "1.0.0",           // Horreum MCP version
  "contractVersion": "1.0.0",   // Source MCP Contract version
  "capabilities": {
    "pagination": true,
    "caching": false,           // or true if implemented
    "streaming": false,
    "schemas": true             // if schema tool is available
  },
  "limits": {
    "maxPageSize": 1000,
    "maxDatasetSize": 10485760, // 10MB
    "rateLimitPerMinute": 60
  }
}
```

**Implementation**:

1. Create new MCP tool called "source.describe"
2. Empty input schema (no parameters)
3. Return capabilities object with actual values from configuration
4. Add tests to verify response format

**Testing**:

1. Call the source.describe tool
2. Verify response format matches specification
3. Verify capability flags are accurate

#### 6. Documentation Improvements (Low Priority)

**Status**: Pending  
**Change Request**: CR-20250930-5

Clarify and document time range filtering behavior:

**For Tools**: `list_runs`, `datasets.search`

**Documentation Requirements**:

1. What timestamp field is being filtered (startedAt? createdAt?)
2. Is the range inclusive or exclusive? (from <= x < to?)
3. How are missing values handled? (from only? to only? neither?)
4. Timezone handling (UTC assumed?)

**Add Examples**:

```typescript
// Get runs from the last 7 days
{
  "testId": "test-123",
  "from": "2025-09-23T00:00:00Z",
  "to": "2025-09-30T00:00:00Z"
}
```

**Error Handling**:

- What if from > to?
- What if dates are far in the future?
- What if date format is invalid?

**Testing**:

1. Query with from/to range
2. Verify which runs/datasets are included
3. Test edge cases (same day, invalid ranges)

## Change Request Status

| CR ID         | Title                       | Priority | Type          | Status    |
| ------------- | --------------------------- | -------- | ------------- | --------- |
| CR-20250930-1 | Enhanced Error Messages     | Medium   | Enhancement   | Completed |
| CR-20250930-2 | Tool Discovery/Capabilities | Low      | Enhancement   | Pending   |
| CR-20250930-3 | Pagination Support          | High     | Enhancement   | Completed |
| CR-20250930-4 | Schema URI Filtering        | Medium   | Enhancement   | Pending   |
| CR-20250930-5 | Time Range Filtering Docs   | Low      | Documentation | Pending   |

## Implementation Order

Based on priority and dependencies:

1. **Critical**: Direct HTTP Tool Endpoints
2. **High**: Pagination Support (CR-20250930-3)
3. **Medium**: Standardized Error Handling (CR-20250930-1)
4. **Medium**: Schema URI Filtering (CR-20250930-4)
5. **Low**: Capability Discovery (CR-20250930-2)
6. **Low**: Documentation Improvements (CR-20250930-5)

## Testing Strategy

### Unit Tests

- Test each HTTP endpoint with valid/invalid inputs
- Test error handling for all error codes
- Test pagination logic (page tokens, boundaries)
- Test schema URI filtering logic

### Integration Tests

- Test with real Horreum instance (or mock)
- Test end-to-end request/response cycles
- Test authentication (Bearer token)
- Test error scenarios (timeouts, rate limits)

### Contract Tests

- Verify error format matches Source MCP Contract
- Verify pagination format matches specification
- Verify source.describe response format

### End-to-End Tests

- Integration with RHIVOS PerfScale MCP Domain server
- Test HorreumAdapter calling HTTP endpoints
- Verify data flow from Gemini → Domain MCP → Horreum MCP → Horreum

## Related Documentation

- Development Plan: `mcp_development_plan.md` (Phase 6)
- README: `README.md` (will need updates for new endpoints)
- Source MCP Contract: `/home/dblack/git/gitlab/perfscale/sandbox/rhivos-perfscale-mcp/docs/contracts/source-mcp-contract.md`

## Notes

- All changes maintain backward compatibility with existing MCP functionality
- The MCP SSE endpoint at `/mcp` remains for AI clients
- New HTTP endpoints are for server-to-server integration only
- Bearer token authentication is shared between MCP and HTTP endpoints

## Changelog

- 2025-09-30: **Pagination Implementation Complete**: Implemented Source MCP Contract
  pagination (CR-20250930-3) for `list_runs` and `list_tests` HTTP endpoints. Added
  pageToken/pageSize support with backward compatibility for page/limit. Page tokens are
  opaque base64-encoded cursors. Response format includes `pagination: {nextPageToken?, 
hasMore, totalCount?}`. Validation ensures pageSize is 1-1000 with default 100. Added
  comprehensive smoke test `scripts/smoke-http-pagination.mjs` validating first/
  subsequent/last pages, invalid tokens, and both endpoints. CR-20250930-3 marked as
  completed.
- 2025-09-30: **Major Milestone - All HTTP Endpoints Complete**: Implemented all five
  HTTP endpoints (`list_runs`, `get_run`, `list_tests`, `list_schemas`, `get_schema`)
  with consistent Source MCP Contract error handling across all endpoints. Added
  comprehensive smoke test covering all endpoints. Core Direct HTTP API requirement
  for RHIVOS PerfScale MCP integration is now complete. CR-20250930-1 (Enhanced Error
  Messages) marked as completed.
- 2025-09-30: Implemented first HTTP endpoint `POST /api/tools/horreum_list_runs`
  with Source MCP Contract error handling. Added `sendContractError` helper and
  smoke test. Updated status tracking for endpoints and error handling.
- 2025-09-30: Phase renumbered from Phase 8 to Phase 6 to prioritize as immediate
  next actionable work following Phase 5 (Containerization)
- 2025-09-30: Initial integration tracking document created based on RHIVOS
  PerfScale MCP requirements and change requests
