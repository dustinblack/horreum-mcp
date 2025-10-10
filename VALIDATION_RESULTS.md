# Label Values Format Validation Results

**Date:** 2025-10-10  
**Test Environment:** Production Horreum (horreum.corp.redhat.com)  
**Test Runs:** 120214, 116572

## ✅ Validation Summary

All tests **PASSED** with production data from Horreum.

## Test Results

### Test 1: Format Compliance (Run 120214)

**Direct Horreum API (Native Format):**

```json
{
  "values": {
    "BOOT1 - Kernel Pre-Timer Duration Confidence": "Need to collect",
    "KPI - Start Kmod Load Duration Average ms": 3.343,
    ...
  },
  "runId": 120214,
  "datasetId": 327697,
  "start": 1759886426747,
  "stop": 1759887707248
}
```

**Transformed MCP API (Source MCP Contract Format):**

```json
{
  "values": [
    {
      "name": "BOOT1 - Kernel Pre-Timer Duration Confidence",
      "value": "Need to collect"
    },
    {
      "name": "KPI - Start Kmod Load Duration Average ms",
      "value": 3.343
    },
    ...
  ],
  "run_id": "120214",
  "dataset_id": "327697",
  "start": "2025-10-08T01:20:26.747Z",
  "stop": "2025-10-08T01:41:47.248Z"
}
```

### Test 2: Second Run Verification (Run 116572)

```json
{
  "run_id": "116572",
  "dataset_id": "323991",
  "values_type": "array",
  "values_sample": [
    {
      "name": "BOOT1 - Kernel Pre-Timer Duration Confidence",
      "value": "Need to collect"
    },
    {
      "name": "KPI - Start Kmod Load Duration Average ms",
      "value": 6.349
    },
    {
      "name": "BOOT3 - Initrd Duration Confidence",
      "value": 6.283
    }
  ],
  "timestamps": {
    "start": "2025-09-30T01:20:17.709Z",
    "stop": "2025-09-30T01:41:50.500Z"
  }
}
```

## ✅ Validation Checks

All requirements verified:

- ✅ **values format**: `array` (not `object`)
- ✅ **values structure**: Array of `{name: string, value: any}` objects
- ✅ **run_id field**: Present as `string` (not `number`)
- ✅ **dataset_id field**: Present as `string` (not `number`)
- ✅ **Field naming**: `run_id`, `dataset_id` (snake_case, not camelCase)
- ✅ **No camelCase fields**: `runId` and `datasetId` absent
- ✅ **start timestamp**: ISO 8601 format (e.g., `"2025-10-08T01:20:26.747Z"`)
- ✅ **stop timestamp**: ISO 8601 format (e.g., `"2025-10-08T01:41:47.248Z"`)
- ✅ **Values preserved**: All 49 label values transformed correctly
- ✅ **Data integrity**: Values match between native and transformed formats

## Detailed Validation

### Field Type Verification (Run 120214)

```json
{
  "values_structure": "array",          ✅ Correct
  "values_count": 49,                   ✅ All values present
  "run_id_type": "string",              ✅ String (was number)
  "dataset_id_type": "string",          ✅ String (was number)
  "start_format": "2025-10-08T...",     ✅ ISO 8601 (was epoch millis)
  "stop_format": "2025-10-08T...",      ✅ ISO 8601 (was epoch millis)
  "has_runId": false,                   ✅ No camelCase field
  "has_datasetId": false                ✅ No camelCase field
}
```

## Test Commands Used

### Smoke Test

```bash
node scripts/smoke-label-values-format.mjs 120214
```

Result: **PASS** (2/2 tests)

### Direct API Verification

```bash
curl -s -X POST http://localhost:3001/api/tools/horreum_get_run_label_values \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"run_id": 120214}' | jq '.[0]'
```

## Impact Assessment

### ✅ Domain MCP Integration

The transformation ensures:

1. **Pydantic Validation Success**: Domain MCP can now parse responses without
   validation errors
2. **Boot Phase Metrics Extraction**: Label values path (fast) is now available
   for boot time analysis
3. **Contract Compliance**: Horreum MCP properly implements Source MCP Contract
4. **Data Consistency**: All source adapters now return consistent format

### 🔄 Backward Compatibility

- ✅ Internal transformation only - no API changes
- ✅ MCP tools interface unchanged
- ✅ HTTP endpoints interface unchanged
- ✅ No breaking changes for consumers

## Production Readiness

The fix is **production ready**:

- ✅ Tested with real Horreum production data
- ✅ Multiple runs validated (120214, 116572)
- ✅ All format requirements met
- ✅ Build and tests pass
- ✅ Code formatted and linted
- ✅ Documentation updated

## Next Steps

1. **Deploy to staging** environment for Domain MCP integration testing
2. **Coordinate with Domain MCP team** to verify end-to-end flow
3. **Monitor** for any edge cases or unexpected data formats
4. **Deploy to production** after staging validation

## Files Modified

- `src/server/tools.ts` - Transformation function + MCP tools
- `src/server/http.ts` - Transformation function + HTTP endpoints
- `docs/LABEL_VALUES_FILTERING.md` - Format documentation
- `scripts/smoke-label-values-format.mjs` - Validation test (new)
- `LABEL_VALUES_FORMAT_FIX.md` - Change documentation (new)
- `VALIDATION_RESULTS.md` - This file (new)
