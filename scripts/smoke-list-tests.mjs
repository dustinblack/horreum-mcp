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
    // Mock folders endpoint
    if (u.pathname === '/api/test/folders') {
      return new Response(JSON.stringify(['FolderA', 'FolderB']), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Mock summary endpoint with optional folder
    if (u.pathname === '/api/test/summary') {
      const folder = u.searchParams.get('folder');
      const makeTest = (id, name, folderName = null) => ({
        access: 'PUBLIC',
        owner: 'mock-owner',
        id,
        name,
        folder: folderName,
        description: '',
        datasets: 0,
        runs: 0,
        watching: null,
        datastoreId: null,
      });
      if (folder) {
        const tests = [
          makeTest(100 + folder.length, `test-${folder}-1`, folder),
          makeTest(200 + folder.length, `test-${folder}-2`, folder),
        ];
        return new Response(JSON.stringify({ tests, count: tests.length }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const tests = [makeTest(1, 'top-level-1'), makeTest(2, 'top-level-2')];
      return new Response(JSON.stringify({ tests, count: tests.length }), {
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
const res = await client.callTool({ name: 'list_tests', arguments: {} });
console.log(JSON.stringify(res));
