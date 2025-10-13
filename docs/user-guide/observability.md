# Logging and Diagnostics

This guide explains the comprehensive logging and diagnostic features in
Horreum MCP Server, designed to make failures from downstream clients
(Gemini/Claude) fast to diagnose in production environments.

## Overview

The server implements structured, correlation-aware logging with:

- **Correlation IDs**: Track requests across all components and logs
- **Upstream Error Capture**: Capture HTTP error bodies and timeouts
- **SSE-Safe Logging**: Request logging that doesn't break streaming
- **Tool Instrumentation**: Track MCP tool calls and queries
- **Structured Errors**: Machine-parseable error responses

## Correlation IDs

Every request is assigned a unique correlation ID (`req_id`) that appears in
all related log entries, making it easy to trace a request through the system.

### How Correlation IDs Work

1. **Generation**: When a request arrives, the server generates a UUID if no
   `X-Correlation-Id` header is present, or reuses the incoming value.
2. **Propagation**: The ID is stored in AsyncLocalStorage and automatically
   included in all logs via a Pino mixin.
3. **Echoing**: The server echoes the ID in the `X-Correlation-Id` response
   header for clients to track.
4. **Upstream**: The ID is propagated to upstream Horreum requests via headers.

### Using Correlation IDs

**Client-side:**

```bash
# Send a correlation ID with your request
curl -H 'X-Correlation-Id: my-trace-123' \
     -H 'Authorization: Bearer token' \
     http://localhost:3000/api/tools/horreum_list_runs
```

**Server logs will show:**

```json
{
  "level": "info",
  "event": "mcp.request.received",
  "req_id": "my-trace-123",
  "method": "POST",
  "path": "/api/tools/horreum_list_runs"
}
```

**Searching logs:**

```bash
# Find all logs for a specific request
grep "my-trace-123" logs.json | jq .

# Or with structured logging tools
jq 'select(.req_id == "my-trace-123")' logs.json
```

## Log Event Taxonomy

The server emits structured log events following a consistent naming scheme:

### Request Lifecycle Events

- **`mcp.request.received`**: Logged when a request arrives
  - Fields: `req_id`, `method`, `path`, `accept`, `content_type`,
    `body_preview`
- **`mcp.request.completed`**: Logged when a request finishes successfully
  - Fields: `req_id`, `status`, `duration_ms`
- **`mcp.request.failed`**: Logged when a request fails or closes prematurely
  - Fields: `req_id`, `error_type`, `error`, `duration_ms`

### MCP Tool Events

- **`mcp.tools.list.start`**: Logged when tools are being listed
- **`mcp.tools.list.complete`**: Logged after listing tools
  - Fields: `count` (number of registered tools)
- **`mcp.tools.call.start`**: Logged when a tool is invoked
  - Fields: `req_id`, `tool`, `arguments_keys`
- **`mcp.tools.call.complete`**: Logged when a tool completes
  - Fields: `req_id`, `tool`, `duration_ms`

### Query Events

- **`query.start`**: Logged when a data query begins
  - Fields: `req_id`, `path` (e.g., `runs`, `datasets`), `tool`
- **`query.complete`**: Logged when a query finishes
  - Fields: `req_id`, `duration_sec`, `points` (number of results), `path`

### Normalization Events

- **`normalize.hint`**: Logged when input is normalized/transformed
  - Fields: `req_id`, `action`, `before`, `after`
  - Example: Converting `test_name` to `test_id`

### Upstream Events

- **`upstream.http_status`**: Logged for HTTP errors from Horreum
  - Fields: `path`, `status`, `body_preview`, `attempt`
- **`upstream.timeout`**: Logged when a request times out
  - Fields: `path`, `attempt`, `timeout_seconds`, `hint`
- **`upstream.connect_error`**: Logged for network errors
  - Fields: `path`, `attempt`, `timeout_seconds`, `delay`

## Log Levels

Configure log verbosity with the `LOG_LEVEL` environment variable:

```bash
# Available levels (most to least verbose):
LOG_LEVEL=trace   # Everything including trace-level debugging
LOG_LEVEL=debug   # Detailed debugging information
LOG_LEVEL=info    # Normal operational information (default)
LOG_LEVEL=warn    # Warning messages only
LOG_LEVEL=error   # Error messages only
LOG_LEVEL=fatal   # Fatal errors only
LOG_LEVEL=silent  # No logging

# Or use CLI flags:
npm start -- --log-level debug
npm start -- --debug  # Shorthand for debug level
npm start -- --trace  # Trace level
```

### Recommended Levels by Environment

- **Production**: `info` (default) - Captures important events without noise
- **Staging/Testing**: `debug` - Detailed diagnostics for troubleshooting
- **Development**: `trace` or `debug` - Full visibility into operations
- **CI/Automated Tests**: `warn` or `error` - Reduce noise in test output

## Log Format

The server supports two output formats:

