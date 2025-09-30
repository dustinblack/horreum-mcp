#!/usr/bin/env node
/**
 * Comprehensive smoke test for all HTTP POST /api/tools/* endpoints
 * Tests: list_runs, list_tests, get_schema, list_schemas, get_run
 */
import http from 'node:http';
import { execa } from 'execa';
import { fileURLToPath } from 'url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const serverEntry = path.join(projectRoot, 'build', 'index.js');

const MCP_PORT = 3003;
const AUTH_TOKEN = 'test-token';
const HORREUM_PORT = 18082;
const HORREUM_BASE = `http://127.0.0.1:${HORREUM_PORT}`;

function startMockHorreum() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${HORREUM_PORT}`);
    res.setHeader('Content-Type', 'application/json');

    // GET /api/test/byName/:name
    if (req.method === 'GET' && url.pathname.startsWith('/api/test/byName/')) {
      const name = decodeURIComponent(url.pathname.split('/').pop() ?? '');
      res.writeHead(200);
      res.end(JSON.stringify({ id: 123, name }));
      return;
    }

    // GET /api/test/list
    if (req.method === 'GET' && url.pathname.startsWith('/api/test/list')) {
      res.writeHead(200);
      res.end(JSON.stringify({ tests: [{ id: 123, name: 'test-1' }], count: 1 }));
      return;
    }

    // GET /api/test/folders
    if (req.method === 'GET' && url.pathname === '/api/test/folders') {
      res.writeHead(200);
      res.end(JSON.stringify(['folder1', 'folder2']));
      return;
    }

    // GET /api/run/list/:testId
    if (req.method === 'GET' && url.pathname.startsWith('/api/run/list/')) {
      const now = Date.now();
      const runs = [
        {
          id: 1,
          testid: 123,
          start: now - 3600_000,
          stop: now - 3540_000,
          owner: 'mock',
        },
      ];
      res.writeHead(200);
      res.end(JSON.stringify({ runs, total: 1 }));
      return;
    }

    // GET /api/run/:id
    if (req.method === 'GET' && url.pathname.startsWith('/api/run/')) {
      const id = Number(url.pathname.split('/').pop());
      res.writeHead(200);
      res.end(JSON.stringify({ id, testid: 123, start: Date.now(), owner: 'mock' }));
      return;
    }

    // GET /api/schema/:id
    if (req.method === 'GET' && url.pathname.startsWith('/api/schema/')) {
      const id = Number(url.pathname.split('/').pop());
      res.writeHead(200);
      res.end(JSON.stringify({ id, name: 'schema-1', uri: 'urn:example:1' }));
      return;
    }

    // GET /api/schema
    if (req.method === 'GET' && url.pathname === '/api/schema') {
      res.writeHead(200);
      res.end(JSON.stringify([{ id: 1, name: 'schema-1', uri: 'urn:example:1' }]));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  return new Promise((resolve) => {
    server.listen(HORREUM_PORT, '127.0.0.1', () => resolve(server));
  });
}

async function callEndpoint(endpoint, payload) {
  const { stdout } = await execa('curl', [
    '-sS',
    '-X',
    'POST',
    `http://127.0.0.1:${MCP_PORT}${endpoint}`,
    '-H',
    'Content-Type: application/json',
    '-H',
    `Authorization: Bearer ${AUTH_TOKEN}`,
    '-d',
    JSON.stringify(payload),
  ]);
  return JSON.parse(stdout);
}

async function run() {
  let mock;
  let serverProcess;
  try {
    console.log('Starting mock Horreum API...');
    mock = await startMockHorreum();

    console.log('Starting Horreum MCP (HTTP mode)...');
    serverProcess = execa('node', [serverEntry], {
      env: {
        HTTP_MODE_ENABLED: 'true',
        HTTP_PORT: String(MCP_PORT),
        HTTP_AUTH_TOKEN: AUTH_TOKEN,
        HORREUM_BASE_URL: HORREUM_BASE,
        HORREUM_RATE_LIMIT: '50',
        HORREUM_TIMEOUT: '5000',
      },
      stdio: 'inherit',
    });
    serverProcess.catch(() => {});

    // Wait for server to be ready
    for (let i = 0; i < 10; i += 1) {
      try {
        await execa('curl', ['-sSf', `http://127.0.0.1:${MCP_PORT}/health`], {
          timeout: 500,
        });
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    console.log('\n=== Testing POST /api/tools/horreum_list_runs ===');
    const runsResp = await callEndpoint('/api/tools/horreum_list_runs', {
      test: 'example-test',
      limit: 10,
    });
    if (!Array.isArray(runsResp.runs) || typeof runsResp.total !== 'number') {
      throw new Error('list_runs: invalid response shape');
    }
    console.log('✅ horreum_list_runs passed');

    console.log('\n=== Testing POST /api/tools/horreum_get_run ===');
    const runResp = await callEndpoint('/api/tools/horreum_get_run', {
      run_id: 1,
    });
    if (typeof runResp.id !== 'number') {
      throw new Error('get_run: invalid response shape');
    }
    console.log('✅ horreum_get_run passed');

    console.log('\n=== Testing POST /api/tools/horreum_list_tests ===');
    const testsResp = await callEndpoint('/api/tools/horreum_list_tests', {
      limit: 10,
    });
    if (!Array.isArray(testsResp.tests) || typeof testsResp.count !== 'number') {
      throw new Error('list_tests: invalid response shape');
    }
    console.log('✅ horreum_list_tests passed');

    console.log('\n=== Testing POST /api/tools/horreum_get_schema ===');
    const schemaResp = await callEndpoint('/api/tools/horreum_get_schema', {
      id: 1,
    });
    if (typeof schemaResp.id !== 'number') {
      throw new Error('get_schema: invalid response shape');
    }
    console.log('✅ horreum_get_schema passed');

    console.log('\n=== Testing POST /api/tools/horreum_list_schemas ===');
    const schemasResp = await callEndpoint('/api/tools/horreum_list_schemas', {});
    if (!Array.isArray(schemasResp)) {
      throw new Error('list_schemas: invalid response shape');
    }
    console.log('✅ horreum_list_schemas passed');

    console.log('\n🎉 All HTTP endpoint smoke tests passed!');
  } catch (err) {
    console.error('❌ smoke-http-all-endpoints failed:', err);
    process.exitCode = 1;
  } finally {
    if (serverProcess) serverProcess.kill('SIGTERM');
    if (mock) mock.close();
  }
}

run();
