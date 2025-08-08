// Generic retry utility with exponential backoff + jitter.
// Retries only on provided shouldRetry(error) predicate.
export interface RetryOptions {
  retries?: number;        // total attempts including first (default 3)
  baseDelayMs?: number;    // initial delay (default 150ms)
  maxDelayMs?: number;     // cap for delay (default 1500ms)
  shouldRetry?: (err: any) => boolean;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 150,
    maxDelayMs = 1500,
    shouldRetry = () => true,
  } = opts;

  let attempt = 0;
  let lastErr: any;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err; // never retry aborted
      if (!shouldRetry(err) || attempt === retries - 1) throw err;
      lastErr = err;
      const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
      const jitter = Math.random() * 100;
      await new Promise(res => setTimeout(res, delay + jitter));
      attempt++;
    }
  }
  throw lastErr;
}
