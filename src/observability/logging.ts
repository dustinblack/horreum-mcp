/**
 * Structured logging configuration.
 */
import pino from 'pino';

const DEFAULT_LEVEL = process.env.LOG_LEVEL ?? 'info';

export const logger = pino({ level: DEFAULT_LEVEL });

const VALID_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;

export type LogLevel = (typeof VALID_LEVELS)[number];

export function isValidLogLevel(level: string | undefined): level is LogLevel {
  return (VALID_LEVELS as readonly string[]).includes(String(level));
}

export function setLogLevel(level: string): void {
  if (isValidLogLevel(level)) {
    logger.level = level as LogLevel;
  } else {
    logger.warn({ level }, 'Ignoring invalid log level');
  }
}

export function getLogLevel(): LogLevel {
  return logger.level as LogLevel;
}
