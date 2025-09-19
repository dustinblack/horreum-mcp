/**
 * Horreum MCP server entrypoint.
 *
 * Exposes minimal tools via the MCP SDK. Read tools and Horreum integration
 * will be added next per the development plan.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadEnv } from './config/env.js';
import { registerTools } from './server/tools.js';

await loadEnv();

const server = new McpServer({
  name: 'horreum-mcp',
  version: '0.1.0',
});

await registerTools(server, { getEnv: loadEnv });

const transport = new StdioServerTransport();
await server.connect(transport);
