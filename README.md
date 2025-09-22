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

2. Install and build:

- `npm ci`
- `npm run build` (required)

Note: For AI chat clients (Claude, Cursor, Gemini) you usually do NOT start the
server manually; those clients will spawn it. Manual runs are documented below.

Connect from an MCP client and call the `ping` tool.

## Manual runs and local testing (no AI client)

Use this when you want to run the server yourself and/or validate locally with
the included smoke tests.

1) Configure `.env` in the repo root (required for manual runs)

```
HORREUM_BASE_URL=https://horreum.example.com
# HORREUM_TOKEN= # required for write tools
HORREUM_RATE_LIMIT=10
HORREUM_TIMEOUT=30000
HORREUM_API_VERSION=latest
```

2) Build and start the server

- `npm ci`
- `npm run build`
- `npm start` (runs `./build/index.js`)

3) Run smoke tests (fast, in-memory validation)

- `npm run smoke` (ping)
- `npm run smoke:tests` (list_tests)
- `npm run smoke:schema` (get_schema)
- `npm run smoke:runs` (list_runs)
- `npm run smoke:upload` (upload_run; mocked)

## Use with AI chat agents (MCP clients)

This server speaks MCP over stdio. Build once (`npm run build`). AI clients will
spawn the server using the env you put in THEIR config. A local `.env` file is
not required for AI clients.

### Shared stdio configuration (works for Claude Code/Desktop, Cursor, Gemini CLI)

All of these clients ultimately need the same three fields. The embedding format
differs per client, but the values are identical:

- Command: `node`
- Args: `./build/index.js` (use an absolute path in GUI-based clients)
- Environment:
  - `HORREUM_BASE_URL=https://horreum.example.com`
  - `HORREUM_TOKEN=${HORREUM_TOKEN}` (required for writes and for reads of
    PRIVATE resources; may be optional for public reads)

Example JSON block (for clients that accept JSON server definitions; otherwise
map the same fields via UI). This SAME block applies to Claude, Cursor and
Gemini CLI—only the surrounding file/location differs:

```json
{
  "mcpServers": {
    "horreum": {
      "command": "node",
      "args": ["/absolute/path/to/build/index.js"],
      "env": {
        "HORREUM_BASE_URL": "https://horreum.example.com",
        "HORREUM_TOKEN": "${HORREUM_TOKEN}"
      }
    }
  }
}
```

Client-specific steps and how to embed the shared config:

### Claude (Code & Desktop)

- Claude Code (VS Code/JetBrains) uses a JSON file with `mcpServers`.
- Claude Desktop adds servers via Preferences → MCP (UI fields map to the same
  command/args/env).

Embed the shared JSON block under a server key (e.g., `horreum`) or use the UI
to enter the same fields.

Ask Claude: “List tests I can access,” or “Get schema by name
amq-broker-message-processing.”

See also: Anthropic docs → “Model Context Protocol (MCP) Overview”.

Config locations:

- Claude Code (VS Code/JetBrains): typically a `claude_mcp.json` in the
  workspace or a user-level settings store; exact path varies by editor/OS —
  see Claude Code MCP docs.
- Claude Desktop: Preferences → MCP (UI). Settings are stored in the app data
  directory per OS — see Desktop docs for paths.

### Cursor

Open Cursor → Settings → MCP → Add Server and fill:

- Command: `node`
- Args: `/absolute/path/to/build/index.js`
- Env: `HORREUM_BASE_URL`, `HORREUM_TOKEN` (if needed)

Then try: “List runs for test 114.”

Config location: Cursor → Settings → MCP (UI). Cursor persists configuration
internally; see Cursor docs for details.

### Gemini CLI

Gemini’s CLI supports MCP via a config file. Add a server entry that contains
the shared config (command/args/env). The surrounding file/location varies by
installation—consult the Gemini CLI MCP documentation for the current schema.

Then run the CLI and ask: “List tests from Horreum.”

Config location: typically `~/.gemini/settings.json` (Gemini CLI). Paths can
vary by install/version — see Gemini CLI docs for authoritative locations.

References:

- Model Context Protocol: [modelcontextprotocol.io](https://modelcontextprotocol.io)
- Claude + MCP: Anthropic docs → “MCP Overview”, “MCP in Desktop/Code”.
- Gemini CLI + MCP: Gemini CLI documentation for MCP configuration.

Troubleshooting

- Paths: Use absolute paths for `args` (many clients do not expand `~`).
- Build: Always run `npm run build` after changes so the client executes fresh
  code from `./build/index.js`.
- Env: Missing `HORREUM_BASE_URL` (or token if needed) will cause immediate
  startup failure.
## Testing and expected behavior

- Natural-language prompts that work well:
  - “List tests I can access.” (use roles="__all" internally)
  - “Get schema by id 65.” or “Get schema by name amq-broker-…”.
  - “Show the latest 5 runs for test 114.”

- Pagination and roles:
  - Some endpoints are 1‑based for `page`. If a page looks empty, try `page: 1`.
  - For large results, prefer `limit` + `page`. Use roles="__all" for global
    listings when allowed by policy.

- Authentication:
  - PUBLIC resources may be readable anonymously (instance-dependent). PRIVATE
    resources require `HORREUM_TOKEN` even for reads. Writes always require a
    token. See Horreum docs on access control.
  - Errors are surfaced with helpful text; avoid logging secrets.

- Writes (upload_run):
  - Provide `test`, `start`, `stop`, and JSON `data`. Prefer a dry‑run flow in
    production to verify payloads before committing changes.

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

Environment variables (for manual runs via `.env`):

```
HORREUM_BASE_URL=https://horreum.example.com
# HORREUM_TOKEN= # required for writes and for reads of PRIVATE resources
HORREUM_RATE_LIMIT=10          # client-side rate limit (req/sec)
HORREUM_TIMEOUT=30000          # per-request timeout (ms)
HORREUM_API_VERSION=latest
```

The client uses retries with exponential backoff (±25% jitter) on 429/5xx.
Secrets are never logged. PRIVATE resource access requires a token.

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
