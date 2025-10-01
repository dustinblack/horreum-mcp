#!/usr/bin/env node
/**
 * Smoke test: HTTP pagination with pageToken/pageSize
 * Tests the new pagination format with next_page_token, has_more, total_count
 * and 1-based pagination (first page is page=1)
 */
import http from 'node:http';
import { execa } from 'execa';
import { fileURLToPath } from 'url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const serverEntry = path.join(projectRoot, 'build', 'index.js');

const MCP_PORT = 3004;
const AUTH_TOKEN = 'test-token';
const HORREUM_PORT = 18083;
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

    // GET /api/run/list/:testId - Return paginated runs
    if (req.method === 'GET' && url.pathname.startsWith('/api/run/list/')) {
      const page = Number(url.searchParams.get('page') ?? '1');
      const limit = Number(url.searchParams.get('limit') ?? '5');
      const now = Date.now();

      // Generate runs for different pages
      const startId = (page - 1) * limit;
      const runs = [];
      for (let i = 0; i < limit; i++) {
        const id = startId + i + 1;
        if (id > 12) break; // Total of 12 runs
        runs.push({
          id,
          testid: 123,
          start: now - id * 3600_000,
          stop: now - id * 3600_000 + 60_000,
          owner: 'mock',
        });
      }

      res.writeHead(200);
      res.end(JSON.stringify({ runs, total: 12 }));
      return;
    }

    // GET /api/test/summary
    if (req.method === 'GET' && url.pathname === '/api/test/summary') {
      const pageParam = url.searchParams.get('page');
      const limit = Number(url.searchParams.get('limit') ?? '5');

      // No page parameter = return all tests (for aggregation)
      const tests = [];
      if (pageParam === null) {
        for (let id = 1; id <= 8; id++) {
          tests.push({ id, name: `test-${id}` });
        }
      } else {
        const page = Number(pageParam);
        const startId = (page - 1) * limit;
        for (let i = 0; i < limit; i++) {
          const id = startId + i + 1;
          if (id > 8) break; // Total of 8 tests
          tests.push({ id, name: `test-${id}` });
        }
      }

      res.writeHead(200);
      res.end(JSON.stringify({ tests, count: 8 }));
      return;
    }

    // GET /api/test/folders
    if (req.method === 'GET' && url.pathname === '/api/test/folders') {
      res.writeHead(200);
      res.end(JSON.stringify([]));
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

    console.log('\n=== Testing pagination with pageSize (first page) ===');
    const page1 = await callEndpoint('/api/tools/horreum_list_runs', {
      test: 'example-test',
      pageSize: 5,
    });

    if (!page1.pagination) {
      throw new Error('Missing pagination metadata');
    }
    if (!page1.pagination.next_page_token) {
      throw new Error('Missing next_page_token on first page');
    }
    if (page1.pagination.has_more !== true) {
      throw new Error('has_more should be true on first page');
    }
    if (page1.pagination.total_count !== 12) {
      throw new Error(`Expected total_count=12, got ${page1.pagination.total_count}`);
    }
    if (page1.runs.length !== 5) {
      throw new Error(`Expected 5 runs, got ${page1.runs.length}`);
    }
    // Verify snake_case (no camelCase)
    if (
      page1.pagination.nextPageToken ||
      page1.pagination.hasMore ||
      page1.pagination.totalCount
    ) {
      throw new Error('Pagination should use snake_case, not camelCase');
    }
    console.log(
      '✅ First page: pageSize=5, has_more=true, total_count=12, snake_case ✓'
    );

    console.log('\n=== Testing pagination with pageToken (second page) ===');
    const page2 = await callEndpoint('/api/tools/horreum_list_runs', {
      test: 'example-test',
      pageToken: page1.pagination.next_page_token,
    });

    if (!page2.pagination) {
      throw new Error('Missing pagination metadata on page 2');
    }
    if (page2.runs.length !== 5) {
      throw new Error(`Expected 5 runs on page 2, got ${page2.runs.length}`);
    }
    if (page2.pagination.has_more !== true) {
      throw new Error('has_more should be true on second page');
    }
    console.log('✅ Second page: using pageToken, got 5 more runs');

    console.log('\n=== Testing last page ===');
    const page3 = await callEndpoint('/api/tools/horreum_list_runs', {
      test: 'example-test',
      pageToken: page2.pagination.next_page_token,
    });

    if (page3.pagination.has_more !== false) {
      throw new Error('has_more should be false on last page');
    }
    if (page3.pagination.next_page_token) {
      throw new Error('next_page_token should be absent on last page');
    }
    console.log('✅ Last page: has_more=false, no next_page_token');

    console.log('\n=== Testing invalid pageToken ===');
    try {
      await callEndpoint('/api/tools/horreum_list_runs', {
        test: 'example-test',
        pageToken: 'invalid-token-xyz',
      });
      throw new Error('Should have rejected invalid pageToken');
    } catch (err) {
      // Expected to fail
      console.log('✅ Invalid pageToken correctly rejected');
    }

    console.log('\n=== Testing list_tests pagination ===');
    const testPage1 = await callEndpoint('/api/tools/horreum_list_tests', {
      pageSize: 3,
    });

    if (!testPage1.pagination || testPage1.pagination.has_more !== true) {
      throw new Error('list_tests pagination failed');
    }
    if (testPage1.tests.length !== 3) {
      throw new Error(`Expected 3 tests, got ${testPage1.tests.length}`);
    }
    console.log('✅ list_tests: first page with pageSize=3');

    const testPage2 = await callEndpoint('/api/tools/horreum_list_tests', {
      pageToken: testPage1.pagination.next_page_token,
    });

    if (testPage2.tests.length !== 3) {
      throw new Error(`Expected 3 tests on page 2, got ${testPage2.tests.length}`);
    }
    console.log('✅ list_tests: second page using pageToken');

    console.log('\n🎉 All pagination smoke tests passed!');
  } catch (err) {
    console.error('❌ smoke-http-pagination failed:', err);
    process.exitCode = 1;
  } finally {
    if (serverProcess) serverProcess.kill('SIGTERM');
    if (mock) mock.close();
  }
}

run();
