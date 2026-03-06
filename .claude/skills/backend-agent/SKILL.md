# Backend Agent — Express.js API & Data Layer (Optimized)

You build the backend API, database schemas, WebSocket layer, and AI service integrations. Every service you write must handle concurrency, backpressure, and failure gracefully — this system scrapes thousands of jobs and serves real-time updates to a live demo audience.

## Stack
- Express.js + TypeScript (Node 20+ for native fetch + async hooks)
- MongoDB + Mongoose (primary DB, connection pool tuned)
- Redis (caching, rate limiting, pub/sub for cross-process events)
- Socket.IO (real-time L1→L2, Redis adapter for multi-process)
- BullMQ (job queues with concurrency-tuned workers)
- Gemini API (primary AI — batched, rate-limited, with retry)
- Claude API (chatbot — semaphore-gated)
- Puppeteer (scraping — pooled browser instances)
- Cheerio (lightweight HTML parsing)

## Project Structure
```
backend/src/
├── index.ts                         # Cluster master — forks workers
├── worker.ts                        # Individual Express worker process
├── app.ts                           # Express config + middleware
├── routes/                          # Thin route layer → controllers
├── controllers/                     # Request validation → service calls
├── services/
│   ├── ai/
│   │   ├── gemini.service.ts        # Batched + rate-limited + retry
│   │   ├── claude.service.ts        # Semaphore-gated chatbot calls
│   │   ├── nlp.service.ts           # Orchestrates Gemini for text analysis
│   │   ├── risk.service.ts          # Deterministic scoring + Gemini fallback
│   │   └── reskill.service.ts       # Path generation with course matching
│   ├── scraper/
│   │   ├── browser-pool.ts          # Shared Puppeteer instance pool
│   │   ├── naukri.scraper.ts        # Concurrency-controlled per-city
│   │   ├── linkedin.scraper.ts      # Apify actor invocation
│   │   ├── github.scraper.ts        # Octokit with token rotation
│   │   ├── nptel.scraper.ts         # Cheerio-based, cached
│   │   └── swayam.scraper.ts        # Cheerio-based, cached
│   ├── dashboard.service.ts         # MongoDB aggregation pipelines
│   ├── worker.service.ts            # Profile processing pipeline
│   ├── graph.service.ts             # Knowledge graph assembly
│   └── cache.service.ts             # Redis wrapper with TTL strategy
├── models/                          # Mongoose schemas with indexes
├── middleware/
│   ├── errorHandler.ts              # Centralized, structured errors
│   ├── rateLimiter.ts               # Redis-backed sliding window
│   └── validator.ts                 # Zod schemas per route
├── jobs/
│   ├── queues.ts                    # All queue definitions + settings
│   ├── workers/                     # One file per queue processor
│   │   ├── scrape.worker.ts
│   │   ├── nlp.worker.ts            # Dedicated NLP processing queue
│   │   └── riskRecalc.worker.ts     # Batch risk recalculation
│   └── scheduler.ts                 # Cron triggers
├── socket/
│   ├── index.ts                     # Socket.IO + Redis adapter
│   └── handlers.ts
├── lib/
│   ├── concurrency.ts               # Semaphore, pLimit wrappers
│   ├── retry.ts                     # Exponential backoff utility
│   ├── batch.ts                     # Generic batching utility
│   └── circuit-breaker.ts           # Per-service circuit breaker
├── config/
│   ├── db.ts                        # Mongoose pool config
│   ├── redis.ts                     # ioredis with connection pool
│   ├── env.ts                       # Zod-validated env
│   ├── tuning.ts                    # All concurrency knobs in one place
│   └── cities.ts
└── utils/
    ├── logger.ts
    └── metrics.ts                   # Simple in-memory counters for demo
```

## Concurrency Tuning — The Central Config

Every concurrency number lives in one file so you can tune for your hardware during the hackathon:

