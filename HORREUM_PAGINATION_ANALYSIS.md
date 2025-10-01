# Horreum Pagination Analysis and Alignment

**Date**: 2025-10-01  
**Issue**: [Hyperfoil/Horreum#2525](https://github.com/Hyperfoil/Horreum/issues/2525)  
**Status**: Bug acknowledged, workaround in place

## Executive Summary

The Horreum API uses **1-based pagination** where `page=1` is the first page. The behavior of `page=0` is inconsistent across endpoints and can cause 500 errors when combined with `limit` parameters on certain endpoints.

**Our Current Implementation**: We have a workaround that omits `page=0` from requests, but this is **incomplete** and **semantically incorrect** for our MCP/HTTP API design.

**Required Action**: Align our pagination strategy with Horreum's 1-based design throughout the codebase.

---

## Horreum API Behavior

### Official Pagination Model

- **First page**: `page=1` (not `page=0`)
- **`page=0` behavior**: Inconsistent across endpoints
  - Some endpoints: Interpret as `page=1` (ignored/aliased)
  - `/api/dataset/list/{testId}`: Returns 500 error when combined with `limit`
  - Some endpoints: May return all results (undocumented)

### Known Bug

**Issue**: [Hyperfoil/Horreum#2525](https://github.com/Hyperfoil/Horreum/issues/2525)

- Endpoint: `/api/dataset/list/{testId}`
- Parameters: `limit=5&page=0` together cause HTTP 500
- Each parameter works individually
- Bug is acknowledged and tracked by Horreum developers

---

## Current Horreum MCP Implementation

### Problem Areas

#### 1. **Inconsistent Page Number Semantics**

**In `src/server/http.ts` and `src/server/tools.ts`:**

```typescript
// We accept page=0 in our API but treat it inconsistently:

// Example 1: list_tests tool - page=0 means "return all"
if ((args.page as number | undefined) === 0) {
  paged = aggregated; // Return all results
}

// Example 2: list_runs tool - page=0 means "return all"
if ((args.page as number | undefined) === 0) {
  finalRuns = withinRange; // Return all results
}

// Example 3: Default when no page specified
page = legacyPage ?? 1; // Defaults to page 1 (correct for Horreum)
```

**Semantic Confusion**:

- Our API accepts `page=0` but interprets it as "return all results" (client-side pagination)
- This doesn't align with typical REST pagination where `page=0` would mean "first page"
- Creates confusion: Is `page=0` the first page or "all results"?

#### 2. **Incomplete Workaround**

**In `src/server/http.ts` (lines 950-986) and `src/server/tools.ts` (lines 591-630):**

```typescript
// WORKAROUND: Horreum has a bug where limit + page=0 causes 500 error
// Only send page parameter if it's > 0
const pageParam = (args.page as number | undefined) ?? 0;
const params = {
  limit: pageSize ?? 100,
  // ... other params
};
if (pageParam > 0) {
  params.page = pageParam;
}
```

**Problem**: This workaround only addresses the immediate bug but doesn't align with Horreum's pagination model:

- When `page=0` is provided, we **omit** the page parameter entirely
- Horreum then uses its **default behavior** (which may be `page=1` or something else)
- This is semantically incorrect: The client requested `page=0`, but we're returning `page=1` (or default)

#### 3. **Mixed Pagination Strategies**

We have **three different pagination behaviors** in the codebase:

**A. Server-side pagination (delegated to Horreum)**

```typescript
// Used when no time filtering is needed
const result = await RunService.runServiceListTestRuns({
  testId: resolvedTestId,
  limit,
  page, // Passes through to Horreum
});
```

**B. Client-side pagination (fetch all, paginate ourselves)**

```typescript
// Used when time filtering is needed
let page = 1;
for (;;) {
  const chunk = await RunService.runServiceListTestRuns({
    testId: resolvedTestId,
    limit: fetchPageSize,
    page, // Always starts at 1, increments
  });
  // ... aggregate and filter
}
// Then apply client-side pagination
```

**C. "Return all" semantics with `page=0`**

```typescript
// Special handling in list_tests and list_runs
if ((args.page as number | undefined) === 0) {
  finalRuns = withinRange; // Return all filtered results
}
```

---

## Recommended Solution

### Align with Horreum's 1-Based Pagination

**Principle**: Our MCP/HTTP API should use **1-based pagination** matching Horreum's model, making the integration transparent and predictable.

### Implementation Changes

#### 1. **Update Schema Definitions**

```typescript
// OLD (incorrect)
page: z.number().int().min(0).optional();

// NEW (correct)
page: z.number()
  .int()
  .min(1)
  .optional()
  .describe('Page number (1-based, first page is 1)');
```

#### 2. **Remove `page=0` Special Handling**

**Delete or deprecate** the special "return all" semantics:

```typescript
// REMOVE THIS:
if ((args.page as number | undefined) === 0) {
  paged = aggregated; // Return all results
}

// REPLACE WITH:
// If page is specified, use it (must be >= 1)
// If page is not specified, apply default pagination
```

**Rationale**: "Return all" is dangerous for large datasets and not part of standard pagination patterns.

#### 3. **Update Workaround to Map `page=1`**

Instead of omitting the page parameter, explicitly send `page=1` when needed:

```typescript
// OLD WORKAROUND (incomplete):
if (pageParam > 0) {
  params.page = pageParam;
}

// NEW (correct alignment):
// Always send page parameter, default to 1 if not specified or invalid
params.page = pageParam >= 1 ? pageParam : 1;
```

#### 4. **Document 1-Based Pagination**

Update tool descriptions and API documentation:

```typescript
{
  page: z.number().int().min(1).optional().describe(
    'Page number (1-based). First page is 1. Defaults to 1 if not specified.'
  ),
  page_size: z.number().int().min(1).max(1000).optional().describe(
    'Number of items per page. Defaults to 100.'
  )
}
```

---

## Migration Strategy

### Phase 1: Internal Alignment (Immediate)

1. Update schema validators to require `page >= 1`
2. Remove `page=0` special handling
3. Always send `page >= 1` to Horreum APIs
4. Update internal documentation

### Phase 2: API Documentation (Immediate)

1. Update tool descriptions to clarify 1-based pagination
2. Add examples showing `page=1` as first page
3. Document in README and API docs

### Phase 3: Deprecation Notice (If Needed)

If external clients are already using `page=0`:

1. Add deprecation warning for `page=0` requests
2. Auto-translate `page=0` → `page=1` with warning log
3. Document migration path

---

## Impact Analysis

### Affected Code

**Files requiring changes**:

- `src/server/http.ts` (lines 217-380, 478-555, 950-1030)
- `src/server/tools.ts` (lines 301-360, 391-510, 548-640)

**Endpoints affected**:

- `/api/tools/horreum_list_runs` (HTTP)
- `/api/tools/horreum_list_tests` (HTTP)
- `/api/tools/horreum_list_datasets` (HTTP)
- `list_runs` (MCP tool)
- `list_tests` (MCP tool)
- `list_datasets` (MCP tool)

### Breaking Changes

**Potentially breaking** if external clients are using:

- `page=0` expecting "all results" behavior
- `page=0` expecting "first page" behavior

**Mitigation**:

- Add deprecation warnings
- Auto-translate with logging
- Clear documentation of 1-based pagination

### Testing Impact

**Update smoke tests**:

- Change `page=0` test cases to `page=1`
- Add validation that `page=0` is rejected or translated
- Test pagination boundaries (page=1, page=2, last page)

---

## Workaround Documentation

### Current Workaround for Horreum Bug #2525

**Location**:

- `src/server/http.ts` (lines ~948-980, ~970-987)
- `src/server/tools.ts` (lines ~588-620, ~612-630)

**Bug**: `/api/dataset/list/{testId}` returns 500 when `limit` and `page=0` are both present

**Current workaround** (INCOMPLETE):

```typescript
// Omit page parameter when page=0
if (pageParam > 0) {
  params.page = pageParam;
}
```

**Improved workaround** (ALIGNED):

```typescript
// Always send page parameter, but use page=1 as minimum
params.page = pageParam >= 1 ? pageParam : 1;

// Note: This workaround can be removed entirely once Horreum #2525 is fixed,
// as page=1 is the correct first page value.
```

**Revert trigger**: Once Horreum fixes #2525, no code changes needed! Our implementation will already be correct.

---

## Recommendations for Phase 6.5

**Include pagination alignment** as part of Phase 6.5 schema compliance work:

1. **Update schema validators**: `page >= 1` (not `page >= 0`)
2. **Remove page=0 special handling**: Eliminate "return all" semantics
3. **Always send page >= 1 to Horreum**: Align with 1-based pagination
4. **Update documentation**: Clarify 1-based pagination throughout
5. **Update tests**: Change all `page=0` test cases to `page=1`

**Benefits**:

- Correct semantic alignment with Horreum
- Workaround becomes unnecessary once Horreum bug is fixed
- Consistent, predictable pagination behavior
- Better documentation and developer experience

---

## References

- [Horreum Issue #2525](https://github.com/Hyperfoil/Horreum/issues/2525) - Dataset listing 500 error with page=0 + limit
- Horreum API pagination starts at 1 (confirmed by Horreum developers)
- `page=0` behavior is inconsistent and should be avoided

---

**AI-assisted-by**: Claude Sonnet 4.5
