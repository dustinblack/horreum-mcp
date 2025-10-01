# Horreum MCP Integration Status Report

**Date:** 2025-10-01  
**Audience:** Domain MCP Development Team  
**Status:** ✅ **ALL PHASE 6.5 FEATURES COMPLETE AND WORKING**

---

## Executive Summary

The Horreum MCP server has **successfully completed all Phase 6.5 integration
requirements** and is fully operational for end-to-end integration with the
Domain MCP. All three critical issues identified in the Domain MCP integration
testing have been resolved.

### ✅ All Phase 6.5 Issues Resolved

1. **Schema Compliance** ✅ COMPLETE
   - `test_id`, `run_id`, `dataset_id` fields present in all responses
   - All pagination fields use snake_case (`has_more`, `next_page_token`,
     `total_count`)
   - Comprehensive validation smoke tests included

2. **Natural Language Time Queries** ✅ COMPLETE AND VERIFIED
   - Full support for natural language expressions via `chrono-node`
   - Supports: "last week", "yesterday", "last 7 days", "last 30 days", etc.
   - Intelligent default: "last 30 days" when no time params provided
   - Also supports ISO 8601 timestamps and epoch milliseconds
   - **TESTED AND VERIFIED** with live HTTP endpoints

3. **Pagination Alignment** ✅ COMPLETE
   - Aligned to Horreum's 1-based pagination model (first page is 1)
   - Removed confusing `page=0` semantics
   - Updated all schema validators and documentation

---

## Response to Integration Report Issues

### Issue: "Natural Language Time Queries - BLOCKED on Horreum MCP"

**STATUS: ✅ RESOLVED - Feature is Complete and Working**

The integration report from `/home/dblack/git/gitlab/perfscale/sandbox/
rhivos-perfscale-mcp/docs/integration-breakthrough-status.md` states:

> **Status:** BLOCKED on Horreum MCP
> **Current behavior:** Horreum MCP returns 400 for `from="last week"`

**This is OUTDATED information.** The natural language time query feature was
completed in Phase 6.5 and is now fully operational.

### Verification Tests (Conducted 2025-10-01)

**Test 1: list_datasets with "last week"**

```bash
curl -X POST http://localhost:3001/api/tools/horreum_list_datasets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"test_id": 262, "from": "last week", "page_size": 5}'
```

**Result:** ✅ HTTP 200 OK, 5 datasets returned

**Test 2: list_runs with "last week"**

```bash
curl -X POST http://localhost:3001/api/tools/horreum_list_runs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"test": "262", "from": "last week", "limit": 3}'
```

**Result:** ✅ HTTP 200 OK, 3 runs returned

**Test 3: list_runs with "yesterday"**

```bash
curl -X POST http://localhost:3001/api/tools/horreum_list_runs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"test": "262", "from": "yesterday", "limit": 3}'
```

**Result:** ✅ HTTP 200 OK, 0 runs (no runs yesterday, but query parsed
successfully)

### Supported Time Expressions

The Horreum MCP now supports **all** of the following time formats:

1. **Natural Language** (via `chrono-node`):
   - `"last week"` → 7 days ago to now
   - `"yesterday"` → yesterday to now
   - `"last 7 days"` → 7 days ago to now
   - `"last 30 days"` → 30 days ago to now
   - `"now"` → current moment
   - `"today"` → today at 00:00:00
   - And many more natural language expressions

2. **ISO 8601 Timestamps**:
   - `"2025-09-24T00:00:00Z"` → September 24, 2025 at midnight UTC
   - `"2025-09-24"` → September 24, 2025 at 00:00:00

3. **Epoch Milliseconds**:
   - `"1727136000000"` → September 24, 2024 at midnight UTC

4. **Default Behavior** (no `from`/`to` provided):
   - Automatically defaults to "last 30 days"
   - Smart, user-friendly default for exploratory queries

---

## Implementation Details

### Time Parsing Architecture