```typescript
// config/tuning.ts — THE knob file. Tune these based on your machine.
export const TUNING = {
  // --- Process-level ---
  CLUSTER_WORKERS: Math.min(require('os').cpus().length, 4),
  // 4 workers max — beyond that, MongoDB/Redis connections multiply
  // and you hit diminishing returns on a single machine.
  // For hackathon demo on a laptop: set to 2.

  // --- MongoDB ---
  MONGO_POOL_SIZE: 10,          // per worker process → 10 * N workers total
  MONGO_MAX_IDLE_MS: 30_000,

  // --- Redis ---
  REDIS_POOL_SIZE: 5,           // ioredis connection pool per process

  // --- Gemini API ---
  GEMINI_MAX_CONCURRENT: 5,     // parallel Gemini calls per process
  GEMINI_BATCH_SIZE: 10,        // JDs batched into single prompt
  GEMINI_BATCH_WAIT_MS: 200,    // max wait before flushing partial batch
  GEMINI_RPM_LIMIT: 60,         // requests per minute (free tier: 60)
  GEMINI_RETRY_ATTEMPTS: 3,
  GEMINI_RETRY_BASE_MS: 1000,   // exponential backoff base

  // --- Claude API (chatbot only) ---
  CLAUDE_MAX_CONCURRENT: 3,     // chat is user-facing, keep low
  CLAUDE_TIMEOUT_MS: 15_000,

  // --- Scraping ---
  BROWSER_POOL_SIZE: 3,         // Puppeteer instances (each ~150MB RAM)
  SCRAPE_CONCURRENCY_PER_CITY: 2,  // parallel page scrapes within one city
  SCRAPE_PAGE_DELAY_MS: { min: 2000, max: 5000 }, // anti-detection
  SCRAPE_MAX_PAGES_PER_CITY: 50,
  GITHUB_CONCURRENT_REPOS: 5,   // parallel repo fetches per profile

  // --- BullMQ ---
  SCRAPE_QUEUE_CONCURRENCY: 3,  // jobs processed in parallel per worker
  NLP_QUEUE_CONCURRENCY: 5,     // NLP processing is I/O-bound
  RISK_RECALC_BATCH_SIZE: 50,   // profiles recalculated per batch job

  // --- Caching TTL (seconds) ---
  CACHE_TTL_JOB_LISTINGS: 6 * 3600,    // 6 hours
  CACHE_TTL_SKILLS_TRENDS: 3600,        // 1 hour
  CACHE_TTL_VULNERABILITY: 1800,        // 30 min (changes often)
  CACHE_TTL_COURSES: 7 * 86400,         // 1 week
  CACHE_TTL_GITHUB_PROFILE: 86400,      // 1 day

  // --- Socket.IO ---
  SOCKET_THROTTLE_MS: 500,      // min gap between dashboard broadcasts
} as const;
```

**Why these numbers matter:**
- `BROWSER_POOL_SIZE: 3` — each Puppeteer instance eats ~150MB RAM. On a 16GB machine with 4 cluster workers, 3 browsers = 1.8GB just for scraping. On an 8GB laptop, drop to 1.
- `GEMINI_MAX_CONCURRENT: 5` — Gemini free tier allows 60 RPM. With batching (10 JDs per call), 5 concurrent calls can process 50 JDs simultaneously, well within limits.
- `SCRAPE_QUEUE_CONCURRENCY: 3` — BullMQ processes 3 scrape jobs in parallel. Each job handles one city. So 3 cities scraped simultaneously per worker process.
- `NLP_QUEUE_CONCURRENCY: 5` — NLP is waiting on Gemini API (network I/O), so higher concurrency is fine.

## Process Architecture — Cluster Mode

Use Node.js cluster to fully utilize multi-core machines. The master process forks workers and manages graceful restarts:

```typescript
// index.ts — cluster master
import cluster from 'node:cluster';
import { TUNING } from './config/tuning';
import { logger } from './utils/logger';

if (cluster.isPrimary) {
  logger.info(`Master ${process.pid} starting ${TUNING.CLUSTER_WORKERS} workers`);

  for (let i = 0; i < TUNING.CLUSTER_WORKERS; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code) => {
    logger.warn(`Worker ${worker.process.pid} died (code ${code}), restarting...`);
    cluster.fork(); // auto-restart
  });

  // Master also runs the BullMQ scheduler (cron triggers)
  // Only one process should schedule — the master.
  import('./jobs/scheduler').then(m => m.startScheduler());

} else {
  // Each forked process runs a full Express server
  import('./worker');
}
```

