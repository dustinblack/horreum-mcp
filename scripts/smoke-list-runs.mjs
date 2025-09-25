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
    if (u.pathname === '/api/test/byName/example-test') {
      return new Response(JSON.stringify({ id: 123, name: 'example-test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (u.pathname.startsWith('/api/run/list/123')) {
      // Return two pages of mock data sorted by start Desc
      const page = Number(u.searchParams.get('page') ?? '1');
      const now = Date.now();
      const mk = (i) => ({
        access: 'PUBLIC',
        owner: 'mock',
        id: i,
        testid: 123,
        testname: 'example-test',
        start: now - i * 3600_000,
        stop: now - i * 3600_000 + 60_000,
        trashed: false,
        hasMetadata: false,
        datasets: [],
      });
      const runs = page === 1 ? [mk(1), mk(2), mk(3)] : [mk(24), mk(48)];
      return new Response(JSON.stringify({ runs, total: 5 }), {
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
// Query last 2 days by name (generic fixture)
const from = new Date(Date.now() - 2 * 24 * 3600_000).toISOString();
const res = await client.callTool({
  name: 'list_runs',
  arguments: { test: 'example-test', from },
});
console.log(JSON.stringify(res));
