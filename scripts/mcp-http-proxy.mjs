#!/usr/bin/env node
/**
 * MCP HTTP Proxy - Bridge between stdio and HTTP MCP server
 *
 * This script allows stdio-based MCP clients (like Gemini CLI, Claude Desktop)
 * to connect to HTTP-based MCP servers by proxying JSON-RPC messages over HTTP.
 *
 * Background:
 * -----------
 * The MCP SDK's StreamableHTTPServerTransport uses POST-based JSON-RPC, but some
 * AI clients (especially Gemini CLI) expect pure SSE (Server-Sent Events) streaming
 * initiated via GET requests. This proxy bridges that gap by:
 *
 * 1. Accepting stdio input from AI clients (like a local MCP server)
 * 2. Forwarding JSON-RPC messages to the HTTP server via POST
 * 3. Managing session IDs automatically
 * 4. Returning responses back to the client via stdout
 *
 * This pattern is commonly used by Claude Desktop when connecting to remote servers.
 *
 * Usage:
 * ------
 *   node mcp-http-proxy.mjs <server-url> [auth-token]
 *
 * Examples:
 * ---------
 *   # Without authentication
 *   node mcp-http-proxy.mjs http://localhost:3001/mcp
 *
 *   # With bearer token authentication
 *   node mcp-http-proxy.mjs http://localhost:3001/mcp my-secret-token
 *
 * Gemini CLI Configuration:
 * -------------------------
 *   gemini mcp add horreum-mcp node \
 *     /absolute/path/to/mcp-http-proxy.mjs \
 *     http://localhost:3001/mcp \
 *     optional-auth-token
 *
 * Claude Desktop Configuration:
 * -----------------------------
 *   {
 *     "mcpServers": {
 *       "horreum": {
 *         "command": "node",
 *         "args": [
 *           "/absolute/path/to/mcp-http-proxy.mjs",
 *           "http://localhost:3001/mcp",
 *           "optional-auth-token"
 *         ]
 *       }
 *     }
 *   }
 */

import { stdin, stdout, stderr } from 'node:process';
import { createInterface } from 'node:readline';

const SERVER_URL = process.argv[2];
const AUTH_TOKEN = process.argv[3];

if (!SERVER_URL) {
  stderr.write('Error: Server URL is required\n');
  stderr.write('Usage: node mcp-http-proxy.mjs <server-url> [auth-token]\n');
  process.exit(1);
}

let sessionId = null;

// Read JSON-RPC messages from stdin
const rl = createInterface({
  input: stdin,
  terminal: false,
  crlfDelay: Infinity,
});

stderr.write(`MCP HTTP Proxy starting...\n`);
stderr.write(`Server: ${SERVER_URL}\n`);
stderr.write(`Auth: ${AUTH_TOKEN ? 'Enabled' : 'Disabled'}\n\n`);

// Keep track of pending requests
let pendingRequests = 0;

rl.on('line', async (line) => {
  pendingRequests++;

  try {
    const message = JSON.parse(line);
    stderr.write(`-> Sending: ${message.method || 'response'} (id: ${message.id})\n`);
    stderr.write(`   Full message: ${JSON.stringify(message)}\n`);

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };

    if (AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }

    if (sessionId) {
      headers['Mcp-Session-Id'] = sessionId;
    }

    // Send request to HTTP server
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(message),
    });

    // Extract session ID from response headers (for initialize)
    const newSessionId = response.headers.get('mcp-session-id');
    if (newSessionId) {
      sessionId = newSessionId;
      stderr.write(`<- Session ID: ${sessionId}\n`);
    }

    // Read response body
    const responseText = await response.text();

    if (!response.ok) {
      stderr.write(`<- Error: HTTP ${response.status}\n`);
      stderr.write(`<- Body: ${responseText}\n`);

      // Send error response back to client
      const errorResponse = {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32000,
          message: `HTTP error: ${response.status}`,
          data: responseText,
        },
      };
      stdout.write(JSON.stringify(errorResponse) + '\n');
      return;
    }

    // Handle empty responses (notifications don't get responses)
    if (!responseText || responseText.trim() === '') {
      stderr.write(`<- Empty response (likely a notification)\n\n`);
      return;
    }

    // Parse and forward response
    const responseJson = JSON.parse(responseText);
    stderr.write(
      `<- Received: ${responseJson.result ? 'result' : 'error'} (id: ${responseJson.id})\n\n`
    );

    stdout.write(JSON.stringify(responseJson) + '\n');
  } catch (error) {
    stderr.write(`Error: ${error.message}\n`);

    // Try to send error response if we can parse the message
    try {
      const message = JSON.parse(line);
      const errorResponse = {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: `Proxy error: ${error.message}`,
        },
      };
      stdout.write(JSON.stringify(errorResponse) + '\n');
    } catch {
      // Can't send error response if we can't parse the message
    }
  } finally {
    pendingRequests--;
  }
});

rl.on('close', () => {
  stderr.write('MCP HTTP Proxy shutting down\n');
  process.exit(0);
});

// Handle signals
process.on('SIGINT', () => {
  stderr.write('Received SIGINT\n');
  process.exit(0);
});

process.on('SIGTERM', () => {
  stderr.write('Received SIGTERM\n');
  process.exit(0);
});