```typescript
// worker.ts — individual Express process
import { app } from './app';
import { createServer } from 'http';
import { initSocket } from './socket';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { startQueueWorkers } from './jobs/workers';
import { TUNING } from './config/tuning';

async function bootstrap() {
  await connectDB();
  await connectRedis();

  const server = createServer(app);
  initSocket(server); // Socket.IO with Redis adapter for cross-process

  // Start BullMQ workers in each process (they coordinate via Redis)
  startQueueWorkers();

  server.listen(TUNING.PORT || 5000, () => {
    logger.info(`Worker ${process.pid} listening on ${TUNING.PORT || 5000}`);
  });
}

bootstrap().catch(err => {
  logger.error('Worker bootstrap failed:', err);
  process.exit(1);
});
```

**For hackathon/demo:** Set `CLUSTER_WORKERS: 1` to simplify debugging. Scale up for the final demo if the machine can handle it.

## Connection Pooling

### MongoDB
```typescript
// config/db.ts
import mongoose from 'mongoose';
import { TUNING } from './tuning';

export async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI!, {
    maxPoolSize: TUNING.MONGO_POOL_SIZE,
    minPoolSize: 2,
    maxIdleTimeMS: TUNING.MONGO_MAX_IDLE_MS,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  mongoose.connection.on('error', err => logger.error('MongoDB error:', err));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
}
```

### Redis (ioredis with dedicated pub/sub)
```typescript
// config/redis.ts
import Redis from 'ioredis';

// Main client for get/set operations
export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Separate client for pub/sub (ioredis requires dedicated connection)
export const redisSub = new Redis(process.env.REDIS_URL!);

// Factory for BullMQ (it manages its own connections internally)
export function createBullConnection() {
  return new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
}
```

## Gemini Service — Batched, Rate-Limited, Retry-Safe

The original skill called Gemini one JD at a time. That's 1000 API calls for 1000 JDs. With batching, it's 100 calls (10 JDs each), running 5 at a time:

```typescript
// services/ai/gemini.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TUNING } from '../../config/tuning';
import { Semaphore } from '../../lib/concurrency';
import { withRetry } from '../../lib/retry';
import { BatchProcessor } from '../../lib/batch';

class GeminiService {
  private model;
  private semaphore: Semaphore;
  private jdBatcher: BatchProcessor<string, SkillExtraction>;
  private rateLimiter: SlidingWindowLimiter;

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    this.semaphore = new Semaphore(TUNING.GEMINI_MAX_CONCURRENT);
    this.rateLimiter = new SlidingWindowLimiter(TUNING.GEMINI_RPM_LIMIT, 60_000);

    // Auto-batch JD extraction: collects up to 10 JDs, flushes every 200ms
    this.jdBatcher = new BatchProcessor({
      maxBatchSize: TUNING.GEMINI_BATCH_SIZE,
      maxWaitMs: TUNING.GEMINI_BATCH_WAIT_MS,
      processBatch: (jds) => this._extractSkillsBatch(jds),
    });
  }

  // Public API — callers don't know about batching
  async extractSkillsFromJD(description: string): Promise<SkillExtraction> {
    return this.jdBatcher.add(description);
  }

  // Internal — processes a batch of JDs in one Gemini call
  private async _extractSkillsBatch(descriptions: string[]): Promise<SkillExtraction[]> {
    return this.semaphore.acquire(async () => {
      await this.rateLimiter.wait();

      const prompt = `Analyze these ${descriptions.length} Indian job descriptions.
For EACH one, extract:
1. required_skills: string[]
2. ai_tool_mentions: string[]
3. automation_risk_signals: string[]
4. seniority_level: "junior" | "mid" | "senior" | "lead"
5. sector: string

Return a JSON array of ${descriptions.length} objects, one per JD.
Return ONLY the JSON array, no markdown.

