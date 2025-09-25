import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerTools } from '../build/index.js';

const [clientT, serverT] = InMemoryTransport.createLinkedPair();
const server = new McpServer({ name: 'smoke', version: '0.0.0' });
await registerTools(server, {
  getEnv: async () => ({
    HORREUM_BASE_URL: 'https://example.invalid',
    HORREUM_API_VERSION: 'latest',
    HORREUM_RATE_LIMIT: 10,
    HORREUM_TIMEOUT: 1000,
    HORREUM_TOKEN: undefined,
  }),
  fetchImpl: async (url) => {
    const u = new URL(url);
    if (u.pathname.startsWith('/api/schema/')) {
      return new Response(JSON.stringify({ id: 123, name: 'mock' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (u.pathname === '/api/schema') {
      return new Response(JSON.stringify({ id: 456, name: 'byName' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Not Found', { status: 404 });
  },
});
await server.connect(serverT);
const client = new Client({ name: 'smoke-client', version: '0.0.0' });
await client.connect(clientT);

const byId = await client.callTool({ name: 'get_schema', arguments: { id: 1 } });
console.log('byId', JSON.stringify(byId));
const byName = await client.callTool({ name: 'get_schema', arguments: { name: 'n' } });
console.log('byName', JSON.stringify(byName));
