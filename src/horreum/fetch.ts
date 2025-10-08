import { logger } from '../observability/logging.js';
import { getRequestId } from '../observability/correlation.js';
import { setTimeout as delayMs } from 'node:timers/promises';

export type BaseFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type RateLimitedFetchOptions = {
  baseFetch: BaseFetch;
  requestsPerSecond: number;
  timeoutMs: number;
  maxRetries?: number;
  backoffInitialMs?: number;
  backoffMaxMs?: number;
  jitterRatio?: number; // 0.25 = ±25%
};

function computeBackoffDelay(
  attempt: number,
  initial: number,
  max: number,
  jitterRatio: number
): number {
  const exp = Math.min(max, initial * 2 ** (attempt - 1));
  const jitter = exp * jitterRatio;
  const min = exp - jitter;
  const maxDelay = exp + jitter;
  return Math.floor(min + Math.random() * (maxDelay - min));
}

function shouldRetryResponse(res: Response): boolean {
  return [429, 502, 503, 504].includes(res.status);
}

export function createRateLimitedFetch(options: RateLimitedFetchOptions): BaseFetch {
  const {
    baseFetch,
    requestsPerSecond,
    timeoutMs,
    maxRetries = 3,
    backoffInitialMs = 1000,
    backoffMaxMs = 30000,
    jitterRatio = 0.25,
  } = options;

  const windowMs = 1000;
  const recentRequestTimestamps: number[] = [];

  async function awaitRateLimitToken(): Promise<void> {
    while (true) {
      const now = Date.now();
      // Drop timestamps older than the window
      while (recentRequestTimestamps.length > 0) {
        const head = recentRequestTimestamps[0] as number;
        if (now - head >= windowMs) {
          recentRequestTimestamps.shift();
        } else {
          break;
        }
      }
      if (recentRequestTimestamps.length < requestsPerSecond) {
        recentRequestTimestamps.push(now);
        return;
      }
      const head = recentRequestTimestamps[0];
      const waitFor = head != null ? windowMs - (now - head) : 1;
      logger.debug(
        {
          windowMs,
          currentWindowCount: recentRequestTimestamps.length,
          requestsPerSecond,
          waitFor,
        },
        'Rate limiter waiting for token'
      );
      await delayMs(Math.max(1, waitFor));
    }
  }

  return async (input, init) => {
    await awaitRateLimitToken();

    const originalSignal = init?.signal ?? null;

    for (let attempt = 1; attempt <= 1 + maxRetries; attempt += 1) {
      // Combine the caller's signal with our timeout using AbortSignal.any
      const controller = new AbortController();
      let didTimeout = false;
      const timeout = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, timeoutMs);
      let removeOriginalAbort: (() => void) | undefined;
      if (originalSignal) {
        if (originalSignal.aborted) {
          controller.abort();
        } else {
          const onAbort = () => controller.abort();
          originalSignal.addEventListener('abort', onAbort, { once: true });
          removeOriginalAbort = () =>
            originalSignal.removeEventListener('abort', onAbort);
        }
      }

      try {
        const reqId = getRequestId();
        if (attempt > 1) {
          logger.debug({ attempt }, 'Retrying fetch attempt');
        }
        const response = await baseFetch(input, {
          ...(init ?? {}),
          signal: controller.signal,
          headers: {
            ...(init?.headers || {}),
            ...(reqId ? { 'X-Correlation-Id': reqId } : {}),
          },
        });
        clearTimeout(timeout);
        if (removeOriginalAbort) removeOriginalAbort();

        if (!shouldRetryResponse(response) || attempt > maxRetries) {
          if (response.status >= 400) {
            // One-time visibility for non-retryable upstream errors
            let bodyPreview: string | undefined;
            try {
              const clone = response.clone();
              const text = await clone.text();
              bodyPreview = text && text.length > 500 ? text.slice(0, 500) + '…' : text;
            } catch {
              // ignore
            }
            logger.error(
              {
                event: 'upstream.http_status',
                path:
                  typeof input === 'string' ? input : String((input as URL).toString()),
                status: response.status,
                body_preview: bodyPreview,
              },
              'Upstream HTTP error'
            );
          }
          return response;
        }

        const delay = computeBackoffDelay(
          attempt,
          backoffInitialMs,
          backoffMaxMs,
          jitterRatio
        );
        // Read a small preview without consuming body for caller; OK on retry path
        let bodyPreview: string | undefined;
        try {
          const clone = response.clone();
          const text = await clone.text();
          bodyPreview = text && text.length > 500 ? text.slice(0, 500) + '…' : text;
        } catch {
          // ignore
        }
        logger.warn(
          {
            event: 'upstream.http_status',
            path: typeof input === 'string' ? input : String((input as URL).toString()),
            status: response.status,
            attempt,
            delay,
            body_preview: bodyPreview,
          },
          'Retrying on retryable status'
        );
        await delayMs(delay);
        continue;
      } catch (error) {
        clearTimeout(timeout);
        if (removeOriginalAbort) removeOriginalAbort();
        // If aborted, classify as timeout vs external abort and do not retry
        if ((error as Error & { name?: string }).name === 'AbortError') {
          if (didTimeout) {
            logger.error(
              {
                event: 'upstream.timeout',
                path:
                  typeof input === 'string' ? input : String((input as URL).toString()),
                attempt,
                timeout_seconds: Math.round(timeoutMs / 1000),
                hint: 'Consider raising adapter timeout to 300s for complex queries',
              },
              'Upstream request timed out'
            );
          }
          throw error;
        }
        if (originalSignal && originalSignal.aborted) {
          throw error;
        }
        if (attempt > maxRetries) {
          logger.error(
            {
              event: 'upstream.connect_error',
              path:
                typeof input === 'string' ? input : String((input as URL).toString()),
              attempt,
              timeout_seconds: Math.round(timeoutMs / 1000),
              hint: 'Consider raising adapter timeout to 300s for complex queries',
            },
            'Network error after retries'
          );
          throw error;
        }
        const delay = computeBackoffDelay(
          attempt,
          backoffInitialMs,
          backoffMaxMs,
          jitterRatio
        );
        logger.warn(
          {
            event: 'upstream.connect_error',
            path: typeof input === 'string' ? input : String((input as URL).toString()),
            attempt,
            timeout_seconds: Math.round(timeoutMs / 1000),
            delay,
          },
          'Retrying after network error'
        );
        await delayMs(delay);
        continue;
      }
    }

    // Should not reach here
    throw new Error('RateLimitedFetch: exhausted retries unexpectedly');
  };
}
