# Natural Language Query Endpoint

The Horreum MCP server includes an LLM-powered natural language query endpoint
that enables conversational access to Horreum performance data without requiring
MCP client configuration.

> [!IMPORTANT]
> **Requires External LLM Configuration**: This endpoint requires an external
> LLM service to be configured via API (OpenAI, Anthropic, Google Gemini, or
> Azure OpenAI). You must set `LLM_PROVIDER`, `LLM_API_KEY`, and `LLM_MODEL`
> environment variables. Without this configuration, the endpoint returns a 503
> error. See [Configuration](#configuration) below.

## Overview

The `/api/query` endpoint accepts natural language questions and uses an
**external LLM API** (OpenAI, Anthropic, Gemini, or Azure OpenAI) to:

1. Parse the user's intent
2. Orchestrate multiple MCP tool calls
3. Analyze results
4. Provide a natural language answer with supporting data

This enables stand-alone operation where the server acts as an intelligent API
gateway, translating natural language queries into structured Horreum API calls.

> [!TIP]
> For complete configuration reference including HTTP mode, authentication,
> SSL/TLS, and all environment variables, see the
> **[Configuration Guide](configuration.md)**.

## Configuration

### Required Environment Variables

```bash
# LLM Provider (required)
LLM_PROVIDER=gemini  # Options: openai, anthropic, gemini, azure

# API Key (required)
LLM_API_KEY=your_api_key_here

# Model Name (required)
LLM_MODEL=gemini-1.5-pro
# For OpenAI: gpt-4, gpt-4-turbo, gpt-3.5-turbo
# For Anthropic: claude-3-5-sonnet-20241022, claude-3-opus-20240229
# For Gemini: gemini-1.5-pro, gemini-1.5-flash
# For Azure: your-deployment-name
```

### Provider-Specific Configuration

#### Gemini (Google)

```bash
LLM_PROVIDER=gemini
LLM_API_KEY=your_gemini_api_key
LLM_MODEL=gemini-1.5-pro
```

Get your API key from: https://aistudio.google.com/app/apikey

#### OpenAI

```bash
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4-turbo
```

Get your API key from: https://platform.openai.com/api-keys

#### Anthropic (Claude)

```bash
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
LLM_MODEL=claude-3-5-sonnet-20241022
```

Get your API key from: https://console.anthropic.com/

#### Azure OpenAI

```bash
LLM_PROVIDER=azure
LLM_API_KEY=your_azure_key
LLM_MODEL=your-deployment-name
LLM_AZURE_ENDPOINT=https://your-resource.openai.azure.com
LLM_AZURE_DEPLOYMENT=your-deployment-name  # Optional, defaults to LLM_MODEL
```

## API Usage

### Endpoint

```
POST /api/query
```

### Authentication

The endpoint requires authentication if `HTTP_AUTH_TOKEN` is configured:

```bash
Authorization: Bearer your_http_auth_token
```

### Request Format

```json
{
  "query": "Your natural language question here"
}
```

### Response Format

```json
{
  "query": "Your original question",
  "answer": "Natural language answer from the LLM",
  "metadata": {
    "tool_calls": 3,
    "llm_calls": 2,
    "duration_ms": 1234
  },
  "tool_calls": [
    {
      "tool": "horreum_list_tests",
      "arguments": {
        "name": "boot-time"
      },
      "result": { ... },
      "duration_ms": 123
    },
    ...
  ]
}
```

## Example Queries

### 1. List Recent Failures

**Query:**

```json
{
  "query": "Show me tests that failed in the last week"
}
```

The LLM will:

1. Call `horreum_list_all_runs` with `from: "last week"`
2. Filter for runs with failure indicators
3. Summarize the results

### 2. Performance Comparison

**Query:**

```json
{
  "query": "Compare performance of run 12345 vs run 67890"
}
```

The LLM will:

1. Call `horreum_get_run_label_values` for both runs
2. Extract and compare key metrics
3. Highlight differences

### 3. Test Analysis

**Query:**

```json
{
  "query": "What are the top 5 slowest tests in October?"
}
```

The LLM will:

1. Call `horreum_list_all_runs` with October time filter
2. Get label values for duration metrics
3. Sort and return top 5

### 4. Trend Analysis

**Query:**

```json
{
  "query": "Show me CPU usage trends for the boot-time test over the last 30 days"
}
```

The LLM will:

1. Find the test by name
2. Get test label values with time filter and CPU label filter
3. Analyze trends

## Complete Example with cURL

```bash
# Start the server with LLM configured
export HORREUM_BASE_URL=https://horreum.example.com
export LLM_PROVIDER=gemini
export LLM_API_KEY=your_gemini_key
export LLM_MODEL=gemini-1.5-pro
export HTTP_MODE_ENABLED=true
export HTTP_PORT=3000
export HTTP_AUTH_TOKEN=your_auth_token

npm start

# Query the endpoint
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_auth_token" \
  -d '{
    "query": "What tests have failed in the last 24 hours?"
  }'
```

## Response Examples

### Successful Query

```json
{
  "query": "What tests have failed in the last 24 hours?",
  "answer": "Based on the data from the last 24 hours, I found 3 tests with failures:\n\n1. **Boot Time Regression Test** (test_id: 42)\n   - Run 15234 failed at 2025-10-13T08:30:00Z\n   - Error: Boot time exceeded threshold (5.2s vs 4.0s max)\n\n2. **Throughput Benchmark** (test_id: 58)\n   - Run 15235 failed at 2025-10-13T10:15:00Z\n   - Error: Throughput below minimum (850 req/s vs 1000 req/s min)\n\n3. **Memory Leak Test** (test_id: 91)\n   - Run 15240 failed at 2025-10-13T14:22:00Z\n   - Error: Memory usage increased by 15% during test\n\nAll failures occurred within the last 24 hours and should be investigated.",
  "metadata": {
    "tool_calls": 4,
    "llm_calls": 2,
    "duration_ms": 3456
  },
  "tool_calls": [
    {
      "tool": "horreum_list_all_runs",
      "arguments": {
        "from": "yesterday",
        "limit": 100
      },
      "result": { "runs": [...], "pagination": {...} },
      "duration_ms": 234
    },
    ...
  ]
}
```

### Error Responses

#### LLM Not Configured

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Natural language query endpoint requires LLM configuration. Set LLM_PROVIDER, LLM_API_KEY, and LLM_MODEL environment variables.",
    "details": {
      "hint": "Supported providers: openai, anthropic, gemini, azure",
      "example_config": {
        "LLM_PROVIDER": "gemini",
        "LLM_API_KEY": "your-api-key",
        "LLM_MODEL": "gemini-1.5-pro"
      }
    },
    "retryable": false
  }
}
```

#### Rate Limit Exceeded

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "LLM API rate limit exceeded",
    "retryable": true,
    "retryAfter": 60
  }
}
```

