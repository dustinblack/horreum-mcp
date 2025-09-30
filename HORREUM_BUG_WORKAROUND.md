# Horreum API Bug Workaround

**Date**: 2025-09-30  
**Status**: ⚠️ TEMPORARY WORKAROUND IN PLACE

## The Bug

The Horreum API endpoint `/api/dataset/list/{testId}` returns **HTTP 500 Internal Server Error** when both `limit` and `page` query parameters are provided together, even though the OpenAPI specification defines both as valid optional parameters.

### Test Results

```bash
# Each parameter works independently:
✅ /api/dataset/list/262                    → 200 OK
✅ /api/dataset/list/262?limit=5            → 200 OK
✅ /api/dataset/list/262?page=0             → 200 OK

# But together they fail:
❌ /api/dataset/list/262?limit=5&page=0     → 500 Internal Server Error
```

**Tested on**: https://horreum.corp.redhat.com

## Our Workaround

We've implemented a workaround that **omits the `page` parameter when it equals 0** (first page):

```typescript
// WORKAROUND: Horreum has a bug where limit + page=0 causes 500 error
// Only send page parameter if it's > 0
const params = {
  testId: resolvedTestId,
  limit: pageSize ?? 100,
  ...(sort ? { sort } : {}),
  ...(direction ? { direction } : {}),
};
if (page && page > 0) {
  params.page = page;
}
```

### Files Modified

- `src/server/http.ts` (lines ~948-980)
- `src/server/tools.ts` (lines ~588-620)

## When to Revert

**This workaround should be removed** once Horreum fixes the bug on their server side.

### How to Check if Fixed

Test the Horreum API directly:

```bash
curl "https://horreum.corp.redhat.com/api/dataset/list/262?limit=5&page=0"
```

If it returns **200 OK** with valid JSON (not a 500 error), the bug is fixed.

### How to Revert

1. Remove the conditional `page` parameter logic in both files
2. Change back to unconditional parameter:
   ```typescript
   const params = {
     testId: resolvedTestId,
     limit: pageSize ?? 100,
     page: page ?? 0, // Always include page param
     ...(sort ? { sort } : {}),
     ...(direction ? { direction } : {}),
   };
   ```
3. Update `mcp_development_plan.md` to remove the workaround note
4. Delete this file (`HORREUM_BUG_WORKAROUND.md`)
5. Commit with message: `fix(datasets): remove workaround for Horreum limit+page bug`

## Bug Report

Bug reported to Horreum team on 2025-09-30.

### Message Sent

> Hey! Found a bug in the Horreum dataset API:
>
> `/api/dataset/list/{testId}` returns 500 when you use `limit` and `page` params together. Works fine with either one alone, but combine them and it blows up:
>
> • `/api/dataset/list/262?limit=5` ✅ works
> • `/api/dataset/list/262?page=0` ✅ works  
> • `/api/dataset/list/262?limit=5&page=0` ❌ 500 error
>
> Both params are in the OpenAPI spec as valid, so looks like a server-side issue. For now I'm just omitting `page` when it's 0 as a workaround.
>
> Tested on https://horreum.corp.redhat.com

## Impact

**Minimal** - The workaround only affects first-page requests. Pagination still works correctly for subsequent pages (page > 0) since we still send the page parameter for those.
