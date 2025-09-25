import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerTools } from '../build/server/tools.js';

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
  fetchImpl: async (url, init) => {
    const u = new URL(url);
    if (u.pathname === '/api/run/data' && init?.method === 'POST') {
      return new Response('[]', {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Not Found', { status: 404 });
  },
});
await server.connect(serverT);
const client = new Client({ name: 'smoke-client', version: '0.0.0' });
await client.connect(clientT);

const res = await client.callTool({
  name: 'upload_run',
  arguments: {
    test: 'demo',
    start: '2025-01-01T00:00:00Z',
    stop: '2025-01-01T00:10:00Z',
    data: { hello: 'world' },
  },
});
console.log(JSON.stringify(res));
