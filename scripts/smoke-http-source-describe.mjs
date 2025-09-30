#!/usr/bin/env node
/**
 * Smoke test: source.describe capability discovery endpoint
 */
import { execa } from 'execa';
import { fileURLToPath } from 'url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const serverEntry = path.join(projectRoot, 'build', 'index.js');

const MCP_PORT = 3005;
const AUTH_TOKEN = 'test-token';
const HORREUM_BASE = `http://127.0.0.1:18090`;

async function run() {
  let serverProcess;
  try {
    console.log('Starting Horreum MCP (HTTP mode)...');
    serverProcess = execa('node', [serverEntry], {
      env: {
        HTTP_MODE_ENABLED: 'true',
        HTTP_PORT: String(MCP_PORT),
        HTTP_AUTH_TOKEN: AUTH_TOKEN,
        HORREUM_BASE_URL: HORREUM_BASE,
        HORREUM_RATE_LIMIT: '100',
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

    console.log('\n=== Testing POST /api/tools/source.describe ===');
    const { stdout } = await execa('curl', [
      '-sS',
      '-X',
      'POST',
      `http://127.0.0.1:${MCP_PORT}/api/tools/source.describe`,
      '-H',
      'Content-Type: application/json',
      '-H',
      `Authorization: Bearer ${AUTH_TOKEN}`,
      '-d',
      '{}',
    ]);

    const response = JSON.parse(stdout);
    console.log('Response:', JSON.stringify(response, null, 2));

    // Validate response structure
    if (response.sourceType !== 'horreum') {
      throw new Error(`Expected sourceType=horreum, got ${response.sourceType}`);
    }
    if (!response.version) {
      throw new Error('Missing version field');
    }
    if (!response.contractVersion) {
      throw new Error('Missing contractVersion field');
    }
    if (!response.capabilities || typeof response.capabilities !== 'object') {
      throw new Error('Missing or invalid capabilities object');
    }
    if (response.capabilities.pagination !== true) {
      throw new Error('Expected pagination=true');
    }
    if (response.capabilities.schemas !== true) {
      throw new Error('Expected schemas=true');
    }
    if (!response.limits || typeof response.limits !== 'object') {
      throw new Error('Missing or invalid limits object');
    }
    if (typeof response.limits.maxPageSize !== 'number') {
      throw new Error('Expected maxPageSize to be a number');
    }
    if (response.limits.rateLimitPerMinute !== 100) {
      throw new Error(
        `Expected rateLimitPerMinute=100, got ${response.limits.rateLimitPerMinute}`
      );
    }

    console.log('✅ source.describe endpoint validation passed');
    console.log('✅ All capabilities and limits present');
    console.log('\n🎉 source.describe smoke test passed!');
  } catch (err) {
    console.error('❌ smoke-http-source-describe failed:', err);
    process.exitCode = 1;
  } finally {
    if (serverProcess) serverProcess.kill('SIGTERM');
  }
}

run();
