export class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(maxConcurrent: number) {
    this.permits = maxConcurrent;
  }

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    if (this.permits > 0) {
      this.permits--;
    } else {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    try {
      return await fn();
    } finally {
      if (this.queue.length > 0) {
        this.queue.shift()!();
      } else {
        this.permits++;
      }
    }
  }

  get pending() { return this.queue.length; }
  get available() { return this.permits; }
}

export class SlidingWindowLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const waitTime = this.timestamps[0] + this.windowMs - now;
      await new Promise((r) => setTimeout(r, waitTime));
    }

    this.timestamps.push(Date.now());
  }
}
