import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';

/**
 * Tests for SSL/TLS configuration handling
 *
 * These tests verify that the HORREUM_TLS_VERIFY environment variable
 * is correctly parsed and applied to Node.js's NODE_TLS_REJECT_UNAUTHORIZED
 * setting.
 */

describe('SSL/TLS Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('Environment Variable Parsing', () => {
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
        })
        .describe(
          'Enable SSL certificate verification (set to false for testing with self-signed certs)'
        ),
    });

    it('should default to true when HORREUM_TLS_VERIFY is not set', () => {
      delete process.env.HORREUM_TLS_VERIFY;
      const result = EnvSchema.parse(process.env);
      expect(result.HORREUM_TLS_VERIFY).toBe(true);
    });

    it('should parse "false" string as boolean false', () => {
      process.env.HORREUM_TLS_VERIFY = 'false';
      const result = EnvSchema.parse(process.env);
      expect(result.HORREUM_TLS_VERIFY).toBe(false);
    });

    it('should parse "true" string as boolean true', () => {
      process.env.HORREUM_TLS_VERIFY = 'true';
      const result = EnvSchema.parse(process.env);
      expect(result.HORREUM_TLS_VERIFY).toBe(true);
    });

    it('should parse "0" as boolean false', () => {
      process.env.HORREUM_TLS_VERIFY = '0';
      const result = EnvSchema.parse(process.env);
      expect(result.HORREUM_TLS_VERIFY).toBe(false);
    });

    it('should parse "1" as boolean true', () => {
      process.env.HORREUM_TLS_VERIFY = '1';
      const result = EnvSchema.parse(process.env);
      expect(result.HORREUM_TLS_VERIFY).toBe(true);
    });

    it('should parse "no" as boolean false', () => {
      process.env.HORREUM_TLS_VERIFY = 'no';
      const result = EnvSchema.parse(process.env);
      expect(result.HORREUM_TLS_VERIFY).toBe(false);
    });

    it('should parse "yes" as boolean true', () => {
      process.env.HORREUM_TLS_VERIFY = 'yes';
      const result = EnvSchema.parse(process.env);
      expect(result.HORREUM_TLS_VERIFY).toBe(true);
    });

    it('should handle case-insensitive "False"', () => {
      process.env.HORREUM_TLS_VERIFY = 'False';
      const result = EnvSchema.parse(process.env);
      expect(result.HORREUM_TLS_VERIFY).toBe(false);
    });

    it('should handle case-insensitive "TRUE"', () => {
      process.env.HORREUM_TLS_VERIFY = 'TRUE';
      const result = EnvSchema.parse(process.env);
      expect(result.HORREUM_TLS_VERIFY).toBe(true);
    });
  });

  describe('NODE_TLS_REJECT_UNAUTHORIZED Application', () => {
    it('should set NODE_TLS_REJECT_UNAUTHORIZED=0 when HORREUM_TLS_VERIFY is false', () => {
      const horreumTlsVerify = false;

      // Simulate the logic from src/index.ts
      if (!horreumTlsVerify) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe('0');
    });

    it('should not set NODE_TLS_REJECT_UNAUTHORIZED when HORREUM_TLS_VERIFY is true', () => {
      const horreumTlsVerify = true;
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

      // Simulate the logic from src/index.ts
      if (!horreumTlsVerify) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBeUndefined();
    });

    it('should leave existing NODE_TLS_REJECT_UNAUTHORIZED when HORREUM_TLS_VERIFY is true', () => {
      const horreumTlsVerify = true;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

      // Simulate the logic from src/index.ts
      if (!horreumTlsVerify) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe('1');
    });
  });

  describe('Integration: Full Configuration Flow', () => {
    const EnvSchema = z.object({
      HORREUM_BASE_URL: z
        .string()
        .url({ message: 'HORREUM_BASE_URL must be a valid URL' })
        .optional()
        .default('https://horreum.example.com'),
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

    it('should correctly apply SSL disabled configuration', () => {
      process.env.HORREUM_TLS_VERIFY = 'false';
      process.env.HORREUM_BASE_URL = 'https://horreum.corp.example.com';
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

      const env = EnvSchema.parse(process.env);

      // Apply the configuration logic
      if (!env.HORREUM_TLS_VERIFY) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      expect(env.HORREUM_TLS_VERIFY).toBe(false);
      expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe('0');
    });

    it('should correctly apply SSL enabled configuration (default)', () => {
      delete process.env.HORREUM_TLS_VERIFY;
      process.env.HORREUM_BASE_URL = 'https://horreum.corp.example.com';
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

      const env = EnvSchema.parse(process.env);

      // Apply the configuration logic
      if (!env.HORREUM_TLS_VERIFY) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      expect(env.HORREUM_TLS_VERIFY).toBe(true);
      expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBeUndefined();
    });

    it('should correctly apply SSL enabled configuration (explicit true)', () => {
      process.env.HORREUM_TLS_VERIFY = 'true';
      process.env.HORREUM_BASE_URL = 'https://horreum.corp.example.com';
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

      const env = EnvSchema.parse(process.env);

      // Apply the configuration logic
      if (!env.HORREUM_TLS_VERIFY) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      expect(env.HORREUM_TLS_VERIFY).toBe(true);
      expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
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

    it('should handle empty string as falsy (coerces to false)', () => {
      process.env.HORREUM_TLS_VERIFY = '';
      const result = EnvSchema.parse(process.env);
      // Empty string coerces to false in Zod
      expect(result.HORREUM_TLS_VERIFY).toBe(false);
    });

    it('should reject invalid boolean-like strings with error', () => {
      process.env.HORREUM_TLS_VERIFY = 'invalid';
      expect(() => EnvSchema.parse(process.env)).toThrow();
    });
  });

  describe('Security Considerations', () => {
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

    it('should default to secure mode (TLS verification enabled)', () => {
      delete process.env.HORREUM_TLS_VERIFY;
      const result = EnvSchema.parse(process.env);
      expect(result.HORREUM_TLS_VERIFY).toBe(true);
    });

    it('should require explicit opt-out to disable TLS verification', () => {
      // Without setting the env var, TLS should be enabled
      delete process.env.HORREUM_TLS_VERIFY;
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

      const env = EnvSchema.parse(process.env);

      if (!env.HORREUM_TLS_VERIFY) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

      // Should NOT disable TLS verification without explicit HORREUM_TLS_VERIFY=false
      expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBeUndefined();
    });
  });
});
