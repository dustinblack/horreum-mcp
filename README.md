# Horreum MCP Server

A Model Context Protocol (MCP) server exposing Horreum capabilities as tools and
resources for AI clients.

## Status

Phase 1 implemented. Core scaffold complete; read tools and upload supported.
See `mcp_development_plan.md` for the authoritative plan and status.

## Quickstart

1. Create `.env`:

```
HORREUM_BASE_URL=https://horreum.example.com
# HORREUM_TOKEN=
HORREUM_RATE_LIMIT=10
HORREUM_TIMEOUT=30000
HORREUM_API_VERSION=latest
```

2. Install and run:

- `npm ci`
- `npm run build`
- `npm start`

Connect from an MCP client and call the `ping` tool.

### Available Tools

- `ping`: Simple connectivity check.
- `list_tests`: List Horreum tests (supports pagination and filters).
- `get_schema`: Retrieve a schema by id or name.
- `list_runs`: List runs for a test id (pagination/sorting supported).
- `upload_run`: Upload a run JSON payload (requires `HORREUM_TOKEN`).

### Exposed Resources

- `horreum://tests/{id}`: Test by ID (JSON).
- `horreum://schemas/{id}`: Schema by ID (JSON).
- `horreum://tests/{testId}/runs/{runId}`: Run summary by run ID (JSON).

### Configuration

Environment variables (can be provided via `.env` during development):

```
HORREUM_BASE_URL=https://horreum.example.com
# HORREUM_TOKEN= # optional for read tools; required for write tools
HORREUM_RATE_LIMIT=10          # client-side rate limit (req/sec)
HORREUM_TIMEOUT=30000          # per-request timeout (ms)
HORREUM_API_VERSION=latest
```

The client uses retries with exponential backoff (±25% jitter) on 429/5xx.
Secrets are never logged.

## Development

- `npm run check` (typecheck + lint)
- `npm run format`
- `npm run build`

### Git Hooks

This repository includes a pre-commit hook to ensure code quality and security.
The hook runs `secretlint` to prevent committing secrets and `eslint` for code
style.

To enable the hook, run the following command in your terminal:

```bash
git config core.hooksPath .githooks
```

### Generate Horreum OpenAPI client (optional)

Provide an OpenAPI JSON URL (typically `<HORREUM_BASE_URL>/q/openapi?format=json`)
when generating. Some public docs endpoints serve HTML; prefer a live instance.

```bash
npm run gen:api -- --input https://your-horreum.example.com/q/openapi?format=json
```

Generated code will be placed under `src/horreum/generated/`.

## License

Apache 2.0