### JSON Format (Production)

```bash
LOG_FORMAT=json npm start
```

Produces structured JSON logs suitable for log aggregation systems:

```json
{
  "level": "info",
  "time": 1728432000000,
  "req_id": "abc123",
  "event": "query.complete",
  "duration_sec": 0.234,
  "points": 42,
  "path": "runs",
  "msg": "Query completed"
}
```

### Pretty Format (Development)

```bash
LOG_FORMAT=pretty npm start
# Or set LOG_PRETTY=true
```

Produces human-readable logs with colors and timestamps:

```
[10:00:00.000] INFO: Query completed
    req_id: "abc123"
    event: "query.complete"
    duration_sec: 0.234
    points: 42
    path: "runs"
```

## SSE-Safe Request Logging

The server uses a custom Express middleware that logs requests without
breaking Server-Sent Events (SSE) streaming:

1. **No BaseHTTPMiddleware**: Avoids Express middleware that consumes request
   bodies
2. **Body Preview**: Safely previews request bodies (max 500 chars) without
   consuming streams
3. **Event Listeners**: Uses response event listeners (`finish`, `close`,
   `error`) for completion logging
4. **AsyncLocalStorage**: Maintains correlation context without blocking
   streaming

This approach ensures that MCP clients using SSE streaming receive responses
without interference from logging middleware.

## Upstream Error Visibility

The server captures detailed information about errors from upstream Horreum
API calls:

### HTTP Status Errors

When Horreum returns a 4xx/5xx status:

```json
{
  "level": "error",
  "event": "upstream.http_status",
  "req_id": "abc123",
  "path": "https://horreum.example.com/api/run/list",
  "status": 500,
  "body_preview": "{\"error\":\"Internal Server Error\"}",
  "msg": "Upstream HTTP error"
}
```

### Timeouts

When a request exceeds the configured timeout:

```json
{
  "level": "error",
  "event": "upstream.timeout",
  "req_id": "abc123",
  "path": "https://horreum.example.com/api/test/123/labelValues",
  "attempt": 3,
  "timeout_seconds": 30,
  "hint": "Consider raising adapter timeout to 300s for complex queries",
  "msg": "Upstream request timed out"
}
```

### Connection Errors

For network-level failures:

```json
{
  "level": "warn",
  "event": "upstream.connect_error",
  "req_id": "abc123",
  "path": "https://horreum.example.com/api/dataset/list",
  "attempt": 2,
  "timeout_seconds": 30,
  "delay": 2000,
  "msg": "Retrying after network error"
}
```

## Timeout Configuration

The server implements a two-tier timeout strategy:

### Adapter Timeout (Default: 30s)

Controls individual HTTP requests to Horreum:

```bash
HORREUM_TIMEOUT=30000  # milliseconds
```

**Recommended values:**

- **Simple queries**: 30s (default) - Sufficient for most operations
- **Complex queries**: 300s (300000ms) - For label values with heavy filtering
- **Time-series aggregation**: 300s - When querying large date ranges

**When to increase:**

- Seeing frequent `upstream.timeout` events in logs
- Queries with `multiFilter=true` and complex filter expressions
- Label value queries across hundreds of runs
- Aggregating data across long time periods

### Route Timeout (HTTP Mode)

Express.js route handlers have their own timeout (default: varies by setup).
For production deployments, ensure your route timeout exceeds the adapter
timeout:

```javascript
// Example: Set route timeout to 1 hour for complex queries
app.use('/api/tools/*', (req, res, next) => {
  req.setTimeout(3600000); // 1 hour
  next();
});
```

### Retry Strategy

The adapter automatically retries failed requests with exponential backoff:

- **Max retries**: 3 attempts
- **Initial backoff**: 1 second
- **Max backoff**: 30 seconds
- **Jitter**: ±25% to avoid thundering herd

## Structured Error Responses

All HTTP endpoints return structured error responses with diagnostic
information:

```json
{
  "error": {
    "code": "TIMEOUT",
    "message": "Request timed out",
    "details": { ... },
    "retryable": true,
    "retryAfter": 60
  },
  "detail": {
    "error_type": "timeout",
    "correlation_id": "abc123"
  }
}
```

**Error codes:**

- `INVALID_REQUEST`: Validation error (4xx)
- `NOT_FOUND`: Resource not found (404)
- `RATE_LIMITED`: Too many requests (429)
- `INTERNAL_ERROR`: Server error (500)
- `SERVICE_UNAVAILABLE`: Upstream unavailable (502/503)
- `TIMEOUT`: Request timed out (504)

**Error types:**

- `validation_error`: Client-side validation failure
- `upstream_http_error`: Horreum API error
- `timeout`: Request or upstream timeout
- `connection_closed`: Client disconnected prematurely
- `handler_error`: Internal handler exception

## Diagnostic Workflows

### Debugging a Failed Request

