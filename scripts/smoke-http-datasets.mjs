#!/usr/bin/env node
/**
 * Smoke test for Dataset HTTP API endpoints:
 * - POST /api/tools/horreum_list_datasets
 * - POST /api/tools/horreum_get_dataset
 *
 * Usage:
 *   node scripts/smoke-http-datasets.mjs [BASE_URL] [TOKEN]
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
  log('INFO', `Horreum MCP Dataset Endpoints Smoke Test`);
  log('INFO', `Base URL: ${BASE_URL}`);
  log('INFO', '');

  const results = [];

  // Test 1: List datasets by test ID
  results.push(
    await testEndpoint(
      'horreum_list_datasets (by test_id)',
      `${BASE_URL}/api/tools/horreum_list_datasets`,
      {
        test_id: 262,
        page_size: 5,
      }
    )
  );

  // Test 2: List datasets by test name
  results.push(
    await testEndpoint(
      'horreum_list_datasets (by test_name)',
      `${BASE_URL}/api/tools/horreum_list_datasets`,
      {
        test_name: 'boot-time-verbose',
        page_size: 5,
      }
    )
  );

  // Test 3: List datasets by schema URI
  results.push(
    await testEndpoint(
      'horreum_list_datasets (by schema_uri)',
      `${BASE_URL}/api/tools/horreum_list_datasets`,
      {
        schema_uri: 'urn:rhivos-boot-time:1.0',
        page_size: 5,
      }
    )
  );

  // Test 4: List datasets with time filter
  results.push(
    await testEndpoint(
      'horreum_list_datasets (with time filter)',
      `${BASE_URL}/api/tools/horreum_list_datasets`,
      {
        test_id: 262,
        from: '2025-09-23T00:00:00Z',
        to: '2025-09-30T23:59:59Z',
        page_size: 5,
      }
    )
  );

  // Test 5: List datasets - missing filter (should fail)
  results.push(
    await testEndpoint(
      'horreum_list_datasets (missing filter - should fail)',
      `${BASE_URL}/api/tools/horreum_list_datasets`,
      {
        page_size: 5,
      },
      400 // Expect 400 Bad Request
    )
  );

  // Test 6: Get specific dataset
  results.push(
    await testEndpoint(
      'horreum_get_dataset',
      `${BASE_URL}/api/tools/horreum_get_dataset`,
      {
        dataset_id: 12345,
      }
    )
  );

  // Test 7: Get dataset - invalid ID (should fail)
  results.push(
    await testEndpoint(
      'horreum_get_dataset (invalid ID - should fail)',
      `${BASE_URL}/api/tools/horreum_get_dataset`,
      {
        dataset_id: 'not-a-number',
      },
      400 // Expect 400 Bad Request
    )
  );

  // Test 8: Get dataset - missing ID (should fail)
  results.push(
    await testEndpoint(
      'horreum_get_dataset (missing ID - should fail)',
      `${BASE_URL}/api/tools/horreum_get_dataset`,
      {},
      400 // Expect 400 Bad Request
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
