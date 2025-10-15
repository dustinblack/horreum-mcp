# Parameter Naming Convention Support

## Overview

The Horreum MCP server accepts **both `snake_case` and `camelCase`** naming
conventions for all request body parameters. This enables seamless
cross-language interoperability between Domain MCPs and clients written in
different programming languages.

## Rationale

### Language-Specific Naming Conventions

Different programming languages have different naming conventions by design:

- **Python**: `snake_case` (PEP 8 standard)
- **JavaScript/TypeScript**: `camelCase` (standard)
- **Go**: `camelCase` or `PascalCase`
- **Rust**: `snake_case` (RFC 430)
- **Ruby**: `snake_case`
- **Java**: `camelCase`

### Future-Proofing for Domain MCP Ecosystem

The Horreum MCP server (a **Source MCP**) needs to work with **Domain MCPs**
written in various languages. Each Domain MCP naturally uses its language's
conventions. By accepting both forms, we enable:

1. **Language-agnostic integration** - Domain MCPs don't need custom
   translation layers
2. **Ecosystem growth** - New Domain MCPs in any language work immediately
3. **Developer experience** - Developers use their language's natural idioms
4. **Reduced errors** - No silent parameter ignoring due to naming mismatches

The Source MCP Contract specifies `snake_case` as the standard, but
accepting `camelCase` ensures compatibility with the broader ecosystem.

## Implementation

### Priority Order

When both forms are provided, the server uses the following priority:

1. **snake_case** (preferred, Source MCP Contract standard)
2. **camelCase** (ecosystem compatibility)

### Supported Parameters

The following parameters accept both naming conventions:

| snake_case     | camelCase     | Endpoints                                 |
| -------------- | ------------- | ----------------------------------------- |
| `multi_filter` | `multiFilter` | `horreum_get_test_label_values`           |
| `multi_filter` | `multiFilter` | `horreum_get_run_label_values`            |
| `test_id`      | `testId`      | `horreum_list_runs`, `horreum_list_tests` |
| `run_id`       | `runId`       | All run-related endpoints                 |
| `dataset_id`   | `datasetId`   | All dataset-related endpoints             |
| `schema_uri`   | `schemaUri`   | Schema-related endpoints                  |
| `page`         | `pageToken`   | Pagination parameters                     |
| `limit`        | `pageSize`    | Pagination parameters                     |

**Note**: Parameters like `filtering`, `metrics`, `sort`, `direction`, `limit`,
and `page` are already in their canonical form and don't require snake_case
variants.

## Examples

### Test Label Values with Filtering

Both of these requests are equivalent:

**Python-style (snake_case):**

```bash
curl -X POST https://your-server/api/tools/horreum_get_test_label_values \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "test_id": 262,
    "multi_filter": true,
    "filter": {
      "RHIVOS OS ID": ["rhel"]
    }
  }'
```

**JavaScript-style (camelCase):**

```bash
curl -X POST https://your-server/api/tools/horreum_get_test_label_values \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "testId": 262,
    "multiFilter": true,
    "filter": {
      "RHIVOS OS ID": ["rhel"]
    }
  }'
```

**Mixed (also valid):**

```bash
curl -X POST https://your-server/api/tools/horreum_get_test_label_values \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "test_id": 262,
    "multiFilter": true,
    "filter": {
      "RHIVOS OS ID": ["rhel"]
    }
  }'
```

### Run Label Values with Filtering

**Python-style (snake_case):**

```bash
curl -X POST https://your-server/api/tools/horreum_get_run_label_values \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "run_id": "12345",
    "multi_filter": true,
    "filter": {
      "OS": ["rhel"]
    }
  }'
```

**JavaScript-style (camelCase):**

```bash
curl -X POST https://your-server/api/tools/horreum_get_run_label_values \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "run_id": "12345",
    "multiFilter": true,
    "filter": {
      "OS": ["rhel"]
    }
  }'
```

### List Runs with Time Range

**Python-style (snake_case):**

```bash
curl -X POST https://your-server/api/tools/horreum_list_runs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "test_id": 262,
    "from": "last 30 days",
    "to": "now",
    "limit": 50,
    "page": 1
  }'
```

