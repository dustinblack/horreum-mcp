#!/usr/bin/env node
/**
 * Smoke test for Run Label Values HTTP API endpoint:
 * - POST /api/tools/horreum_get_run_label_values
 *
 * Usage:
 *   node scripts/smoke-get-run-label-values.mjs [BASE_URL] [TOKEN]
 */

const BASE_URL = process.argv[2] || 'http://localhost:3001';
const TOKEN = process.argv[3] || 'example-horreum-mcp-token-67890';

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(level, message) {
  const color = {
    INFO: COLORS.blue,
    PASS: COLORS.green,
    FAIL: COLORS.red,
    WARN: COLORS.yellow,
  }[level];
  console.log(`${color}[${level}]${COLORS.reset} ${message}`);
}

async function testEndpoint(name, url, body, expectedStatus = 200) {
  log('INFO', `Testing ${name}...`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = { rawText: await response.text() };
    }

    if (response.status !== expectedStatus) {
      log(
        'FAIL',
        `${name} - Expected status ${expectedStatus}, got ${response.status}`
      );
      console.log('Response:', JSON.stringify(data, null, 2));
      return false;
    }

    log('PASS', `${name} - Status ${response.status} ✓`);
    console.log('Response preview:', JSON.stringify(data, null, 2).slice(0, 500));
    return true;
  } catch (err) {
    log('FAIL', `${name} - Error: ${err.message}`);
    return false;
  }
}

async function main() {
  log('INFO', `Horreum MCP Run Label Values Endpoint Smoke Test`);
  log('INFO', `Base URL: ${BASE_URL}`);
  log('INFO', '');

  const results = [];

  // Test 1: Get run label values with basic params
  results.push(
    await testEndpoint(
      'horreum_get_run_label_values (basic)',
      `${BASE_URL}/api/tools/horreum_get_run_label_values`,
      {
        run_id: 12345,
        limit: 10,
        page: 1,
      }
    )
  );

  // Test 2: Include/exclude filters
  results.push(
    await testEndpoint(
      'horreum_get_run_label_values (include/exclude)',
      `${BASE_URL}/api/tools/horreum_get_run_label_values`,
      {
        run_id: 12345,
        include: ['boot_time_ms', 'kernel_version'],
        exclude: ['debug_info'],
        multiFilter: true,
      }
    )
  );

  // Test 3: Invalid run_id (should fail)
  results.push(
    await testEndpoint(
      'horreum_get_run_label_values (invalid run_id - should fail)',
      `${BASE_URL}/api/tools/horreum_get_run_label_values`,
      {
        run_id: 'not-a-number',
      },
      400
    )
  );

  // Summary
  log('INFO', '');
  const passed = results.filter(Boolean).length;
  const total = results.length;
  const success = passed === total;

  if (success) {
    log('PASS', `All tests passed (${passed}/${total}) ✓`);
  } else {
    log('FAIL', `Some tests failed (${passed}/${total})`);
  }

  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  log('FAIL', `Unhandled error: ${err.message}`);
  process.exit(1);
});
