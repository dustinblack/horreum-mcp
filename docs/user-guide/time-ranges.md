# Time Range Filtering in Horreum MCP

This document clarifies the behavior of time range filtering for tools that support
`from` and `to` parameters.

## Affected Tools

- `list_runs` (MCP tool and HTTP endpoint)
- Future: `datasets.search` (when implemented)

## Parameter Format

Both `from` and `to` parameters accept flexible timestamp formats:

- **ISO 8601 timestamps**: `"2025-09-23T00:00:00Z"`, `"2025-09-30T14:30:00.000Z"`
- **Epoch milliseconds**: `"1727020800000"` (string containing only digits)

## Filtering Behavior

### Timestamp Field

Time filtering is applied to the **`start` field** of runs (or datasets), which
represents when the run/dataset was created or started.

### Range Inclusivity

The time range is **inclusive on both ends**:

```
from <= run.start <= to
```

- Runs with `start` exactly equal to `from` **are included**
- Runs with `start` exactly equal to `to` **are included**
- Runs outside this range are excluded

### Missing Parameters

- **Both `from` and `to` omitted**: No time filtering applied (server-side
  pagination used)
- **Only `from` provided**: Returns runs with `start >= from` (no upper bound)
- **Only `to` provided**: Returns runs with `start <= to` (no lower bound)
- **`from > to`**: Returns empty result set (no validation error)

### Timezone Handling

- **ISO 8601 with timezone**: Parsed according to the specified timezone (e.g.,
  `Z` for UTC, `+05:30` for IST)
- **ISO 8601 without timezone**: Interpreted as UTC by JavaScript's `Date.parse()`
- **Epoch milliseconds**: Always UTC (milliseconds since 1970-01-01T00:00:00Z)
- **Recommendation**: Always use explicit UTC timestamps (`Z` suffix) for
  consistency

## Implementation Details

### Server-Side vs Client-Side Filtering

1. **No time filters**: Uses Horreum API pagination directly (most efficient)

2. **With time filters**:
   - Fetches multiple pages from Horreum API
   - Applies client-side filtering on `start` timestamps
   - Short-circuits when sorted by start DESC and oldest run < from

### Performance Optimization

When using `from` parameter with `sort=start` and `direction=Descending`:

- The implementation stops fetching pages when the oldest run in a page is older
  than `from`
- This reduces unnecessary API calls for large datasets

## Examples

### Last 7 Days

```json
{
  "testId": 123,
  "from": "2025-09-23T00:00:00Z",
  "to": "2025-09-30T23:59:59Z"
}
```

Returns all runs where `2025-09-23 00:00:00 UTC <= start <= 2025-09-30 23:59:59 UTC`

### Since Specific Date (No End Date)

```json
{
  "testId": 123,
  "from": "2025-09-01T00:00:00Z"
}
```

Returns all runs with `start >= 2025-09-01 00:00:00 UTC`

### Before Specific Date (No Start Date)

```json
{
  "testId": 123,
  "to": "2025-08-31T23:59:59Z"
}
```

Returns all runs with `start <= 2025-08-31 23:59:59 UTC`

### Using Epoch Milliseconds

```json
{
  "testId": 123,
  "from": "1727020800000",
  "to": "1727625599000"
}
```

Same as ISO format but using milliseconds since Unix epoch.

## Error Handling

### Invalid Timestamp Format

If a timestamp cannot be parsed:

```json
{
  "from": "not-a-valid-timestamp"
}
```

- Parsed value is `undefined`
- Treated as if parameter was not provided
- No error thrown (lenient parsing)

### Future Dates

No special handling for future dates. If `from` is in the future, returns empty
result set (no runs started yet).

### Inverted Range (from > to)

No validation error. Returns empty result set since no runs satisfy
`from <= start <= to` when `from > to`.

## Edge Cases

### Same Day

```json
{
  "from": "2025-09-30T00:00:00Z",
  "to": "2025-09-30T23:59:59Z"
}
```

Returns all runs that started on 2025-09-30 (inclusive).

### Single Moment

```json
{
  "from": "2025-09-30T12:34:56Z",
  "to": "2025-09-30T12:34:56Z"
}
```

Returns only runs with `start` exactly equal to `2025-09-30T12:34:56Z`.

### Millisecond Precision

```json
{
  "from": "2025-09-30T12:34:56.789Z"
}
```

Filters with millisecond precision. Runs at `12:34:56.788Z` excluded,
`12:34:56.789Z` and later included.

## Consistency Across Tools

All tools that implement time range filtering follow the same conventions:

- Same timestamp format support (ISO 8601 and epoch millis)
- Same inclusivity rules (inclusive on both ends)
- Same timezone handling (UTC recommended)
- Same error handling (lenient parsing)
- Filter on the primary timestamp field (`start` for runs, equivalent for datasets)

## HTTP Endpoint Behavior

The HTTP endpoints (`POST /api/tools/horreum_list_runs`) implement identical time
filtering behavior to the MCP tools. The pagination response includes filtered
results:

```json
{
  "runs": [...],
  "pagination": {
    "hasMore": false,
    "totalCount": 42
  }
}
```

Where `totalCount` represents the number of runs matching the time filter.

## Best Practices

1. **Always use UTC timestamps** with explicit `Z` suffix for consistency
2. **Include both from and to** for predictable result sets
3. **Use ISO 8601 format** for readability in logs/debugging
4. **Be aware of inclusivity**: If you want "before midnight", use `23:59:59Z`
   not `00:00:00Z` of next day
5. **Sort by start DESC** when using `from` for better performance (enables
   short-circuit optimization)

## Future Enhancements

When `datasets.search` is implemented, it will follow the same time filtering
conventions for consistency.
