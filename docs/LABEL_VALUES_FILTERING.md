# Label Values Filtering Guide

This document explains how to use the filtering capabilities of the label values
endpoints in the Horreum MCP server.

## Overview

The label values endpoints (`get_run_label_values`, `get_test_label_values`,
`get_dataset_label_values`) provide powerful server-side filtering to query
extracted metrics and metadata from test runs.

## Filter Parameter

The `filter` parameter accepts JSON sub-documents or path expressions to filter
label values:

### Basic Filtering (multiFilter=false or undefined)

When `multiFilter` is false or not specified, filters match exact values:

```json
{
  "filter": {
    "boot_time_ms": "500",
    "kernel_version": "6.1.0"
  }
}
```

This returns only label values where `boot_time_ms` equals exactly "500" AND
`kernel_version` equals exactly "6.1.0".

### Array Filtering (multiFilter=true)

When `multiFilter=true`, filter values can be arrays to match ANY of the values:

```json
{
  "filter": {
    "boot_time_ms": ["500", "600", "700"],
    "kernel_version": ["6.1.0", "6.2.0"]
  },
  "multiFilter": true
}
```

This returns label values where `boot_time_ms` is ANY of 500, 600, or 700, AND
`kernel_version` is ANY of "6.1.0" or "6.2.0".

**Important:** The `multiFilter` flag changes how the Horreum API interprets
array values in the filter. Always set `multiFilter=true` when using arrays.

## Include/Exclude Parameters

Control which label names appear in results:

### Include Only Specific Labels

```json
{
  "include": ["boot_time_ms", "kernel_version", "memory_usage"],
  "exclude": []
}
```

Returns only the specified labels, even if other labels exist.

### Exclude Specific Labels

```json
{
  "include": [],
  "exclude": ["debug_info", "internal_metrics"]
}
```

Returns all labels EXCEPT the excluded ones.

**Note:** You can use both `include` and `exclude` together. Include is applied
first, then exclude filters from those results.

## Sorting and Pagination

### Sort Results

```json
{
  "sort": "boot_time_ms",
  "direction": "Descending",
  "limit": 10
}
```

Sorts by the specified label name in ascending or descending order.

### Paginate Results

```json
{
  "page": 1,
  "limit": 50
}
```

**Important:** Pagination uses 1-based indexing. The first page is `page=1`,
not `page=0`.

## Complete Examples

### Example 1: Find All Runs with Specific Boot Times

```bash
curl -X POST http://localhost:3000/api/tools/horreum_get_run_label_values \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": 12345,
    "filter": {
      "boot_time_ms": ["500", "600", "700"]
    },
    "multiFilter": true,
    "include": ["boot_time_ms", "kernel_version"],
    "sort": "boot_time_ms",
    "direction": "Ascending",
    "limit": 10,
    "page": 1
  }'
```

### Example 2: Get Test-Wide Label Values with Time Range

```bash
curl -X POST http://localhost:3000/api/tools/horreum_get_test_label_values \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": 262,
    "filter": {
      "status": ["passed", "baseline"]
    },
    "multiFilter": true,
    "before": "now",
    "after": "last week",
    "filtering": true,
    "metrics": true,
    "include": ["boot_time_ms", "memory_usage"],
    "limit": 20
  }'
```

### Example 3: Simple Dataset Label Values

```bash
curl -X POST http://localhost:3000/api/tools/horreum_get_dataset_label_values \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": 98765
  }'
```

## Filtering vs Metrics Labels

For `get_test_label_values` endpoint:

- **Filtering labels** (`filtering=true`): Labels used to group or categorize
  runs
- **Metric labels** (`metrics=true`): Labels containing actual performance
  measurements

You can retrieve both types (default), or selectively enable only one type:

```json
{
  "filtering": true,
  "metrics": false
}
```

This returns only filtering labels, excluding metric labels.

## Time Boundaries (Test Endpoint Only)

The `get_test_label_values` endpoint supports time-based filtering with natural
language:

```json
{
  "before": "yesterday",
  "after": "last month"
}
```

Supported formats:

- Natural language: "yesterday", "last week", "last 30 days", "now"
- ISO 8601: "2025-09-24T00:00:00Z"
- Epoch milliseconds: "1727136000000"

## Best Practices

1. **Use multiFilter with arrays**: Always set `multiFilter=true` when your
   filter contains array values
2. **Combine filters strategically**: Use `filter` for value matching,
   `include`/`exclude` for field selection
3. **Paginate large result sets**: Use `limit` and `page` for datasets with
   many label values
4. **Sort for analysis**: Use `sort` to order results by specific metrics
5. **Leverage natural language times**: For test-wide queries, use readable
   time expressions like "last week"

## Common Pitfalls

### ❌ Incorrect: Arrays without multiFilter

```json
{
  "filter": {
    "boot_time_ms": ["500", "600"]
  }
  // multiFilter is not set - array might not be interpreted correctly!
}
```

### ✅ Correct: Arrays with multiFilter=true

```json
{
  "filter": {
    "boot_time_ms": ["500", "600"]
  },
  "multiFilter": true
}
```

### ❌ Incorrect: Zero-based pagination

```json
{
  "page": 0,
  "limit": 50
}
```

### ✅ Correct: One-based pagination

```json
{
  "page": 1,
  "limit": 50
}
```

## Response Format

All label values endpoints return `ExportedLabelValues` or `LabelValue` arrays:

```json
[
  {
    "values": {
      "boot_time_ms": 523,
      "kernel_version": "6.1.0",
      "memory_usage": 2048
    },
    "runId": 12345,
    "datasetId": 98765,
    "start": "2025-09-24T10:00:00Z",
    "stop": "2025-09-24T10:05:00Z"
  }
]
```

## Further Reading

- [Horreum Documentation](https://horreum.hyperfoil.io/docs/)
- [Time Range Filtering](TIME_RANGE_FILTERING.md)
- [Development Plan](../mcp_development_plan.md) - Phase 6.6