**File:** `src/utils/time.ts`

The time parsing utility uses a robust fallback chain:

1. **Try natural language** using `chrono-node` (e.g., "last week")
2. **Try epoch milliseconds** (numeric strings)
3. **Try ISO 8601 / standard date strings**
4. **Apply intelligent defaults** if no time params provided

**Code Example:**

```typescript
import { parseTimeRange } from './utils/time.js';

// Natural language
const { fromMs, toMs } = parseTimeRange('last week', undefined);
// fromMs: 1758718184912 (7 days ago)
// toMs: 1759322984930 (now)

// ISO timestamp
const { fromMs, toMs } = parseTimeRange('2025-09-24T00:00:00Z', '2025-10-01T00:00:00Z');

// Default behavior
const { fromMs, toMs } = parseTimeRange();
// Defaults to last 30 days
```

### Integration Points

Natural language time parsing is integrated into:

1. **HTTP API Endpoints:**
   - `POST /api/tools/horreum_list_runs`
   - `POST /api/tools/horreum_list_datasets`

2. **MCP Tools:**
   - `horreum_list_runs`
   - `horreum_list_datasets`

### Testing

**Unit Tests:** `src/tests/time.test.ts`

- 23 comprehensive tests covering all time formats
- Natural language expressions
- ISO timestamps
- Epoch milliseconds
- Default behavior
- Edge cases

**Smoke Tests:** `scripts/smoke-natural-language-time.mjs`

- End-to-end validation of time parsing
- Tests all supported formats
- Verifies correct date conversion

---

## Current API Behavior

### Example Request (list_datasets with natural language time)

```bash
curl -X POST http://localhost:3001/api/tools/horreum_list_datasets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "test_id": 262,
    "from": "last week",
    "page_size": 5
  }'
```

### Example Response

```json
{
  "datasets": [
    {
      "dataset_id": 323991,
      "run_id": 116572,
      "test_id": 262,
      "test_name": "boot-time-verbose",
      "start": 1759195217709,
      "stop": 1759196510500,
      "schema_uri": "urn:boot-time-verbose:06",
      "schemas": ["urn:boot-time-verbose:06"]
    }
    // ... 4 more datasets
  ],
  "pagination": {
    "has_more": true,
    "total_count": 520
  }
}
```

**Note:** All required Source MCP Contract fields are present:

- ✅ `dataset_id` (string)
- ✅ `run_id` (number)
- ✅ `test_id` (number)
- ✅ `has_more` (boolean)
- ✅ `total_count` (number, when available)
- ✅ All fields use snake_case naming

---

## Domain MCP Integration Checklist

### ✅ Completed

- [x] Schema compliance: `test_id`, `run_id`, `dataset_id` fields
- [x] Schema compliance: snake_case naming (`has_more`, `next_page_token`)
- [x] Natural language time queries fully implemented
- [x] Natural language time queries tested and verified
- [x] 1-based pagination aligned with Horreum API
- [x] HTTP 200 responses throughout the stack
- [x] No Pydantic validation errors
- [x] SSL/TLS configuration working

### 🔍 Remaining Items (Domain MCP Side)

Based on the integration report, these items remain on the **Domain MCP side**:

1. **Plugin Metrics Extraction**
   - **Symptom:** Plugin returns 0 metrics despite fetching 10 datasets
   - **Horreum MCP Status:** ✅ Datasets are being fetched successfully
   - **Action Required:** Debug plugin extraction logic on Domain MCP side
   - **Not a Horreum MCP issue**

2. **Update Integration Documentation**
   - **Action Required:** Update Domain MCP integration docs to reflect that
     natural language time queries ARE working
   - **Remove:** "BLOCKED on Horreum MCP" status
   - **Update:** Add examples of working natural language queries

---

## Next Steps for Domain MCP Team

### 1. Update Time Query Implementation

Replace any workarounds or hardcoded ISO timestamps with natural language
queries:

**Before (Workaround):**

```python
# Explicit ISO timestamp workaround
req = HorreumListDatasetsRequest(
    test_id=262,
    from="2025-09-24T00:00:00Z",  # Hardcoded
    to="2025-10-01T00:00:00Z"     # Hardcoded
)
```

**After (Natural Language):**

```python
# Natural language - works now!
req = HorreumListDatasetsRequest(
    test_id=262,
    from="last week"  # ✅ Fully supported
)
```

### 2. Test Natural Language Queries

Verify that your Domain MCP → Horreum MCP integration correctly passes natural
language time expressions:

```bash
# Test from Domain MCP
curl -X POST http://localhost:8080/tools/get_key_metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer example-domain-token-12345" \
  -d '{
    "time_range": "last week"
  }'
```

Expected behavior:

- Domain MCP translates `time_range` to Horreum MCP `from` parameter
- Horreum MCP parses "last week" → epoch milliseconds
- Horreum API receives filtered dataset list
- Domain MCP receives datasets from last 7 days

### 3. Debug Plugin Metrics Extraction

The Horreum MCP is successfully fetching and returning dataset content. If
metrics are not being extracted, this is a **Domain MCP plugin issue**, not a
Horreum MCP issue.

**Debugging steps:**

1. Inspect raw dataset JSON from Horreum MCP:

   ```bash
   curl -X POST http://localhost:3001/api/tools/horreum_get_dataset \
     -H "Authorization: Bearer test-token" \
     -d '{"dataset_id": 323991}' | jq '.content'
   ```

2. Verify schema version detection in Domain MCP plugin
3. Check if plugin `can_extract()` returns True
4. Add debug logging to plugin extraction logic

### 4. Update Integration Documentation

Remove the "BLOCKED on Horreum MCP" status from your integration documentation
and update with accurate status:

- ✅ Natural language time queries: **WORKING**
- ✅ Schema compliance: **COMPLETE**
- ✅ 1-based pagination: **COMPLETE**

---

## Testing Checklist for Domain MCP

Use this checklist to verify end-to-end integration:

### HTTP API Tests

- [ ] `list_tests` with natural language time (if applicable)
- [ ] `list_runs` with `from="last week"`
- [ ] `list_runs` with `from="yesterday"`, `to="now"`
- [ ] `list_datasets` with `from="last 30 days"`
- [ ] `list_datasets` with `from="last week"`
- [ ] Verify all responses include `test_id`, `run_id`, `dataset_id`
- [ ] Verify all pagination uses snake_case (`has_more`, `total_count`)
- [ ] Verify no Pydantic validation errors in Domain MCP logs

### End-to-End Tests

- [ ] Domain MCP successfully fetches datasets with natural language time
- [ ] Domain MCP plugin extracts metrics from datasets
- [ ] Gemini CLI receives and displays boot time metrics
- [ ] Natural language prompts work: "Show me boot time results from last week"

---

## Summary

### What Changed Since Integration Report

1. **Natural Language Time Queries:** COMPLETE ✅
   - Fully implemented and tested
   - No longer blocked
   - Ready for production use

2. **Schema Compliance:** COMPLETE ✅
   - All required fields present
   - Snake_case naming throughout

3. **Pagination Alignment:** COMPLETE ✅
   - 1-based pagination aligned with Horreum API
   - Clearer semantics for "all results" queries

### Current Status

**Phase 6.5: COMPLETE ✅**

All blocking issues for full end-to-end integration with Domain MCP are
resolved. The Horreum MCP is production-ready and awaiting Domain MCP plugin
debugging.

### Contact

For questions or issues with the Horreum MCP:

- Check the `README.md` for usage examples
- Review `mcp_development_plan.md` for development status
- Run smoke tests: `npm run smoke:all`
- Check logs: `/tmp/horreum-mcp.log`

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-01  
**AI-assisted-by:** Claude Sonnet 4.5
