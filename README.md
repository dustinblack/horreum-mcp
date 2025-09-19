# Horreum MCP Server

A Model Context Protocol (MCP) server exposing Horreum capabilities as tools and
resources for AI clients.

## Status

Phase 1 authorized and in progress. Core scaffold complete; read tools next.
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

## Development

- `npm run check` (typecheck + lint)
- `npm run format`
- `npm run build`

## License

Apache 2.0
