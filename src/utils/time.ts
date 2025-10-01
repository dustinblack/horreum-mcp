/**
 * Time parsing utility for natural language and standard time formats.
 *
 * This module provides a robust time parser that supports:
 * - Natural language expressions (e.g., "last week", "yesterday", "last 7 days")
 * - ISO 8601 timestamps (e.g., "2025-09-24T00:00:00Z")
 * - Epoch milliseconds (e.g., "1727136000000")
 * - Simple dates (e.g., "2025-09-24")
 * - Intelligent defaults when no time is specified
 *
 * @module utils/time
 */

import * as chrono from 'chrono-node';
import { logger } from '../observability/logging.js';

/**
 * Parse a time string into a Date object using multiple strategies.
 *
 * Parsing strategy (in order):
 * 1. Try parsing as epoch milliseconds (numeric string)
 * 2. Try parsing as ISO 8601 / standard date string
 * 3. Try parsing as natural language using chrono-node
 * 4. Throw error if all strategies fail
 *
 * @param timeStr - The time string to parse
 * @param fieldName - The name of the field (for error messages)
 * @returns Date object representing the parsed time
 * @throws Error if the time string cannot be parsed
 *
 * @example
 * ```typescript
 * parseTimeString("last week", "from")        // 7 days ago
 * parseTimeString("2025-09-24", "from")       // ISO date
 * parseTimeString("1727136000000", "from")    // Epoch millis
 * parseTimeString("yesterday", "to")          // Yesterday
 * ```
 */
export function parseTimeString(timeStr: string, fieldName: string): Date {
  // Strategy 1: Try parsing as epoch milliseconds
  if (/^\d+$/.test(timeStr)) {
    const epochMs = Number(timeStr);
    if (Number.isFinite(epochMs)) {
      const date = new Date(epochMs);
      if (!isNaN(date.getTime())) {
        logger.debug({
          timeStr,
          fieldName,
          parsed: date.toISOString(),
          strategy: 'epoch',
        });
        return date;
      }
    }
  }

  // Strategy 2: Try parsing as ISO 8601 or standard date format
  const isoDate = Date.parse(timeStr);
  if (!isNaN(isoDate)) {
    const date = new Date(isoDate);
    logger.debug({ timeStr, fieldName, parsed: date.toISOString(), strategy: 'iso' });
    return date;
  }

  // Strategy 3: Try parsing as natural language with chrono-node
  const chronoResult = chrono.parseDate(timeStr, new Date(), {
    forwardDate: false, // Prefer past dates for expressions like "last week"
  });

  if (chronoResult) {
    logger.info({
      timeStr,
      fieldName,
      parsed: chronoResult.toISOString(),
      strategy: 'natural-language',
    });
    return chronoResult;
  }

  // All strategies failed
  throw new Error(
    `Unable to parse time string "${timeStr}" for field "${fieldName}". ` +
      `Supported formats: natural language ("last week"), ISO 8601 ("2025-09-24T00:00:00Z"), ` +
      `epoch milliseconds ("1727136000000"), or simple dates ("2025-09-24").`
  );
}

/**
 * Parse optional time parameters with intelligent defaults.
 *
 * When no time parameters are provided, this function applies a default
 * time range to prevent overwhelming responses with all historical data.
 *
 * Default behavior:
 * - If neither from nor to is specified: Default to "last 30 days"
 * - If only from is specified: to = now
 * - If only to is specified: from = undefined (beginning of time)
 *
 * @param from - Optional start time string
 * @param to - Optional end time string
 * @returns Object with fromMs and toMs as epoch milliseconds (or undefined)
 *
 * @example
 * ```typescript
 * // No params: defaults to last 30 days
 * parseTimeRange(undefined, undefined)
 * // => { fromMs: <30 days ago>, toMs: <now> }
 *
 * // Natural language
 * parseTimeRange("last week", "now")
 * // => { fromMs: <7 days ago>, toMs: <now> }
 *
 * // Only from specified
 * parseTimeRange("2025-09-24", undefined)
 * // => { fromMs: <Sept 24>, toMs: <now> }
 * ```
 */
export function parseTimeRange(
  from: string | undefined,
  to: string | undefined
): { fromMs: number | undefined; toMs: number | undefined } {
  // Case 1: Neither from nor to specified - apply default "last 30 days"
  if (!from && !to) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    logger.info({
      event: 'time-range-default-applied',
      from: thirtyDaysAgo.toISOString(),
      to: now.toISOString(),
      message: 'No time parameters specified, defaulting to last 30 days',
    });
    return {
      fromMs: thirtyDaysAgo.getTime(),
      toMs: now.getTime(),
    };
  }

  // Case 2: Parse specified time parameters
  let fromMs: number | undefined;
  let toMs: number | undefined;

  if (from) {
    try {
      const fromDate = parseTimeString(from, 'from');
      fromMs = fromDate.getTime();
    } catch (err) {
      logger.error({ err, from }, 'Failed to parse "from" time parameter');
      throw err;
    }
  }

  if (to) {
    try {
      const toDate = parseTimeString(to, 'to');
      toMs = toDate.getTime();
    } catch (err) {
      logger.error({ err, to }, 'Failed to parse "to" time parameter');
      throw err;
    }
  }

  // Case 3: Only from specified - default to to "now"
  if (fromMs && !toMs) {
    toMs = Date.now();
    logger.debug({
      event: 'time-range-to-defaulted',
      to: new Date(toMs).toISOString(),
      message: 'Only "from" specified, defaulting "to" to now',
    });
  }

  return { fromMs, toMs };
}

/**
 * Format a date range for logging or display.
 *
 * @param fromMs - Start time in epoch milliseconds (or undefined)
 * @param toMs - End time in epoch milliseconds (or undefined)
 * @returns Human-readable date range string
 */
export function formatTimeRange(
  fromMs: number | undefined,
  toMs: number | undefined
): string {
  if (!fromMs && !toMs) {
    return 'all time';
  }
  const fromStr = fromMs ? new Date(fromMs).toISOString() : 'beginning';
  const toStr = toMs ? new Date(toMs).toISOString() : 'now';
  return `${fromStr} to ${toStr}`;
}
