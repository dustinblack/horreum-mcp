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
      await delayMs(Math.max(1, waitFor));
    }
  }

  return async (input, init) => {
    await awaitRateLimitToken();

    const originalSignal = init?.signal ?? null;

    for (let attempt = 1; attempt <= 1 + maxRetries; attempt += 1) {
      // Combine the caller's signal with our timeout using AbortSignal.any
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
        const response = await baseFetch(input, {
          ...(init ?? {}),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (removeOriginalAbort) removeOriginalAbort();

        if (!shouldRetryResponse(response) || attempt > maxRetries) {
          return response;
        }

        const delay = computeBackoffDelay(
          attempt,
          backoffInitialMs,
          backoffMaxMs,
          jitterRatio
        );
        await delayMs(delay);
        continue;
      } catch (error) {
        clearTimeout(timeout);
        if (removeOriginalAbort) removeOriginalAbort();
        // If aborted, do not retry
        if (
          (error as Error & { name?: string }).name === 'AbortError' ||
          (originalSignal && originalSignal.aborted)
        ) {
          throw error;
        }
        if (attempt > maxRetries) {
          throw error;
        }
        const delay = computeBackoffDelay(
          attempt,
          backoffInitialMs,
          backoffMaxMs,
          jitterRatio
        );
        await delayMs(delay);
        continue;
      }
    }

    // Should not reach here
    throw new Error('RateLimitedFetch: exhausted retries unexpectedly');
  };
}
