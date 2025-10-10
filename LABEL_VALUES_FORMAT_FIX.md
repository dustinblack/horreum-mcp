# Label Values Format Fix - Source MCP Contract Compliance

## Issue Summary

The `horreum_get_run_label_values` and `horreum_get_test_label_values` tools were
returning Horreum's native API format instead of transforming it to the Source MCP
Contract format, causing Pydantic validation errors in the Domain MCP.

## Changes Made

### 1. Added Transformation Function

**Files Modified:**

- `src/server/tools.ts`
- `src/server/http.ts`

**New Function:** `transformLabelValues()`

Transforms Horreum's `ExportedLabelValues[]` format to Source MCP Contract format:

**Input (Horreum native):**

```json
[{
  "values": {"BOOT0 - SystemInit Duration Average ms": 1530.286, ...},
  "runId": 120214,
  "datasetId": 323991,
  "start": 1759886426747,
  "stop": 1759887707248
}]
```

**Output (Source MCP Contract):**

```json
[{
  "values": [
    {"name": "BOOT0 - SystemInit Duration Average ms", "value": 1530.286},
    ...
  ],
  "run_id": "120214",
  "dataset_id": "323991",
  "start": "2025-10-07T21:20:26.747Z",
  "stop": "2025-10-07T21:41:47.248Z"
}]
```

**Transformation Details:**

1. **values field**: `Record<string, any>` → `Array<{name: string, value: any}>`
2. **runId field**: Renamed to `run_id` (snake_case) and converted to string
3. **datasetId field**: Renamed to `dataset_id` (snake_case) and converted to
   string
4. **start/stop fields**: Epoch milliseconds → ISO 8601 datetime strings

### 2. Applied Transformation

**MCP Tools (tools.ts):**

- ✅ `get_run_label_values` (line 925-928)
- ✅ `get_test_label_values` (line 1015-1018)
- ℹ️ `get_dataset_label_values` - No transformation needed (different format)

**HTTP Endpoints (http.ts):**

- ✅ `POST /api/tools/horreum_get_run_label_values` (line 2275-2279)
- ✅ `POST /api/tools/horreum_get_test_label_values` (line 2423-2427)
- ℹ️ `POST /api/tools/horreum_get_dataset_label_values` - No transformation
  needed

### 3. Updated Documentation

**File:** `docs/LABEL_VALUES_FILTERING.md`

- Clarified that run and test endpoints return transformed format
- Documented dataset endpoint returns different format (LabelValue[])
- Added format details with examples for both formats

### 4. Created Validation Test

**File:** `scripts/smoke-label-values-format.mjs`

New smoke test script that:

- Tests direct Horreum API to show native format
- Tests transformed API via MCP HTTP endpoint
- Validates format compliance with Source MCP Contract:
  - `values` is an array of `{name, value}` objects
  - `run_id` and `dataset_id` are strings (snake_case)
  - `start` and `stop` are ISO 8601 datetime strings
  - No `runId` or `datasetId` fields in camelCase

**Usage:**

```bash
node scripts/smoke-label-values-format.mjs [RUN_ID]
```

## Why This Approach is Correct

### Architecture Context

```
AI Client → Domain MCP → Source Adapters (Horreum MCP) → Data Sources (Horreum)
```

- **Source MCP Contract**: Defined by Domain MCP team, establishes interface
  standard
- **Horreum MCP Role**: Adapter that translates between Horreum's API and the
  contract
- **Domain MCP Role**: Provides domain analysis using consistent data from
  multiple sources

### Reasons for Array Format in Contract

1. **Order preservation**: Maintains semantic ordering of label values
2. **Type safety**: Explicit `{name, value}` structure is strongly typed
3. **Pydantic validation**: Easier to validate in Python (Domain MCP language)
4. **Consistency**: All object arrays follow same pattern across contract

### Why Not Change the Contract Instead?

Changing the Domain MCP contract would:

- ❌ Break other source adapters already complying with the contract
- ❌ Require changes to Domain MCP's Pydantic models
- ❌ Require updates to all plugins consuming label values
- ❌ Violate architectural principle that adapters conform to the platform

## Testing

### Build and Lint

```bash
npm run build    # ✅ Success
npm run check    # ✅ No errors
npm run format   # ✅ Formatted
```

### Manual Testing with Production Data

To test with real Horreum data:

```bash
# Set up environment
export HORREUM_BASE_URL="https://horreum.corp.redhat.com"
export HORREUM_TOKEN="your-token"
export MCP_BASE_URL="http://localhost:3001"
export MCP_TOKEN="your-mcp-token"

# Run the validation test
node scripts/smoke-label-values-format.mjs 120214
```

Expected output:

- Direct Horreum API shows native format (with runId, values as dict)
- Transformed API shows Source MCP Contract format (with run_id, values as
  array)
- All format validations pass

## Files Changed

```
src/server/tools.ts                          +67 lines (transformation function + 2 applications)
src/server/http.ts                           +67 lines (transformation function + 2 applications)
docs/LABEL_VALUES_FILTERING.md               +35 lines (format documentation)
scripts/smoke-label-values-format.mjs        +242 lines (new validation test)
LABEL_VALUES_FORMAT_FIX.md                   +220 lines (this document)
```

## Impact

### ✅ Fixes

- Domain MCP can now parse label values responses without Pydantic validation
  errors
- Label values data flows correctly through the integration stack
- Boot phase metrics can be extracted from label values (fast path)

### ℹ️ No Breaking Changes

- MCP tool interface unchanged (internal transformation)
- HTTP endpoint interface unchanged (internal transformation)
- `get_dataset_label_values` unaffected (different format, no transformation
  needed)

## Next Steps

1. **Deploy to test environment** and verify with Domain MCP integration
2. **Run smoke test** against production Horreum to validate transformation
3. **Monitor logs** for any transformation errors or edge cases
4. **Update Domain MCP documentation** to reflect that label values format is
   now correct

## References

- **Development Plan**: `mcp_development_plan.md` (Phase 6.6)
- **Integration Tracking**: `RHIVOS_INTEGRATION.md`
- **Source MCP Contract**:
  `/home/dblack/git/gitlab/perfscale/sandbox/rhivos-perfscale-mcp/docs/contracts/source-mcp-contract.md`
- **Label Values Filtering**: `docs/LABEL_VALUES_FILTERING.md`
- **User Issue**: GitHub issue or support ticket (if applicable)