JDs:
${descriptions.map((d, i) => `--- JD ${i + 1} ---\n${d.slice(0, 500)}`).join('\n\n')}`;

      return withRetry(
        async () => {
          const result = await this.model.generateContent(prompt);
          const text = result.response.text().replace(/```json\n?|```/g, '').trim();
          return JSON.parse(text);
        },
        {
          attempts: TUNING.GEMINI_RETRY_ATTEMPTS,
          baseDelayMs: TUNING.GEMINI_RETRY_BASE_MS,
          shouldRetry: (err) => err.status === 429 || err.status >= 500,
        }
      );
    });
  }

  // Worker write-up is NOT batched — per-profile, latency-sensitive
  async analyzeWorkerWriteUp(writeUp: string, title: string): Promise<ProfileAnalysis> {
    return this.semaphore.acquire(async () => {
      await this.rateLimiter.wait();
      return withRetry(async () => {
        const result = await this.model.generateContent(
          `You are an Indian job market expert. Analyze this worker's self-description:
Title: ${title}
Write-up: ${writeUp}

Extract as JSON:
{
  "explicit_skills": [],
  "implicit_skills": [],
  "tools": [],
  "soft_skills": [],
  "aspirations": [],
  "experience_level": "junior|mid|senior",
  "domain_tags": []
}
The write-up is the most important signal — it reveals skills no title can. Be thorough.`
        );
        return JSON.parse(result.response.text().replace(/```json\n?|```/g, '').trim());
      }, { attempts: TUNING.GEMINI_RETRY_ATTEMPTS, baseDelayMs: TUNING.GEMINI_RETRY_BASE_MS });
    });
  }
}

export const geminiService = new GeminiService();
```

## Concurrency Primitives

```typescript
// lib/concurrency.ts
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
      await new Promise<void>(resolve => this.queue.push(resolve));
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
```

```typescript
// lib/retry.ts
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
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}
```

```typescript
// lib/batch.ts
interface BatchOptions<In, Out> {
  maxBatchSize: number;
  maxWaitMs: number;
  processBatch: (items: In[]) => Promise<Out[]>;
}

export class BatchProcessor<In, Out> {
  private buffer: Array<{ item: In; resolve: (v: Out) => void; reject: (e: any) => void }> = [];
  private timer: NodeJS.Timeout | null = null;
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
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, this.opts.maxBatchSize);
    try {
      const results = await this.opts.processBatch(batch.map(b => b.item));
      batch.forEach((b, i) => b.resolve(results[i]));
    } catch (err: any) {
      batch.forEach(b => b.reject(err));
    }
  }
}
```

```typescript
// lib/circuit-breaker.ts
type State = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: State = 'closed';
  private failures = 0;
  private lastFailure = 0;
  private readonly threshold: number;
  private readonly resetMs: number;

  constructor(threshold = 5, resetMs = 30_000) {
    this.threshold = threshold;
    this.resetMs = resetMs;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetMs) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open — service unavailable');
      }
    }
    try {
      const result = await fn();
      this.failures = 0;
      this.state = 'closed';
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) this.state = 'open';
      throw err;
    }
  }
}
```

## Browser Pool — Puppeteer Instance Management

Instead of launching a new browser per scrape, pool and reuse them:

```typescript
// services/scraper/browser-pool.ts
import puppeteer, { Browser, Page } from 'puppeteer';
import { Semaphore } from '../../lib/concurrency';
import { TUNING } from '../../config/tuning';

class BrowserPool {
  private browsers: Browser[] = [];
  private semaphore: Semaphore;
  private roundRobin = 0;

  constructor() {
    this.semaphore = new Semaphore(
      TUNING.BROWSER_POOL_SIZE * TUNING.SCRAPE_CONCURRENCY_PER_CITY
    );
  }

  async init() {
    for (let i = 0; i < TUNING.BROWSER_POOL_SIZE; i++) {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',   // critical for Docker
          '--disable-gpu',
          '--single-process',          // saves RAM in containers
        ],
      });
      this.browsers.push(browser);
    }
  }

  async withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    return this.semaphore.acquire(async () => {
      const browser = this.browsers[this.roundRobin % this.browsers.length];
      this.roundRobin++;
      const page = await browser.newPage();
      await page.setUserAgent(randomUserAgent());
      try {
        return await fn(page);
      } finally {
        await page.close();
      }
    });
  }

  async shutdown() {
    await Promise.all(this.browsers.map(b => b.close()));
  }
}

export const browserPool = new BrowserPool();
```

## BullMQ — Queue Architecture with Tuned Workers

Three separate queues with different concurrency because they have different I/O profiles:

