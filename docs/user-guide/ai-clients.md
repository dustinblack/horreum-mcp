# AI Client Configuration Guide

Complete configuration guide for connecting AI assistants to Horreum MCP server.

## Overview

This guide covers **standalone usage** where AI assistants connect directly to
Horreum MCP. For the recommended Domain MCP integration pattern, see the
[Domain MCP Integration Guide](../architecture/domain-mcp-integration.md).

### Tested AI Clients

| Client                  | Direct HTTP             | HTTP (mcp-remote) | STDIO       | Notes                     |
| ----------------------- | ----------------------- | ----------------- | ----------- | ------------------------- |
| **Claude Desktop/Code** | ❓ Untested             | ✅ Verified       | ✅ Verified | Universal compatibility   |
| **Cursor**              | ✅ Verified (`url`)     | ✅ Verified       | ✅ Verified | All methods work          |
| **Gemini CLI**          | ✅ Verified (`httpUrl`) | ✅ Verified       | ✅ Verified | Use interactive mode      |
| **Cline**               | 🧪 Untested             | 🧪 Untested       | 🧪 Untested | VS Code extension         |
| Other MCP clients       | May work                | Expected          | Expected    | Depends on implementation |

**Connection Methods:** See the [main README](../../README.md#ai-client-configuration-standalone-usage)
for detailed comparison of Direct HTTP, HTTP via mcp-remote, and STDIO modes with their
advantages and limitations.

**Quick Reference:**

- **Direct HTTP**: Best for production/remote (Cursor: `url`, Gemini: `httpUrl`)
- **mcp-remote**: Universal compatibility (all clients)
- **STDIO**: Best for local development

---

## Prerequisites

### Build Horreum MCP

```bash
git clone https://github.com/dustinblack/horreum-mcp.git
cd horreum-mcp
npm ci
npm run build
```

### Environment Configuration

Create a `.env` file or set environment variables:

```bash
HORREUM_BASE_URL=https://horreum.example.com
HORREUM_TOKEN=horreum_api_token_abc123xyz
```

> [!IMPORTANT]
> Use absolute paths in client configurations - many clients don't resolve `~`
> or relative paths correctly.

---

## Claude Desktop / Claude Code

### Configuration Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### STDIO Configuration

```json
{
  "mcpServers": {
    "horreum": {
      "command": "node",
      "args": ["/absolute/path/to/horreum-mcp/build/index.js"],
      "env": {
        "HORREUM_BASE_URL": "https://horreum.example.com",
        "HORREUM_TOKEN": "horreum_api_token_abc123xyz"
      }
    }
  }
}
```

### Using Environment Variables

For security, reference environment variables instead of hardcoding tokens:

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

Then set in your shell environment:

```bash
export HORREUM_TOKEN="horreum_api_token_abc123xyz"
```

### HTTP Mode (Remote Servers)

For connecting to a remote Horreum MCP HTTP server, use `mcp-remote`:

```json
{
  "mcpServers": {
    "horreum-http": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://horreum-mcp.example.com:3000/mcp",
        "--header",
        "Authorization: Bearer mcp_auth_token_xyz789abc"
      ]
    }
  }
}
```

**Prerequisites**: HTTP server must be running:

```bash
HTTP_MODE_ENABLED=true \
HTTP_PORT=3000 \
HTTP_AUTH_TOKEN=mcp_auth_token_xyz789abc \
HORREUM_BASE_URL=https://horreum.example.com \
HORREUM_TOKEN=horreum_api_token_abc123xyz \
npm start
```

### Key Points

- Restart Claude after editing configuration
- Check logs at `~/.config/Claude/logs/mcp*.log` (Linux/macOS)
- Use absolute paths (no `~` or `./`)
- HTTP mode verified working with `npx mcp-remote`

---

## Cursor

### Configuration Location

Settings → Features → MCP → Add Server, or manually edit:

- **macOS/Linux**: `~/.cursor/mcp.json`
- **Windows**: `%USERPROFILE%\.cursor\mcp.json`

### Connection Methods

| Method                        | Status      | Best For                   | Configuration      |
| ----------------------------- | ----------- | -------------------------- | ------------------ |
| **Direct HTTP** (Recommended) | ✅ Verified | Remote servers, production | `url` field        |
| **HTTP via mcp-remote**       | ✅ Verified | Compatibility, debugging   | `npx mcp-remote`   |
| **STDIO**                     | ✅ Verified | Local development          | `command` + `args` |

### Direct HTTP Configuration

```json
{
  "mcpServers": {
    "horreum": {
      "url": "http://horreum-mcp.example.com:3000/mcp",
      "headers": {
        "Authorization": "Bearer mcp_auth_token_xyz789abc"
      }
    }
  }
}
```

### HTTP via mcp-remote Configuration

```json
{
  "mcpServers": {
    "horreum": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://horreum-mcp.example.com:3000/mcp",
        "--header",
        "Authorization: Bearer mcp_auth_token_xyz789abc"
      ]
    }
  }
}
```

### STDIO Configuration

```json
{
  "mcpServers": {
    "horreum": {
      "command": "node",
      "args": ["/absolute/path/to/horreum-mcp/build/index.js"],
      "env": {
        "HORREUM_BASE_URL": "https://horreum.example.com",
        "HORREUM_TOKEN": "horreum_api_token_abc123xyz"
      }
    }
  }
}
```

### Key Points

- Restart Cursor after editing configuration
- Direct HTTP recommended for production deployments
- Use Settings UI for easier configuration

---

## Cline (VS Code Extension)

### Configuration Location

VS Code Settings → Extensions → Cline → MCP Servers

### STDIO Configuration

Add to VS Code `settings.json`:

```json
{
  "cline.mcpServers": {
    "horreum": {
      "command": "node",
      "args": ["/absolute/path/to/horreum-mcp/build/index.js"],
      "env": {
        "HORREUM_BASE_URL": "https://horreum.example.com",
        "HORREUM_TOKEN": "horreum_api_token_abc123xyz"
      }
    }
  }
}
```

### Key Points

- Reload VS Code window after configuration changes
- Check VS Code Output panel → Cline for connection status
- Similar configuration to Claude Desktop

---

## Gemini CLI

### Configuration Location

`~/.gemini/settings.json`

### Connection Methods

| Method                        | Status      | Best For                   | Configuration      |
| ----------------------------- | ----------- | -------------------------- | ------------------ |
| **Direct HTTP** (Recommended) | ✅ Verified | Remote servers, production | `httpUrl` field    |
| **HTTP via mcp-remote**       | ✅ Verified | Compatibility, debugging   | `npx mcp-remote`   |
| **STDIO**                     | ✅ Verified | Local development          | `command` + `args` |

**Notes:**

- Gemini uses `httpUrl` (not `url` like Cursor)
- Add `"trust": true` to auto-allow queries without prompts (optional)

### Direct HTTP Configuration

```json
{
  "mcpServers": {
    "horreum": {
      "httpUrl": "http://horreum-mcp.example.com:3000/mcp",
      "headers": {
        "Authorization": "Bearer mcp_auth_token_xyz789abc"
      },
      "trust": true
    }
  }
}
```

> [!NOTE]
> The `trust` option allows Gemini to execute MCP tools without prompting for
> confirmation each time. Omit this if you want manual approval for each query.

### HTTP via mcp-remote Configuration

```json
{
  "mcpServers": {
    "horreum": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://horreum-mcp.example.com:3000/mcp",
        "--header",
        "Authorization: Bearer mcp_auth_token_xyz789abc"
      ],
      "trust": true
    }
  }
}
```

### STDIO Configuration

```json
{
  "mcpServers": {
    "horreum": {
      "command": "node",
      "args": ["/absolute/path/to/horreum-mcp/build/index.js"],
      "env": {
        "HORREUM_BASE_URL": "https://horreum.example.com",
        "HORREUM_TOKEN": "horreum_api_token_abc123xyz"
      },
      "trust": true
    }
  }
}
```

### Usage Notes

> [!IMPORTANT]
> Always use **interactive mode** (`gemini chat`) for best results. Non-interactive
> mode (`gemini "query"`) may not display output properly.

**Verification:**

```bash
gemini mcp list
# Should show: ✓ horreum: ... - Connected

gemini chat
# Then ask: "List all tests in Horreum"
```

### Key Points

- Direct HTTP recommended for production deployments
- Always use interactive mode (`gemini chat`)
- All connection methods verified working

---

## Testing Your Connection

### Basic Connectivity

Once configured, test in your AI client:

**Simple query:**

```
List all tests in Horreum
```

**Expected response:** List of test names and IDs

**Filtered query:**

```
Show me the latest 10 runs for test ID 123
```

**Expected response:** Run details with timestamps

### Health Check (HTTP Mode Only)

```bash
curl -H "Authorization: Bearer changeme" \
  http://localhost:3000/health
```

Expected: `{"status":"ok"}`

### Available Tools

Once connected, you can use these MCP tools:

- `horreum_list_tests` - List available tests
- `horreum_list_runs` - List test runs with filtering
- `horreum_get_run` - Get specific run details
- `horreum_get_schema` - Get schema definitions
- `horreum_get_test_label_values` - Query performance metrics
- `source.describe` - Discover server capabilities

See [filtering guide](filtering.md) and [time ranges guide](time-ranges.md)
for advanced usage.

---

## Troubleshooting

### Connection Issues

**"Cannot find module"**

- Verify `npm run build` completed successfully
- Check absolute path to `build/index.js` is correct
- Ensure Node.js v20+ is installed

**"HORREUM_BASE_URL must be a valid URL"**

- Check environment variable is set correctly
- Ensure URL includes protocol (`https://`)
- Verify Horreum instance is accessible

**"Connection refused" (Gemini HTTP proxy)**

- Verify HTTP server is running: `curl http://localhost:3000/health`
- Check port is correct (default 3000)
- Ensure `HTTP_MODE_ENABLED=true` is set

### Authentication Issues

**"Unauthorized" or "Forbidden"**

- Verify `HORREUM_TOKEN` is set correctly
- Test token directly:
  ```bash
  curl -H "Authorization: Bearer YOUR_TOKEN" \
    https://horreum.example.com/api/test
  ```
- Check token has appropriate permissions in Horreum

### SSL/TLS Issues

**Self-signed certificate errors:**

See [SSL/TLS Configuration](../deployment/ssl-tls.md) for handling corporate
or self-signed certificates.

**Quick test-only workaround:**

```bash
HORREUM_TLS_VERIFY=false npm start
```

> [!WARNING]
> Never use `HORREUM_TLS_VERIFY=false` in production.

### Client-Specific Issues

**Claude Desktop: No response**

- Check logs: `tail -f ~/.config/Claude/logs/mcp-server-*.log`
- Restart Claude Desktop completely
- Verify JSON syntax in configuration file

**Cursor: "Server disconnected"**

- Reload Cursor window (Cmd+Shift+P → "Reload Window")
- Check Developer Tools (Help → Toggle Developer Tools) → Console
- Verify absolute path has no spaces or special characters

**Gemini CLI: "No MCP servers configured"**

- Verify `~/.gemini/settings.json` exists
- Check JSON is valid: `jq . ~/.gemini/settings.json`
- Restart Gemini after configuration changes

---

## Advanced Configuration

### Custom Logging

Enable debug logging for troubleshooting:

```json
{
  "mcpServers": {
    "horreum": {
      "command": "node",
      "args": ["/absolute/path/to/horreum-mcp/build/index.js"],
      "env": {
        "HORREUM_BASE_URL": "https://horreum.example.com",
        "HORREUM_TOKEN": "your-token",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Rate Limiting

Adjust request rate limit (requests per second):

```json
{
  "env": {
    "HORREUM_BASE_URL": "https://horreum.example.com",
    "HORREUM_TOKEN": "your-token",
    "HORREUM_RATE_LIMIT": "5"
  }
}
```

### Timeout Configuration

Adjust per-request timeout (milliseconds):

```json
{
  "env": {
    "HORREUM_BASE_URL": "https://horreum.example.com",
    "HORREUM_TOKEN": "your-token",
    "HORREUM_TIMEOUT": "60000"
  }
}
```

---

## Next Steps

- **Usage Examples**: See [Usage section](../../README.md#usage) for query examples
- **Filtering**: [Label Values Filtering](filtering.md) for advanced queries
- **Time Ranges**: [Time Range Filtering](time-ranges.md) for natural language
  time queries
- **Observability**: [Logging and Diagnostics](observability.md) for monitoring
- **Troubleshooting**: [Horreum API Bugs](../troubleshooting/horreum-bugs.md)

---

## References

- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Claude MCP Documentation](https://docs.anthropic.com/claude/docs/mcp)
- [Horreum API Documentation](https://horreum.hyperfoil.io/docs/)
- [Gemini CLI](https://github.com/google/generative-ai-cli)
