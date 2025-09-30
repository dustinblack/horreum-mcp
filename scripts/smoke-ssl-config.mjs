#!/usr/bin/env node
/**
 * Smoke test for SSL/TLS configuration
 *
 * Tests that HORREUM_TLS_VERIFY environment variable correctly
 * controls SSL certificate verification.
 */

import { z } from 'zod';

console.log('🔧 SSL/TLS Configuration Smoke Test\n');

const EnvSchema = z.object({
  HORREUM_TLS_VERIFY: z
    .string()
    .optional()
    .default('true')
    .transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === '') {
        return false;
      }
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return true;
      }
      throw new Error(
        `HORREUM_TLS_VERIFY must be 'true' or 'false' (or 1/0, yes/no), got: ${val}`
      );
    }),
});

function testCase(name, envValue, expectedBoolValue, expectedNodeEnv) {
  try {
    // Set the environment variable
    if (envValue === undefined) {
      delete process.env.HORREUM_TLS_VERIFY;
    } else {
      process.env.HORREUM_TLS_VERIFY = envValue;
    }

    // Parse using the schema
    const env = EnvSchema.parse(process.env);

    // Apply the configuration logic from src/index.ts
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    if (!env.HORREUM_TLS_VERIFY) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    // Verify expectations
    const boolMatch = env.HORREUM_TLS_VERIFY === expectedBoolValue;
    const nodeEnvMatch = process.env.NODE_TLS_REJECT_UNAUTHORIZED === expectedNodeEnv;

    if (boolMatch && nodeEnvMatch) {
      console.log(
        `✅ ${name}: HORREUM_TLS_VERIFY=${env.HORREUM_TLS_VERIFY}, NODE_TLS_REJECT_UNAUTHORIZED=${process.env.NODE_TLS_REJECT_UNAUTHORIZED ?? 'undefined'}`
      );
      return true;
    } else {
      console.error(
        `❌ ${name}: Expected bool=${expectedBoolValue}, nodeEnv=${expectedNodeEnv}, ` +
          `got bool=${env.HORREUM_TLS_VERIFY}, nodeEnv=${process.env.NODE_TLS_REJECT_UNAUTHORIZED ?? 'undefined'}`
      );
      return false;
    }
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    return false;
  }
}

let passed = 0;
let failed = 0;

// Test cases: (name, envValue, expectedBoolValue, expectedNodeEnv)
const tests = [
  ['Default (unset)', undefined, true, undefined],
  ['Explicit "true"', 'true', true, undefined],
  ['String "false"', 'false', false, '0'],
  ['Number "0"', '0', false, '0'],
  ['Number "1"', '1', true, undefined],
  ['String "no"', 'no', false, '0'],
  ['String "yes"', 'yes', true, undefined],
  ['Case insensitive "FALSE"', 'FALSE', false, '0'],
  ['Case insensitive "TRUE"', 'TRUE', true, undefined],
  ['Empty string', '', false, '0'],
];

for (const [name, envValue, expectedBoolValue, expectedNodeEnv] of tests) {
  if (testCase(name, envValue, expectedBoolValue, expectedNodeEnv)) {
    passed++;
  } else {
    failed++;
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\n✅ All SSL/TLS configuration tests passed!');
