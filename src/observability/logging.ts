/**
 * Structured logging configuration.
 */
import pino from 'pino';
import { getRequestId } from './correlation.js';

const DEFAULT_LEVEL = process.env.LOG_LEVEL ?? 'info';

function createLogger() {
  const logFormat = String(process.env.LOG_FORMAT || '').toLowerCase();
  const logPrettyEnv = String(process.env.LOG_PRETTY || '').toLowerCase();
  // Default to pretty unless explicitly forced to JSON
  const wantPretty =
    (logFormat !== 'json' && logPrettyEnv !== 'false') ||
    logPrettyEnv === 'true' ||
    logFormat === 'pretty';

  const baseOptions: pino.LoggerOptions = {
    level: DEFAULT_LEVEL,
    // Attach req_id from AsyncLocalStorage to every log record
    mixin() {
      const reqId = getRequestId();
      return reqId ? { req_id: reqId } : {};
    },
  };

  // In STDIO mode (when HTTP_MODE_ENABLED is not set), write logs to stderr
  // to avoid interfering with JSON-RPC messages on stdout
  const destination =
    process.env.HTTP_MODE_ENABLED === 'true' ? undefined : process.stderr;

  if (wantPretty) {
    try {
      // pino-pretty is a dev-only dependency; optional at runtime
      const transport = pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: false,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          destination: destination || 1, // 1 = stdout, 2 = stderr
        },
      });
      return pino(baseOptions, transport);
    } catch {
      // Fallback to JSON when pino-pretty is not available
      return pino(baseOptions, destination);
    }
  }
  return pino(baseOptions, destination);
}

export const logger = createLogger();

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
