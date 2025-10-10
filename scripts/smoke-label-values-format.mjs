#!/usr/bin/env node
/**
 * Smoke test for Label Values Source MCP Contract format compliance
 *
 * Validates that label values endpoints return the correct format:
 * - values: Array<{name, value}> (not Record<string, any>)
 * - run_id: string (not runId: number)
 * - dataset_id: string (not datasetId: number)
 * - start/stop: ISO 8601 datetime strings (not epoch millis numbers)
 *
 * Usage:
 *   node scripts/smoke-label-values-format.mjs [RUN_ID]
 *
 * Example:
 *   node scripts/smoke-label-values-format.mjs 120214
 */

import 'dotenv/config';

const RUN_ID = process.argv[2] || '120214';
const HORREUM_BASE_URL =
  process.env.HORREUM_BASE_URL || 'https://horreum.corp.redhat.com';
const HORREUM_TOKEN = process.env.HORREUM_TOKEN || '';

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

/**
 * Validate that a label values response matches Source MCP Contract format
 */
function validateFormat(data) {
  const errors = [];

  if (!Array.isArray(data)) {
    errors.push('Response must be an array');
    return errors;
  }

  if (data.length === 0) {
    log('WARN', 'Response array is empty - cannot validate format');
    return errors;
  }

  const item = data[0];

  // Check values field
  if (!item.values) {
    errors.push('Missing "values" field');
  } else if (!Array.isArray(item.values)) {
    errors.push(
      `"values" must be an array, got ${typeof item.values}: ${JSON.stringify(item.values).slice(0, 100)}`
    );
  } else if (item.values.length > 0) {
    const firstValue = item.values[0];
    if (!firstValue.name || firstValue.value === undefined) {
      errors.push(
        `"values" array items must have {name, value} structure, got: ${JSON.stringify(firstValue)}`
      );
    }
  }

  // Check run_id field (should be string, not runId number)
  if (item.runId !== undefined) {
    errors.push(
      `Found "runId" field (should be "run_id" in snake_case): ${item.runId}`
    );
  }
  if (item.run_id !== undefined && typeof item.run_id !== 'string') {
    errors.push(`"run_id" must be a string, got ${typeof item.run_id}`);
  }

  // Check dataset_id field (should be string, not datasetId number)
  if (item.datasetId !== undefined) {
    errors.push(
      `Found "datasetId" field (should be "dataset_id" in snake_case): ${item.datasetId}`
    );
  }
  if (item.dataset_id !== undefined && typeof item.dataset_id !== 'string') {
    errors.push(`"dataset_id" must be a string, got ${typeof item.dataset_id}`);
  }

  // Check start/stop timestamps (should be ISO 8601 strings)
  if (!item.start) {
    errors.push('Missing "start" field');
  } else {
    if (typeof item.start !== 'string') {
      errors.push(`"start" must be a string, got ${typeof item.start}: ${item.start}`);
    } else if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(item.start)) {
      errors.push(`"start" must be ISO 8601 format, got: ${item.start}`);
    }
  }

  if (!item.stop) {
    errors.push('Missing "stop" field');
  } else {
    if (typeof item.stop !== 'string') {
      errors.push(`"stop" must be a string, got ${typeof item.stop}: ${item.stop}`);
    } else if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(item.stop)) {
      errors.push(`"stop" must be ISO 8601 format, got: ${item.stop}`);
    }
  }

  return errors;
}

async function testDirectHorreumAPI() {
  log('INFO', `Testing direct Horreum API for run ${RUN_ID}...`);

  try {
    const url = `${HORREUM_BASE_URL}/api/run/${RUN_ID}/labelValues`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${HORREUM_TOKEN}`,
      },
    });

    if (!response.ok) {
      log('FAIL', `Horreum API returned ${response.status}`);
      return false;
    }

    const data = await response.json();
    log('INFO', `Horreum native format (first item):`);
    console.log(JSON.stringify(data[0], null, 2).slice(0, 500));

    // Verify native format has the old structure
    if (data[0]?.runId === undefined) {
      log('WARN', 'Horreum API response missing runId - may not be correct test data');
    }
    if (data[0]?.values && Array.isArray(data[0].values)) {
      log(
        'WARN',
        'Horreum API already returns values as array - format may have changed!'
      );
    }

    log('PASS', 'Direct Horreum API test completed ✓');
    return true;
  } catch (err) {
    log('FAIL', `Error testing direct Horreum API: ${err.message}`);
    return false;
  }
}

async function testTransformedAPI() {
  log('INFO', `Testing transformed API via MCP HTTP endpoint...`);

  const BASE_URL = process.env.MCP_BASE_URL || 'http://localhost:3001';
  const TOKEN = process.env.MCP_TOKEN || 'example-horreum-mcp-token-67890';

  try {
    const url = `${BASE_URL}/api/tools/horreum_get_run_label_values`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        run_id: parseInt(RUN_ID, 10),
      }),
    });

    if (!response.ok) {
      log('FAIL', `MCP API returned ${response.status}`);
      const text = await response.text();
      console.log('Response:', text.slice(0, 500));
      return false;
    }

    const data = await response.json();
    log('INFO', `Transformed format (first item):`);
    console.log(JSON.stringify(data[0], null, 2).slice(0, 500));

    const errors = validateFormat(data);
    if (errors.length > 0) {
      log('FAIL', 'Format validation failed:');
      errors.forEach((err) => console.log(`  - ${err}`));
      return false;
    }

    log('PASS', 'Transformed API format is correct ✓');
    return true;
  } catch (err) {
    log('FAIL', `Error testing transformed API: ${err.message}`);
    return false;
  }
}

async function main() {
  log('INFO', '🧪 Label Values Source MCP Contract Format Compliance Test\n');
  log('INFO', `Base URL: ${HORREUM_BASE_URL}`);
  log('INFO', `Run ID: ${RUN_ID}\n`);

  const results = [];

  // Test 1: Direct Horreum API (for comparison)
  results.push(await testDirectHorreumAPI());
  console.log('');

  // Test 2: Transformed API
  results.push(await testTransformedAPI());
  console.log('');

  // Summary
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
  console.error(err);
  process.exit(1);
});
