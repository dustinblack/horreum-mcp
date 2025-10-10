#!/usr/bin/env node
/**
 * Smoke test for source.describe Source MCP Contract format compliance
 */

import * as dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.HTTP_BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.HORREUM_TOKEN;

const log = (level, msg, data = {}) => {
  const ts = new Date().toISOString();
  const meta = Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '';
  console.log(`[${ts}] ${level.toUpperCase()}: ${msg}${meta}`);
};

/**
 * Validate that source.describe response matches Source MCP Contract format
 */
function validateSourceDescribe(data) {
  const errors = [];

  // Required fields with snake_case
  if (!data.source_type) {
    errors.push('Missing or incorrect field: source_type (not sourceType)');
  }
  if (!data.version) {
    errors.push('Missing field: version');
  }
  if (!data.contract_version) {
    errors.push('Missing or incorrect field: contract_version (not contractVersion)');
  }
  if (!data.capabilities) {
    errors.push('Missing field: capabilities');
  } else {
    // Capabilities sub-fields
    if (typeof data.capabilities.pagination !== 'boolean') {
      errors.push('capabilities.pagination must be boolean');
    }
    if (typeof data.capabilities.caching !== 'boolean') {
      errors.push('capabilities.caching must be boolean');
    }
  }

  // Limits field (optional, but if present must use snake_case)
  if (data.limits) {
    if (data.limits.maxPageSize !== undefined) {
      errors.push('limits uses camelCase: maxPageSize should be max_page_size');
    }
    if (data.limits.maxDatasetSize !== undefined) {
      errors.push('limits uses camelCase: maxDatasetSize should be max_dataset_size');
    }
    if (data.limits.rateLimitPerMinute !== undefined) {
      errors.push(
        'limits uses camelCase: rateLimitPerMinute should be rate_limit_per_minute'
      );
    }

    if (
      data.limits.max_page_size === undefined &&
      data.limits.max_dataset_size === undefined &&
      data.limits.rate_limit_per_minute === undefined
    ) {
      errors.push('limits present but no snake_case fields found');
    }
  }

  // Check for disallowed camelCase fields
  if (data.sourceType !== undefined) {
    errors.push('Found camelCase field: sourceType (should be source_type)');
  }
  if (data.contractVersion !== undefined) {
    errors.push('Found camelCase field: contractVersion (should be contract_version)');
  }

  return errors;
}

async function main() {
  log('info', '🧪 source.describe Source MCP Contract Format Compliance Test\n');

  if (!TOKEN) {
    log('error', '❌ HORREUM_TOKEN not set in environment');
    process.exit(1);
  }

  try {
    // Call source.describe endpoint
    log('info', 'Calling POST /api/tools/source.describe...');
    const response = await fetch(`${BASE_URL}/api/tools/source.describe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      log(
        'error',
        `❌ HTTP ${response.status} ${response.statusText}`,
        await response.text()
      );
      process.exit(1);
    }

    const data = await response.json();

    log('info', '\n📄 Response received:');
    console.log(JSON.stringify(data, null, 2));

    // Validate format
    log('info', '\n🔍 Validating Source MCP Contract compliance...');
    const errors = validateSourceDescribe(data);

    if (errors.length > 0) {
      log('error', '\n❌ Contract validation FAILED:');
      errors.forEach((err) => log('error', `  - ${err}`));
      process.exit(1);
    }

    log('info', '\n✅ All validation checks passed!');
    log('info', '\n📋 Summary:');
    log('info', `  source_type: ${data.source_type}`);
    log('info', `  version: ${data.version}`);
    log('info', `  contract_version: ${data.contract_version}`);
    log('info', `  capabilities.pagination: ${data.capabilities.pagination}`);
    log('info', `  capabilities.caching: ${data.capabilities.caching}`);
    log('info', `  capabilities.streaming: ${data.capabilities.streaming}`);
    log('info', `  capabilities.schemas: ${data.capabilities.schemas}`);
    if (data.limits) {
      log('info', `  limits.max_page_size: ${data.limits.max_page_size}`);
      log('info', `  limits.max_dataset_size: ${data.limits.max_dataset_size}`);
      log(
        'info',
        `  limits.rate_limit_per_minute: ${data.limits.rate_limit_per_minute}`
      );
    }

    log('info', '\n✅ source.describe is fully compliant with Source MCP Contract');
    process.exit(0);
  } catch (err) {
    log('error', '❌ Test failed with exception:', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
}

main();