```typescript
// jobs/queues.ts
import { Queue } from 'bullmq';
import { createBullConnection } from '../config/redis';

const connection = createBullConnection();

export const scrapeQueue = new Queue('scrape', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const nlpQueue = new Queue('nlp', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 200,
  },
});

export const riskRecalcQueue = new Queue('risk-recalc', {
  connection,
  defaultJobOptions: { attempts: 2, removeOnComplete: 50 },
});
```

```typescript
// jobs/workers/scrape.worker.ts
import { Worker } from 'bullmq';
import { createBullConnection } from '../../config/redis';
import { TUNING } from '../../config/tuning';

export function startScrapeWorker() {
  return new Worker('scrape', async (job) => {
    const { city, sector, source } = job.data;
    const rawListings = await naukriScraper.scrapeCity(city, sector);

    // Feed raw listings into NLP queue for Gemini processing
    await nlpQueue.addBulk(
      rawListings.map((listing, i) => ({
        name: `nlp-${city}-${i}`,
        data: { listing, city, sector },
      }))
    );

    return { city, count: rawListings.length };
  }, {
    connection: createBullConnection(),
    concurrency: TUNING.SCRAPE_QUEUE_CONCURRENCY,
  });
}
```

```typescript
// jobs/workers/nlp.worker.ts — higher concurrency, I/O-bound
export function startNLPWorker() {
  return new Worker('nlp', async (job) => {
    const { listing, city, sector } = job.data;
    // This call auto-batches inside GeminiService
    const extraction = await geminiService.extractSkillsFromJD(listing.rawDescription);

    await JobListing.findOneAndUpdate(
      { _id: listing._id },
      { $set: {
        skills: extraction.required_skills,
        aiToolMentions: extraction.ai_tool_mentions,
        sector: extraction.sector || sector,
        'vulnerabilitySignals.automationKeywords': extraction.automation_risk_signals,
      }},
      { upsert: true }
    );
  }, {
    connection: createBullConnection(),
    concurrency: TUNING.NLP_QUEUE_CONCURRENCY,
  });
}
```

```typescript
// jobs/workers/riskRecalc.worker.ts
// Triggered when Layer 1 data changes → batch-recalculates affected worker scores
export function startRiskRecalcWorker(io: SocketIO.Server) {
  return new Worker('risk-recalc', async (job) => {
    const { city, role } = job.data;
    const workers = await WorkerProfile.find({
      city,
      ...(role ? { normalizedTitle: { $regex: role, $options: 'i' } } : {}),
    }).lean();

    for (let i = 0; i < workers.length; i += TUNING.RISK_RECALC_BATCH_SIZE) {
      const batch = workers.slice(i, i + TUNING.RISK_RECALC_BATCH_SIZE);
      const updates = await Promise.all(batch.map(w => riskService.computeRiskScore(w)));

      await WorkerProfile.bulkWrite(updates.map((score, idx) => ({
        updateOne: {
          filter: { _id: batch[idx]._id },
          update: { $set: { riskScore: score } },
        },
      })));

      updates.forEach((score, idx) => {
        io.to(batch[idx]._id.toString()).emit('worker:risk-updated', score);
      });
    }
    return { affected: workers.length };
  }, {
    connection: createBullConnection(),
    concurrency: 2,  // heavy computation — keep low
  });
}
```

## Risk Score — Deterministic + Fast

The original delegated scoring entirely to Gemini. That's slow and expensive for real-time reactivity. Use a deterministic algorithm with pre-aggregated MongoDB data:

