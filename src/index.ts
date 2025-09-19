/**
 * Horreum MCP server entrypoint.
 *
 * Exposes minimal tools via the MCP SDK. Read tools and Horreum integration
 * will be added next per the development plan.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadEnv } from './config/env.js';
import { createHorreumClient } from './horreum/http.js';

await loadEnv();

const server = new McpServer({
  name: 'horreum-mcp',
  version: '0.1.0',
});

// Minimal health tool to verify wiring
server.tool(
  'ping',
  'Ping the server to verify connectivity.',
  { message: z.string().optional() },
  async (args) => {
    const text = args?.message ?? 'pong';
    return { content: [{ type: 'text', text }] };
  }
);

// list_tests tool
server.tool(
  'list_tests',
  'List Horreum tests with optional pagination and search.',
  {
    limit: z.number().int().positive().max(1000).optional(),
    offset: z.number().int().min(0).optional(),
    search: z.string().optional(),
  },
  async (args) => {
    const env = await loadEnv();
    const client = createHorreumClient({
      baseUrl: env.HORREUM_BASE_URL,
      token: env.HORREUM_TOKEN ?? undefined,
      timeoutMs: env.HORREUM_TIMEOUT ?? undefined,
    });
    const res = await client.listTests({
      limit: args.limit ?? undefined,
      offset: args.offset ?? undefined,
      search: args.search ?? undefined,
    });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(res, null, 2),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
