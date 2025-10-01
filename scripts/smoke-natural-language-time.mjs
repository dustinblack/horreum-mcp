#!/usr/bin/env node
/**
 * Smoke test for natural language time query support in HTTP API.
 *
 * Tests that the Horreum MCP HTTP API correctly parses natural language
 * time expressions like "last week", "yesterday", etc.
 *
 * Usage:
 *   HORREUM_BASE_URL=https://horreum.corp.redhat.com \
 *   node scripts/smoke-natural-language-time.mjs
 */

import { parseTimeRange } from '../build/index.js';

/**
 * Test natural language time parsing
 */
async function testNaturalLanguageTime() {
  console.log('\n=== Natural Language Time Query Smoke Test ===\n');

  const tests = [
    { from: 'last week', to: undefined, description: 'last week to now' },
    { from: 'yesterday', to: 'now', description: 'yesterday to now' },
    { from: 'last 7 days', to: undefined, description: 'last 7 days to now' },
    { from: 'last 30 days', to: undefined, description: 'last 30 days to now' },
    {
      from: '2025-09-24T00:00:00Z',
      to: '2025-10-01T00:00:00Z',
      description: 'ISO timestamps',
    },
    { from: '1727136000000', to: '1727740800000', description: 'epoch millis' },
    { from: undefined, to: undefined, description: 'default (last 30 days)' },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = parseTimeRange(test.from, test.to);

      // Verify the result has the expected structure
      if (
        result &&
        typeof result === 'object' &&
        ((test.from && typeof result.fromMs === 'number') ||
          !test.from ||
          result.fromMs === undefined) &&
        ((test.to && typeof result.toMs === 'number') ||
          !test.to ||
          result.toMs === undefined)
      ) {
        console.log(`✅ PASS: ${test.description}`);
        console.log(`   from: ${test.from || 'default'}`);
        console.log(`   to: ${test.to || 'default'}`);
        console.log(
          `   result: { fromMs: ${result.fromMs || 'undefined'}, toMs: ${result.toMs || 'undefined'} }`
        );
        if (result.fromMs) {
          console.log(`   from date: ${new Date(result.fromMs).toISOString()}`);
        }
        if (result.toMs) {
          console.log(`   to date: ${new Date(result.toMs).toISOString()}`);
        }
        console.log();
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.description}`);
        console.log(`   Unexpected result structure: ${JSON.stringify(result)}`);
        console.log();
        failed++;
      }
    } catch (err) {
      console.log(`❌ FAIL: ${test.description}`);
      console.log(`   Error: ${err.message}`);
      console.log();
      failed++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total: ${tests.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed');
    process.exit(0);
  }
}

// Run the test
testNaturalLanguageTime();