```typescript
// services/ai/risk.service.ts
const WEIGHTS = {
  hiringDecline:        0.30,
  aiToolMentionRate:    0.25,
  roleReplacementRatio: 0.20,
  automationFeasibility:0.15,
  salaryCompression:    0.10,
};

class RiskService {
  // FAST — pure math + MongoDB queries, no Gemini calls
  async computeRiskScore(worker: WorkerProfile): Promise<RiskScore> {
    const [hiringStats, aiMentions, replacement] = await Promise.all([
      this.getHiringTrend(worker.normalizedTitle, worker.city),
      this.getAIMentionRate(worker.normalizedTitle, worker.city),
      this.getReplacementRatio(worker.normalizedTitle),
    ]);

    const factors = [];
    let raw = 0;

    const declineScore = Math.max(0, Math.min(100, hiringStats.declinePercent));
    raw += declineScore * WEIGHTS.hiringDecline;
    factors.push({
      signal: `${worker.normalizedTitle} hiring in ${worker.city}: ${hiringStats.declinePercent > 0 ? '-' : '+'}${Math.abs(hiringStats.declinePercent).toFixed(0)}% over 30d`,
      weight: declineScore * WEIGHTS.hiringDecline,
    });

    const aiScore = Math.min(100, aiMentions.rate * 1.5);
    raw += aiScore * WEIGHTS.aiToolMentionRate;
    factors.push({
      signal: `AI tool mentions in JDs: ${aiMentions.rate.toFixed(0)}%`,
      weight: aiScore * WEIGHTS.aiToolMentionRate,
    });

    raw += replacement.score * WEIGHTS.roleReplacementRatio;
    factors.push({
      signal: `Automation feasibility: ${replacement.score}/100`,
      weight: replacement.score * WEIGHTS.roleReplacementRatio,
    });

    const finalScore = Math.round(Math.min(100, raw));
    return {
      current: finalScore,
      previous: worker.riskScore?.current ?? finalScore,
      trend: finalScore > (worker.riskScore?.current ?? 0) ? 'rising'
           : finalScore < (worker.riskScore?.current ?? 0) ? 'falling' : 'stable',
      level: finalScore > 80 ? 'CRITICAL' : finalScore > 60 ? 'HIGH'
           : finalScore > 40 ? 'MEDIUM' : 'LOW',
      factors,
      methodology: WEIGHTS,
      computedAt: new Date(),
    };
  }

  private async getHiringTrend(role: string, city: string) {
    const [current, previous] = await Promise.all([
      JobListing.countDocuments({
        normalizedTitle: { $regex: role, $options: 'i' }, city,
        scrapedAt: { $gte: new Date(Date.now() - 30 * 86400_000) },
      }),
      JobListing.countDocuments({
        normalizedTitle: { $regex: role, $options: 'i' }, city,
        scrapedAt: {
          $gte: new Date(Date.now() - 60 * 86400_000),
          $lt:  new Date(Date.now() - 30 * 86400_000),
        },
      }),
    ]);
    return { current, previous, declinePercent: previous > 0 ? ((previous - current) / previous) * 100 : 0 };
  }

  private async getAIMentionRate(role: string, city: string) {
    const [total, withAI] = await Promise.all([
      JobListing.countDocuments({
        normalizedTitle: { $regex: role, $options: 'i' }, city,
        scrapedAt: { $gte: new Date(Date.now() - 30 * 86400_000) },
      }),
      JobListing.countDocuments({
        normalizedTitle: { $regex: role, $options: 'i' }, city,
        'aiToolMentions.0': { $exists: true },
        scrapedAt: { $gte: new Date(Date.now() - 30 * 86400_000) },
      }),
    ]);
    return { rate: total > 0 ? (withAI / total) * 100 : 0 };
  }

  private async getReplacementRatio(role: string) {
    const wefBaselines: Record<string, number> = {
      'bpo': 82, 'data entry': 78, 'telecaller': 75, 'receptionist': 65,
      'accountant': 55, 'content writer': 45, 'web developer': 20,
      'data analyst': 15, 'machine learning': 8, 'devops': 12,
    };
    const key = Object.keys(wefBaselines).find(k => role.toLowerCase().includes(k));
    return { score: key ? wefBaselines[key] : 40 };
  }
}

export const riskService = new RiskService();
```

## MongoDB Indexes — Without These, Dashboard Dies

```typescript
// Add to each schema definition:

// JobListing — query patterns: by city+date, by role+city+date, by skills
JobListingSchema.index({ city: 1, scrapedAt: -1 });
JobListingSchema.index({ normalizedTitle: 1, city: 1, scrapedAt: -1 });
JobListingSchema.index({ skills: 1 });
JobListingSchema.index({ source: 1, scrapedAt: -1 });
JobListingSchema.index({ 'aiToolMentions': 1, city: 1 });

// WorkerProfile — query patterns: by city+role, by risk score
WorkerProfileSchema.index({ city: 1, normalizedTitle: 1 });
WorkerProfileSchema.index({ 'riskScore.current': -1 });
```

