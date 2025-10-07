#!/usr/bin/env node
/**
 * Smoke tests for Phase 6.7 run and dataset endpoints:
 * - POST /api/tools/horreum_get_run_data
 * - POST /api/tools/horreum_get_run_metadata
 * - POST /api/tools/horreum_get_run_summary
 * - POST /api/tools/horreum_list_runs_by_schema
 * - POST /api/tools/horreum_get_run_count
 * - POST /api/tools/horreum_list_all_runs
 * - POST /api/tools/horreum_get_dataset_summary
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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(body),
    });
    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await response.json()
      : { rawText: await response.text() };
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
  log('INFO', `Horreum MCP Phase 6.7 Endpoints Smoke Test`);
  log('INFO', `Base URL: ${BASE_URL}`);
  log('INFO', '');

  const results = [];

  // Adjust IDs/URIs as needed for your environment
  const sampleRunId = 12345;
  const sampleTestId = 262;
  const sampleDatasetId = 98765;
  const sampleSchemaUri = 'urn:example-schema:1.0';

  results.push(
    await testEndpoint(
      'horreum_get_run_data',
      `${BASE_URL}/api/tools/horreum_get_run_data`,
      {
        run_id: sampleRunId,
      }
    )
  );

  results.push(
    await testEndpoint(
      'horreum_get_run_metadata',
      `${BASE_URL}/api/tools/horreum_get_run_metadata`,
      {
        run_id: sampleRunId,
      }
    )
  );

  results.push(
    await testEndpoint(
      'horreum_get_run_summary',
      `${BASE_URL}/api/tools/horreum_get_run_summary`,
      {
        run_id: sampleRunId,
      }
    )
  );

  results.push(
    await testEndpoint(
      'horreum_list_runs_by_schema',
      `${BASE_URL}/api/tools/horreum_list_runs_by_schema`,
      {
        schema_uri: sampleSchemaUri,
        limit: 5,
        page: 1,
      }
    )
  );

  results.push(
    await testEndpoint(
      'horreum_get_run_count',
      `${BASE_URL}/api/tools/horreum_get_run_count`,
      {
        test_id: sampleTestId,
      }
    )
  );

  results.push(
    await testEndpoint(
      'horreum_list_all_runs (no time)',
      `${BASE_URL}/api/tools/horreum_list_all_runs`,
      {
        limit: 5,
        page: 1,
      }
    )
  );

  results.push(
    await testEndpoint(
      'horreum_list_all_runs (time filtered)',
      `${BASE_URL}/api/tools/horreum_list_all_runs`,
      {
        from: 'last week',
        to: 'now',
        limit: 5,
        page: 1,
      }
    )
  );

  results.push(
    await testEndpoint(
      'horreum_get_dataset_summary',
      `${BASE_URL}/api/tools/horreum_get_dataset_summary`,
      {
        dataset_id: sampleDatasetId,
      }
    )
  );

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
