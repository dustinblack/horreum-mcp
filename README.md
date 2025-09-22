### Tracing (optional)

OpenTelemetry tracing can be enabled to export spans (including HTTP calls via undici):

```bash
export TRACING_ENABLED=true
# Configure OTLP endpoint via standard envs, e.g. OTEL_EXPORTER_OTLP_ENDPOINT
npm start
```

Spans include per-tool and per-resource operations and all outbound fetch calls.
# Horreum MCP Server

A Model Context Protocol (MCP) server that exposes
[Horreum](https://horreum.hyperfoil.io/) capabilities as tools and resources for
AI clients. This allows AI agents to interact with Horreum to manage tests,
schemas, runs, and more.

## Status

This project is in Phase 3 (Observability & Hardening). Core functionality is
implemented with enhancements:

- Read tools stabilized with folder-aware `list_tests` and time-filtered
  `list_runs` (test name to ID resolution supported)
- `upload_run` implemented
- Structured logging with correlation IDs (pino)
- Rate-limited fetch with retries/backoff injected via `OpenAPI.FETCH`
- CI runs typecheck, lint, build, and all smoke tests

For a detailed roadmap, see
[mcp_development_plan.md](mcp_development_plan.md).

## Features

The server provides the following tools for AI clients:

-   `ping`: A simple connectivity check.
-   `list_tests`: Lists Horreum tests with support for pagination and filters.
-   `get_schema`: Retrieves a schema by its ID or name.
-   `list_runs`: Lists runs for a given test (by ID or name), with pagination,
    sorting, and optional time filters (`from`/`to`).
-   `upload_run`: Uploads a run JSON payload to a specified test.

In addition to tools, the server exposes key resources as URIs:

-   `horreum://tests/{id}`
-   `horreum://schemas/{id}`
-   `horreum://tests/{testId}/runs/{runId}`

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/) (v20 or higher)
-   [npm](https://www.npmjs.com/)

## Installation

To get started, clone the repository and install the dependencies:

```bash
git clone https://github.com/your-username/horreum-mcp.git
cd horreum-mcp
npm ci
```

Next, build the project.

> [!IMPORTANT]
> This build step is required before the server can be run, either manually or by an AI client.

```bash
npm run build
```

## Configuration

The server is configured using environment variables. For local development and
manual runs, you can create a `.env` file in the root of the project.

```bash
# .env
HORREUM_BASE_URL=https://horreum.example.com
# HORREUM_TOKEN=your-horreum-api-token
HORREUM_RATE_LIMIT=10
HORREUM_TIMEOUT=30000
HORREUM_API_VERSION=latest
```

| Variable             | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| `HORREUM_BASE_URL`   | The base URL of your Horreum instance.                                   |
| `HORREUM_TOKEN`      | Your Horreum API token. Required for writes and private resource     |
|                      | access.                                                          |
| `HORREUM_RATE_LIMIT` | Client-side rate limit in requests per second.                           |
| `HORREUM_TIMEOUT`    | Per-request timeout in milliseconds.                                     |
| `HORREUM_API_VERSION`| The version of the Horreum API to use.                                   |
| `LOG_LEVEL`          | Logging level for pino (`info`, `debug`, `error`). Default: `info`.      |
| `METRICS_ENABLED`    | Enable Prometheus metrics endpoint. Default: `false`.                     |
| `METRICS_PORT`       | Port for metrics endpoint. Default: `9464`.                               |
| `METRICS_PATH`       | Path for metrics endpoint. Default: `/metrics`.                            |

> [!NOTE]
> When using an AI client, these environment variables are typically set in the
> client's configuration, and a local `.env` file is not required.

## Usage

There are two primary ways to use the server: running it manually for local
testing or integrating it with an AI client that supports MCP.

### Manual (Local) Testing

For local testing, you can start the server and use the provided smoke tests to
validate its functionality.

1.  **Start the server:**

    ```bash
    npm start
    ```

    This will run the compiled server from `./build/index.js`.

2.  **Enable Prometheus metrics (optional):**

    Set environment variables and scrape from Prometheus:

    ```bash
    export METRICS_ENABLED=true
    export METRICS_PORT=9464
    export METRICS_PATH=/metrics
    npm start
    # Scrape http://localhost:9464/metrics
    ```

3.  **Run smoke tests:**

    The smoke tests provide a quick way to validate the server's tools from the
    command line.

    -   `npm run smoke`: Pings the server.
    -   `npm run smoke:tests`: Lists tests.
    -   `npm run smoke:schema`: Gets a schema.
    -   `npm run smoke:runs`: Lists runs.
    -   `npm run smoke:upload`: Mocks an upload.

### Usage with AI Clients (MCP)

This server communicates with AI clients over stdio using the [Model Context
Protocol](https://modelcontextprotocol.io/). After building the server (`npm run
build`), you can configure your AI client to spawn it.

The core configuration is the same for all clients:

-   **Command:** `node`
-   **Args:** `/absolute/path/to/horreum-mcp/build/index.js`
-   **Environment:**
    -   `HORREUM_BASE_URL=https://horreum.example.com`
    -   `HORREUM_TOKEN=${HORREUM_TOKEN}` (if required)

> [!WARNING]
> Always use an absolute path for the `args` value. Many clients do not expand
> `~` or resolve relative paths correctly.

Below are examples of how to configure popular AI clients.

<details>
<summary>Claude (VS Code & Desktop)</summary>

-   **Claude Code (VS Code/JetBrains):** Add the server configuration to your
    `claude_mcp.json` file.
-   **Claude Desktop:** Add the server via **Preferences → MCP**.

Example `claude_mcp.json`:

```json
{
  "mcpServers": {
    "horreum": {
      "command": "node",
      "args": ["/absolute/path/to/horreum-mcp/build/index.js"],
      "env": {
        "HORREUM_BASE_URL": "https://horreum.example.com",
        "HORREUM_TOKEN": "${HORREUM_TOKEN}"
      }
    }
  }
}
```

</details>

<details>
<summary>Cursor</summary>

Open **Settings → MCP → Add Server** and provide the following:

-   **Command:** `node`
-   **Args:** `/absolute/path/to/horreum-mcp/build/index.js`
-   **Env:** `HORREUM_BASE_URL`, `HORREUM_TOKEN` (if needed)

</details>

<details>
<summary>Gemini CLI</summary>

Add the server configuration to your Gemini settings file (typically
`~/.gemini/settings.json`).

```json
{
  "mcpServers": {
    "horreum": {
      "command": "node",
      "args": ["/absolute/path/to/horreum-mcp/build/index.js"],
      "env": {
        "HORREUM_BASE_URL": "https://horreum.example.com",
        "HORREUM_TOKEN": "${HORREUM_TOKEN}"
      }
    }
  }
}
```

</details>

<br>

## Sample Prompts

Below are some examples of natural language prompts you can use with your AI
client.

-   **"List all available tests."**

    > **Expected behavior:** The AI client will use the `list_tests` tool to
    > retrieve a list of all tests you have access to.

-   **"Get the schema with the name `my-schema-name`."**

    > **Expected behavior:** The AI client will use the `get_schema` tool to
    > retrieve the schema with the specified name.

-   **"Show me the latest 5 runs for test ID 123."**

    > **Expected behavior:** The AI client will use the `list_runs` tool with a
    > limit of 5 to retrieve the most recent runs for the specified test.

-   **"Upload a new run to the `my-test` test."**

    > **Expected behavior:** The AI client will use the `upload_run` tool. It may
    > ask for the required data, such as the start and stop times and the JSON
    > payload for the run.

## Development

This section provides information for developers contributing to the project.

### Code Quality

-   **Type checking and linting:**

    ```bash
    npm run check
    ```

-   **Formatting:**

    ```bash
    npm run format
    ```

### Git Hooks

This repository includes a pre-commit hook to ensure code quality and security.
The hook runs `secretlint` to prevent committing secrets and `eslint` for code
style.

To enable the hook, run the following command:

```bash
git config core.hooksPath .githooks
```

### Generating the Horreum OpenAPI Client

The Horreum API client is generated from an OpenAPI specification. To regenerate
the client:

```bash
npm run gen:api -- --input https://your-horreum.example.com/q/openapi?format=json
```

The generated code will be placed in `src/horreum/generated/`.

## License

This project is licensed under the Apache 2.0 License. See the [LICENSE](LICENSE)
file for details.