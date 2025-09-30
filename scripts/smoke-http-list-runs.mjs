#!/usr/bin/env node
/**
 * Smoke test: HTTP POST /api/tools/horreum_list_runs
 * - Starts a mock Horreum API HTTP server
 * - Starts Horreum MCP in HTTP mode
 * - Calls the new direct HTTP endpoint and verifies JSON response shape
 */
import http from 'node:http';
import { execa } from 'execa';
import { fileURLToPath } from 'url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const serverEntry = path.join(projectRoot, 'build', 'index.js');

const MCP_PORT = 3002; // avoid conflicts with other smoke tests
const AUTH_TOKEN = 'test-token';
const HORREUM_PORT = 18081;
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

    // GET /api/run/list/:testId?limit=&page=&sort=&direction=
    if (req.method === 'GET' && url.pathname.startsWith('/api/run/list/')) {
      const page = Number(url.searchParams.get('page') ?? '1');
      const limit = Number(url.searchParams.get('limit') ?? '3');
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
      res.writeHead(200);
      res.end(JSON.stringify({ runs, total: 5, limit, page }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  return new Promise((resolve) => {
    server.listen(HORREUM_PORT, '127.0.0.1', () => resolve(server));
  });
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

    console.log('Calling POST /api/tools/horreum_list_runs...');
    const payload = {
      test: 'example-test',
      from: new Date(Date.now() - 24 * 3600_000).toISOString(),
      limit: 3,
    };
    const { stdout } = await execa('curl', [
      '-sS',
      '-X',
      'POST',
      `http://127.0.0.1:${MCP_PORT}/api/tools/horreum_list_runs`,
      '-H',
      'Content-Type: application/json',
      '-H',
      `Authorization: Bearer ${AUTH_TOKEN}`,
      '-d',
      JSON.stringify(payload),
    ]);
    const json = JSON.parse(stdout);
    if (!json || typeof json !== 'object' || !Array.isArray(json.runs)) {
      throw new Error('Unexpected response shape');
    }
    if (typeof json.total !== 'number') {
      throw new Error('Missing total in response');
    }
    console.log('✅ horreum_list_runs endpoint smoke passed');
  } catch (err) {
    console.error('❌ smoke-http-list-runs failed:', err);
    process.exitCode = 1;
  } finally {
    if (serverProcess) serverProcess.kill('SIGTERM');
    if (mock) mock.close();
  }
}

run();
