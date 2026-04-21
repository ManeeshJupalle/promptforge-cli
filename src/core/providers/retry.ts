export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY: RetryOptions = {
  attempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < options.attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === options.attempts - 1) break;
      if (!isRetryable(err)) break;
      const backoff = Math.min(options.baseDelayMs * 2 ** attempt, options.maxDelayMs);
      const jitter = Math.random() * 100;
      await sleep(backoff + jitter);
    }
  }
  throw lastErr;
}

function isRetryable(err: unknown): boolean {
  const anyErr = err as { status?: number; response?: { status?: number }; code?: string };
  const status = anyErr?.status ?? anyErr?.response?.status;
  if (typeof status === 'number') {
    // 429 (rate limit) and any 5xx are transient. 4xx (except 429) are client errors — don't waste retries.
    return status === 429 || status >= 500;
  }
  const code = anyErr?.code;
  if (typeof code === 'string') {
    const NETWORK_CODES = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'UND_ERR_SOCKET', 'ECONNREFUSED'];
    return NETWORK_CODES.includes(code);
  }
  // Unknown error shapes (e.g. fetch TypeError with no code) — err on the side of retrying.
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