**JavaScript-style (camelCase):**

```bash
curl -X POST https://your-server/api/tools/horreum_list_runs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "testId": 262,
    "from": "last 30 days",
    "to": "now",
    "limit": 50,
    "page": 1
  }'
```

## Python Client Example

```python
import requests

# Python naturally uses snake_case
response = requests.post(
    "https://your-server/api/tools/horreum_get_test_label_values",
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    },
    json={
        "test_id": 262,
        "multi_filter": True,
        "filter": {
            "RHIVOS OS ID": ["rhel"]
        },
        "limit": 100,
        "page": 1
    }
)

data = response.json()
print(f"Found {len(data['items'])} label values")
```

## TypeScript Client Example

```typescript
// TypeScript naturally uses camelCase
const response = await fetch(
  'https://your-server/api/tools/horreum_get_test_label_values',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      testId: 262,
      multiFilter: true,
      filter: {
        'RHIVOS OS ID': ['rhel'],
      },
      limit: 100,
      page: 1,
    }),
  }
);

const data = await response.json();
console.log(`Found ${data.items.length} label values`);
```

## Benefits

### 1. Cross-Language Interoperability

Domain MCPs and clients can use their language's natural naming convention
without translation layers or adapters.

### 2. Ecosystem Growth

New Domain MCPs in any language (Python, Go, Rust, Java, etc.) work
immediately without custom parameter mapping.

### 3. Future-Proofing

As the MCP ecosystem grows, Source MCPs that accept multiple naming conventions
will have the widest compatibility and adoption.

### 4. Source MCP Contract Alignment

The preferred `snake_case` convention aligns with the Source MCP Contract
specification, ensuring consistency across the ecosystem while remaining
flexible.

### 5. Developer Experience

Developers don't need to remember naming conversions or consult documentation
for every parameter - they can use their language's idiomatic style.

## Technical Implementation

The server uses a helper function with the nullish coalescing operator (`??`)
to accept both naming conventions:

```typescript
/**
 * Helper to extract parameter accepting both snake_case and camelCase.
 * Enables cross-language interoperability between Domain MCPs written in
 * different languages.
 */
function getParam<T>(
  body: Record<string, unknown>,
  snakeCase: string,
  camelCase: string
): T | undefined {
  return (body[snakeCase] ?? body[camelCase]) as T | undefined;
}

// Usage in endpoints
const multiFilter = getParam<boolean>(body, 'multi_filter', 'multiFilter');
const testId = getParam<number>(body, 'test_id', 'testId');
```

If `snake_case` is present, it takes priority. Otherwise, the server falls
back to `camelCase`.

## Troubleshooting

### Parameter Not Working?

If a parameter isn't being recognized:

1. **Check spelling**: Parameter names are case-sensitive
2. **Check type**: Ensure the value type matches the expected type (e.g.,
   `boolean` for `multi_filter`)
3. **Check endpoint**: Not all parameters are available on all endpoints

### Silent Ignoring

Previous versions of the MCP server silently ignored `multi_filter` when only
`multiFilter` was supported. If you experienced filtering issues before
v0.2.0, this has been fixed.

### Mixing Conventions

While you can mix `snake_case` and `camelCase` in the same request, we
recommend choosing one convention and sticking to it for consistency:

**Recommended:**

```json
{
  "test_id": 262,
  "multi_filter": true,
  "filter": { "OS": ["rhel"] }
}
```

**Not Recommended (but valid):**

```json
{
  "test_id": 262,
  "multiFilter": true,
  "filter": { "OS": ["rhel"] }
}
```

## Related Documentation

- [Source MCP Contract](../architecture/source-mcp-contract.md) - Standard
  parameter naming conventions
- [Filtering Guide](./filtering.md) - How to use `multi_filter` for advanced
  filtering
- [Time Ranges](./time-ranges.md) - Natural language time range support

## Changelog

- **v0.2.0** (2025-01-15): Added support for both snake_case and camelCase
  parameter naming
- **v0.1.0** (2025-01-10): Initial release (camelCase only)
