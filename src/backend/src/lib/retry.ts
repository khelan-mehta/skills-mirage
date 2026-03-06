interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  shouldRetry?: (err: any) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < opts.attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (i === opts.attempts - 1) break;
      if (opts.shouldRetry && !opts.shouldRetry(err)) break;
      const delay = opts.baseDelayMs * Math.pow(2, i) + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