## Socket.IO — Throttled Broadcasts + Redis Adapter

```typescript
// socket/index.ts
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis, redisSub } from '../config/redis';
import { TUNING } from '../config/tuning';

let lastBroadcast = 0;

export function initSocket(httpServer: any) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' },
    adapter: createAdapter(redis, redisSub),
  });

  // Prevents flooding clients during bulk scrape cycles
  io.broadcastThrottled = (event: string, data: any) => {
    const now = Date.now();
    if (now - lastBroadcast < TUNING.SOCKET_THROTTLE_MS) return;
    lastBroadcast = now;
    io.emit(event, data);
  };

  return io;
}
```

## Dashboard — Aggregation Pipelines Not In-Memory Loops

```typescript
// services/dashboard.service.ts
class DashboardService {
  async getHiringTrends(city?: string, sector?: string, range = '30d') {
    const rangeMs = { '7d': 7, '30d': 30, '90d': 90, '1yr': 365 }[range] ?? 30;
    return JobListing.aggregate([
      { $match: {
        scrapedAt: { $gte: new Date(Date.now() - rangeMs * 86400_000) },
        ...(city ? { city } : {}),
        ...(sector ? { sector } : {}),
      }},
      { $group: {
        _id: { city: '$city', sector: '$sector', week: { $isoWeek: '$scrapedAt' } },
        count: { $sum: 1 },
        avgSalaryMin: { $avg: '$salary.min' },
      }},
      { $sort: { '_id.week': 1 } },
    ]);
  }

  async getVulnerabilityHeatmap() {
    return JobListing.aggregate([
      { $match: { scrapedAt: { $gte: new Date(Date.now() - 30 * 86400_000) } } },
      { $group: {
        _id: { city: '$city', role: '$normalizedTitle' },
        totalListings: { $sum: 1 },
        aiMentionCount: {
          $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$aiToolMentions', []] } }, 0] }, 1, 0] },
        },
      }},
      { $addFields: {
        aiMentionRate: { $multiply: [{ $divide: ['$aiMentionCount', { $max: ['$totalListings', 1] }] }, 100] },
      }},
      { $sort: { aiMentionRate: -1 } },
    ]);
  }
}
```

## API Endpoints (unchanged from original — same contract, faster implementation)

### Layer 1 — Dashboard
```
GET  /api/v1/dashboard/hiring-trends?city=pune&sector=IT&range=30d
GET  /api/v1/dashboard/skills?type=rising&limit=20
GET  /api/v1/dashboard/vulnerability?city=pune&role=BPO
GET  /api/v1/dashboard/vulnerability/heatmap
GET  /api/v1/dashboard/methodology
POST /api/v1/dashboard/refresh
```

### Layer 2 — Worker
```
POST /api/v1/worker/profile
GET  /api/v1/worker/:id/risk-score
GET  /api/v1/worker/:id/reskill-path
PUT  /api/v1/worker/:id/profile
```

### Chatbot / Graph / Scraping — same as original

## Environment Variables
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/skills-mirage
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=
CLAUDE_API_KEY=
APIFY_TOKEN=
GITHUB_TOKEN=
NODE_ENV=development
```

## Performance Cheat Sheet

| Bottleneck | Symptom | Fix |
|-----------|---------|-----|
| Gemini 429s | NLP queue backs up | Lower `GEMINI_MAX_CONCURRENT`, increase `GEMINI_BATCH_SIZE` |
| High RAM / OOM | Docker kills process | Reduce `BROWSER_POOL_SIZE` to 1, `CLUSTER_WORKERS` to 1 |
| Slow dashboard | Aggregation timeout | Add MongoDB indexes, enable Redis cache layer |
| Socket storms | Frontend laggy during scrape | Increase `SOCKET_THROTTLE_MS` to 1000+ |
| Risk score stale | L1 changes not reaching L2 | Check `riskRecalcQueue` — raise its concurrency |
| Mongo pool exhausted | `MongoPoolClearedError` | Increase `MONGO_POOL_SIZE` or reduce `CLUSTER_WORKERS` |
