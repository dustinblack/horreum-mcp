import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseTimeString, parseTimeRange, formatTimeRange } from '../utils/time.js';

describe('Time Parsing Utility', () => {
  beforeEach(() => {
    // Mock current time to make tests deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseTimeString', () => {
    it('should parse epoch milliseconds', () => {
      const result = parseTimeString('1727136000000', 'from');
      expect(result.getTime()).toBe(1727136000000);
    });

    it('should parse ISO 8601 timestamps', () => {
      const result = parseTimeString('2025-09-24T00:00:00Z', 'from');
      expect(result.toISOString()).toBe('2025-09-24T00:00:00.000Z');
    });

    it('should parse simple dates', () => {
      const result = parseTimeString('2025-09-24', 'from');
      // Note: Date.parse may interpret this as UTC or local time depending on format
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(8); // September (0-indexed)
      expect(result.getDate()).toBe(24);
    });

    it('should parse "yesterday" relative to current time', () => {
      // Current mock time: 2025-10-01T12:00:00Z
      const result = parseTimeString('yesterday', 'from');
      // Should be roughly 2025-09-30
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(8); // September (0-indexed)
      expect(result.getDate()).toBe(30);
    });

    it('should parse "last week"', () => {
      // Current mock time: 2025-10-01T12:00:00Z
      const result = parseTimeString('last week', 'from');
      // Should be roughly 7 days ago: 2025-09-24
      const daysDiff = Math.floor(
        (Date.now() - result.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBeGreaterThanOrEqual(6);
      expect(daysDiff).toBeLessThanOrEqual(8);
    });

    it('should parse "last 7 days"', () => {
      const result = parseTimeString('last 7 days', 'from');
      const daysDiff = Math.floor(
        (Date.now() - result.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBeGreaterThanOrEqual(6);
      expect(daysDiff).toBeLessThanOrEqual(8);
    });

    it('should parse "last 30 days"', () => {
      const result = parseTimeString('last 30 days', 'from');
      const daysDiff = Math.floor(
        (Date.now() - result.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBeGreaterThanOrEqual(29);
      expect(daysDiff).toBeLessThanOrEqual(31);
    });

    it('should parse "now"', () => {
      const result = parseTimeString('now', 'to');
      // Should be very close to current time
      const diffMs = Math.abs(Date.now() - result.getTime());
      expect(diffMs).toBeLessThan(1000); // Within 1 second
    });

    it('should parse "today"', () => {
      const result = parseTimeString('today', 'from');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(9); // October (0-indexed)
      expect(result.getDate()).toBe(1);
    });

    it('should parse "last month"', () => {
      const result = parseTimeString('last month', 'from');
      // Should be approximately 30 days ago
      const daysDiff = Math.floor(
        (Date.now() - result.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBeGreaterThanOrEqual(25);
      expect(daysDiff).toBeLessThanOrEqual(35);
    });

    it('should throw error for invalid time strings', () => {
      expect(() => parseTimeString('invalid-time', 'from')).toThrow();
      expect(() => parseTimeString('not a date at all', 'from')).toThrow();
    });

    it('should include field name in error message', () => {
      try {
        parseTimeString('invalid', 'from');
        expect.fail('Should have thrown error');
      } catch (err) {
        expect((err as Error).message).toContain('from');
      }
    });
  });

  describe('parseTimeRange', () => {
    it('should apply "last 30 days" default when no params specified', () => {
      const { fromMs, toMs } = parseTimeRange(undefined, undefined);
      expect(fromMs).toBeDefined();
      expect(toMs).toBeDefined();

      const daysDiff = Math.floor(
        ((toMs as number) - (fromMs as number)) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(30);

      // toMs should be approximately now
      expect(Math.abs(Date.now() - (toMs as number))).toBeLessThan(1000);
    });

    it('should parse both from and to when specified', () => {
      const { fromMs, toMs } = parseTimeRange('2025-09-24', '2025-10-01');
      expect(fromMs).toBeDefined();
      expect(toMs).toBeDefined();

      const from = new Date(fromMs as number);
      const to = new Date(toMs as number);

      expect(from.getFullYear()).toBe(2025);
      expect(from.getMonth()).toBe(8); // September
      expect(from.getDate()).toBe(24);

      expect(to.getFullYear()).toBe(2025);
      expect(to.getMonth()).toBe(9); // October
      expect(to.getDate()).toBe(1);
    });

    it('should default "to" to now when only "from" is specified', () => {
      const { fromMs, toMs } = parseTimeRange('last week', undefined);
      expect(fromMs).toBeDefined();
      expect(toMs).toBeDefined();

      // toMs should be approximately now
      expect(Math.abs(Date.now() - (toMs as number))).toBeLessThan(1000);

      // fromMs should be roughly 7 days ago
      const daysDiff = Math.floor(
        ((toMs as number) - (fromMs as number)) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBeGreaterThanOrEqual(6);
      expect(daysDiff).toBeLessThanOrEqual(8);
    });

    it('should allow "to" without "from"', () => {
      const { fromMs, toMs } = parseTimeRange(undefined, 'yesterday');
      expect(fromMs).toBeUndefined();
      expect(toMs).toBeDefined();

      const to = new Date(toMs as number);
      expect(to.getFullYear()).toBe(2025);
      expect(to.getMonth()).toBe(8); // September
      expect(to.getDate()).toBe(30);
    });

    it('should parse natural language for both params', () => {
      const { fromMs, toMs } = parseTimeRange('last week', 'yesterday');
      expect(fromMs).toBeDefined();
      expect(toMs).toBeDefined();

      const daysDiff = Math.floor(
        ((toMs as number) - (fromMs as number)) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBeGreaterThanOrEqual(5);
      expect(daysDiff).toBeLessThanOrEqual(7);
    });

    it('should throw error for invalid "from" parameter', () => {
      expect(() => parseTimeRange('invalid', 'now')).toThrow();
    });

    it('should throw error for invalid "to" parameter', () => {
      expect(() => parseTimeRange('now', 'invalid')).toThrow();
    });
  });

  describe('formatTimeRange', () => {
    it('should format range with both from and to', () => {
      const fromMs = new Date('2025-09-24T00:00:00Z').getTime();
      const toMs = new Date('2025-10-01T00:00:00Z').getTime();
      const formatted = formatTimeRange(fromMs, toMs);
      expect(formatted).toContain('2025-09-24');
      expect(formatted).toContain('2025-10-01');
      expect(formatted).toContain(' to ');
    });

    it('should format range with only from', () => {
      const fromMs = new Date('2025-09-24T00:00:00Z').getTime();
      const formatted = formatTimeRange(fromMs, undefined);
      expect(formatted).toContain('2025-09-24');
      expect(formatted).toContain(' to now');
    });

    it('should format range with only to', () => {
      const toMs = new Date('2025-10-01T00:00:00Z').getTime();
      const formatted = formatTimeRange(undefined, toMs);
      expect(formatted).toContain('beginning to ');
      expect(formatted).toContain('2025-10-01');
    });

    it('should format range with neither from nor to', () => {
      const formatted = formatTimeRange(undefined, undefined);
      expect(formatted).toBe('all time');
    });
  });
});
