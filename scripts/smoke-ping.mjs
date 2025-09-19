import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { z } from 'zod';

const server = new McpServer({ name: 'smoke', version: '0.0.0' });
server.tool('ping', { message: z.string().optional() }, async (a) => ({
  content: [{ type: 'text', text: a?.message ?? 'pong' }],
}));

const [clientT, serverT] = InMemoryTransport.createLinkedPair();
await server.connect(serverT);

const client = new Client({ name: 'smoke-client', version: '0.0.0' });
await client.connect(clientT);

const res = await client.callTool({ name: 'ping', arguments: {} });
console.log(JSON.stringify(res));


