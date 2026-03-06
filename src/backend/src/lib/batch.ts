interface BatchOptions<In, Out> {
  maxBatchSize: number;
  maxWaitMs: number;
  processBatch: (items: In[]) => Promise<Out[]>;
}

export class BatchProcessor<In, Out> {
  private buffer: Array<{
    item: In;
    resolve: (v: Out) => void;
    reject: (e: any) => void;
  }> = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private opts: BatchOptions<In, Out>;

  constructor(opts: BatchOptions<In, Out>) {
    this.opts = opts;
  }

  add(item: In): Promise<Out> {
    return new Promise((resolve, reject) => {
      this.buffer.push({ item, resolve, reject });

      if (this.buffer.length >= this.opts.maxBatchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.opts.maxWaitMs);
      }
    });
  }

  private async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.opts.maxBatchSize);
    try {
      const results = await this.opts.processBatch(batch.map((b) => b.item));
      batch.forEach((b, i) => b.resolve(results[i]));
    } catch (err: any) {
      batch.forEach((b) => b.reject(err));
    }
  }
}