1. **Get the correlation ID** from the client or error response
2. **Search logs** for that ID: `grep "abc123" logs.json`
3. **Trace the request** through these events:
   - `mcp.request.received` → request arrived
   - `mcp.tools.call.start` → tool invoked
   - `query.start` → data query began
   - `upstream.*` → upstream interaction
   - `query.complete` OR `mcp.request.failed` → outcome

### Analyzing Performance

Query the `query.complete` events to find slow queries:

```bash
# Find queries taking > 1 second
jq 'select(.event == "query.complete" and .duration_sec > 1)' logs.json
```

### Monitoring Upstream Health

Track upstream errors and timeouts:

```bash
# Count upstream errors by type
jq 'select(.event | startswith("upstream."))
    | .event' logs.json | sort | uniq -c

# Find which paths are timing out
jq 'select(.event == "upstream.timeout")
    | .path' logs.json | sort | uniq -c
```

### Identifying Hot Paths

Track which tools are called most frequently:

```bash
# Count tool invocations
jq 'select(.event == "mcp.tools.call.start")
    | .tool' logs.json | sort | uniq -c
```

## Best Practices

### For Operators

1. **Enable JSON logging** in production for structured log aggregation
2. **Set appropriate timeouts** based on your query complexity (300s for heavy
   queries)
3. **Monitor correlation IDs** in logs to track client issues
4. **Collect upstream error patterns** to identify Horreum API issues
5. **Use `info` level** as default; increase to `debug` only when
   troubleshooting

### For Developers

1. **Always include correlation IDs** when reporting issues
2. **Check `upstream.*` events** before blaming the MCP server
3. **Use normalize.hint logs** to understand input transformations
4. **Monitor query.complete events** to identify slow operations
5. **Test with `--debug`** flag during development for full visibility

### For CI/Automation

1. **Use `warn` or `error` level** to reduce noise in CI logs
2. **Capture correlation IDs** in test output for failure tracing
3. **Assert on specific log events** in integration tests
4. **Monitor test duration** via query.complete events
5. **Parse structured errors** for automated failure classification

## Integration with Observability Stack

### Prometheus Metrics

The server exposes metrics that complement logging:

```bash
METRICS_ENABLED=true
METRICS_PORT=9464
npm start

# Scrape metrics
curl http://localhost:9464/metrics
```

Metrics include:

- Request counts and durations by endpoint
- Tool invocation counts and durations
- Upstream request counts and errors
- Resource access counts

### OpenTelemetry Tracing

For distributed tracing:

```bash
TRACING_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
npm start
```

Traces include:

- Full request spans with correlation IDs
- Tool execution spans with arguments
- Upstream HTTP call spans
- Resource access spans

### Log Aggregation

For production log aggregation (ELK, Splunk, Loki):

1. **Use JSON format**: `LOG_FORMAT=json`
2. **Ship logs** to your aggregation system
3. **Index by correlation ID** for fast lookups
4. **Create dashboards** for upstream errors, query durations, tool usage
5. **Set up alerts** for high error rates or long query times

## Troubleshooting Common Issues

### "Request timed out" Errors

**Symptom**: `upstream.timeout` events in logs

**Solutions**:

1. Increase `HORREUM_TIMEOUT` to 300000 (300s)
2. Check Horreum API health and load
3. Simplify query filters or reduce time range
4. Enable query pagination to reduce result size

### Missing Correlation IDs

**Symptom**: Some logs missing `req_id` field

**Cause**: Logging outside request context (startup, background tasks)

**Solution**: Normal behavior; `req_id` only present during request handling

### Body Preview Truncation

**Symptom**: `body_preview` field shows "..."

**Explanation**: Bodies > 500 chars are truncated to prevent log bloat

**Solution**: Use `debug` level for full body logging (with performance
impact)

### SSE Streaming Issues

**Symptom**: Clients report broken streaming

**Check**: Ensure no middleware is consuming request bodies before MCP handler

**Solution**: The SSE-safe middleware is already correctly placed in the
middleware chain

## Configuration Reference

```bash
# Logging
LOG_LEVEL=info              # trace|debug|info|warn|error|fatal|silent
LOG_FORMAT=json             # json|pretty (default: pretty in dev, json in prod)

# Timeouts
HORREUM_TIMEOUT=30000       # Adapter timeout in ms (default: 30s)
                            # Recommend 300000 (300s) for complex queries

# Observability
METRICS_ENABLED=false       # Enable Prometheus metrics
METRICS_PORT=9464           # Metrics endpoint port
TRACING_ENABLED=false       # Enable OpenTelemetry tracing

# Rate Limiting
HORREUM_RATE_LIMIT=10       # Requests per second to Horreum
```

## See Also

- [Time Range Filtering](TIME_RANGE_FILTERING.md) - Understanding time queries
- [Label Values Filtering](LABEL_VALUES_FILTERING.md) - Complex filter syntax
- [README.md](../README.md) - General usage and setup