## Best Practices

### 1. Query Construction

- **Be Specific**: Include test names, time ranges, and specific metrics
- **Natural Language**: Use conversational language, not API parameters
- **Context**: Provide context about what you're trying to understand

**✅ Good:**

```
"Show me CPU and memory usage for the boot-time test over the last week"
```

**❌ Less Good:**

```
"Get data"
```

### 2. Time Expressions

Use natural language time expressions:

- "last week", "past 7 days"
- "yesterday", "last 24 hours"
- "last month", "past 30 days"
- "today", "this week"

### 3. Iterative Queries

For complex analysis, break into multiple queries:

1. "What tests do we have related to boot time?"
2. "Show me the latest run for the Boot Time Regression test"
3. "Compare that run with the average from last month"

### 4. Cost Management

LLM API calls incur costs. To minimize:

- Use specific queries that require fewer tool calls
- Set reasonable `max_tokens` limits (default: 4096)
- Monitor API usage in your LLM provider dashboard
- Consider caching common queries at your application layer

## Limitations

### 1. Tool Execution

**Current Status**: The orchestrator parses LLM responses for tool calls but tool
execution integration with the MCP server is pending. The endpoint will return
simulated responses until full integration is complete.

**Planned**: Full integration with MCP server tool handlers for actual data
retrieval.

### 2. Context Window

LLM context windows are limited. For very long conversations or large datasets:

- Break into multiple independent queries
- Use pagination parameters to limit result sizes
- Focus queries on specific time ranges or tests

### 3. Response Accuracy

LLMs may occasionally:

- Misinterpret queries
- Call incorrect tools
- Provide imprecise answers

Always verify critical information from the `tool_calls` array which contains
the actual data.

### 4. Iteration Limit

Queries are limited to 10 LLM iterations by default to prevent infinite loops
and excessive API costs. Complex queries may hit this limit.

## Monitoring and Debugging

### Request Correlation IDs

All requests include correlation IDs in headers and logs:

```bash
X-Correlation-Id: abc123def456
```

Use these for debugging and tracing requests through the system.

### Log Events

Natural language queries generate these log events:

- `mcp.request.received`: Query received
- `query.llm.execute`: LLM call started
- `query.tool.execute`: Tool call execution
- `query.complete`: Query completed with answer
- `query.error`: Query failed

Check logs with:

```bash
LOG_LEVEL=debug npm start
```

### Metrics

If metrics are enabled (`METRICS_ENABLED=true`), track:

- Query duration (`query_duration_seconds`)
- Tool calls per query (`query_tool_calls_total`)
- LLM API call duration (`llm_api_duration_seconds`)
- Errors (`query_errors_total`)

## Security Considerations

### API Key Protection

- Never commit API keys to version control
- Use environment variables or secrets management
- Rotate keys regularly
- Monitor API usage for anomalies

### Input Validation

The endpoint validates:

- Query is a non-empty string
- Request body is valid JSON
- Authentication token (if configured)

### Rate Limiting

Consider implementing additional rate limiting at:

- Reverse proxy level (nginx, traefik)
- Application level (express-rate-limit)
- LLM provider level (built-in limits)

## Troubleshooting

### "LLM client not configured"

**Solution**: Set required environment variables:

```bash
export LLM_PROVIDER=gemini
export LLM_API_KEY=your_key
export LLM_MODEL=gemini-1.5-pro
```

### "Request timed out"

**Solutions**:

- Increase `HORREUM_TIMEOUT` for slow Horreum responses
- Simplify query to reduce tool calls
- Check LLM API status

### "Tool execution integration pending"

**Status**: This is expected in the current phase. Tool orchestration will be
fully integrated in a future update.

### Query returns incomplete answer

**Solutions**:

- Check `tool_calls` array for tool execution errors
- Simplify query
- Break into multiple queries
- Check Horreum server availability

## Future Enhancements

Planned improvements:

1. **Streaming Responses** (Phase 9.4): Real-time streaming of answers as they
   generate
2. **Tool Execution Integration**: Full MCP tool execution (currently simulated)
3. **Query History**: Save and replay previous queries
4. **Caching**: Cache common queries to reduce LLM API costs
5. **Multi-turn Conversations**: Maintain context across multiple queries
6. **Custom System Prompts**: Domain-specific prompt customization

## See Also

- [AI Client Configuration](ai-clients.md) - MCP client setup
- [Time Range Queries](time-ranges.md) - Natural language time expressions
- [Filtering Guide](filtering.md) - Label values filtering
- [Observability](observability.md) - Monitoring and logging
