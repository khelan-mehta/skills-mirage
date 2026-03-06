import { Queue, Worker, Job } from 'bullmq';
import { scrapeOrchestrator } from '../services/scraper/orchestrator';
import { TUNING } from '../config/tuning';
import { logger } from '../utils/logger';
import { env } from '../config/env';

let scrapeQueue: Queue | null = null;
let scrapeWorker: Worker | null = null;

// Socket.IO reference — set from index.ts after server boots
let io: any = null;
export function setScrapeIO(socketIO: any) {
  io = socketIO;
}

function getConnectionOpts() {
  // Parse redis URL into host/port for BullMQ (avoids ioredis version conflicts)
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname || 'localhost',
    port: parseInt(url.port || '6379', 10),
    maxRetriesPerRequest: null as null,
  };
}

export function getScrapeQueue(): Queue {
  if (!scrapeQueue) {
    scrapeQueue = new Queue('scrape', { connection: getConnectionOpts() });
  }
  return scrapeQueue;
}

export function startScrapeWorker() {
  scrapeWorker = new Worker(
    'scrape',
    async (job: Job) => {
      const { city, sector, source } = job.data;
      logger.info(`[ScrapeWorker] Processing job ${job.id}: ${city} / ${sector || 'all'} / ${source || 'all'}`);

      if (io) io.to('dashboard-viewers').emit('scrape:progress', { jobId: job.id, city, status: 'processing' });

      let count: number;
      if (source) {
        count = await scrapeOrchestrator.scrapeSource(source, city, sector);
      } else {
        count = await scrapeOrchestrator.scrapeAll(city, sector);
      }

      logger.info(`[ScrapeWorker] Job ${job.id} done: ${count} listings saved`);

      if (io) {
        io.to('dashboard-viewers').emit('scrape:completed', { jobId: job.id, city, count });
        io.to('dashboard-viewers').emit('dashboard:update', { type: 'scrape-complete', city, count });
      }

      return { city, count };
    },
    {
      connection: getConnectionOpts(),
      concurrency: TUNING.SCRAPE_QUEUE_CONCURRENCY,
    }
  );

  scrapeWorker.on('failed', (job, err) => {
    logger.error(`[ScrapeWorker] Job ${job?.id} failed:`, err.message);
    if (io) io.to('dashboard-viewers').emit('scrape:failed', { jobId: job?.id, error: err.message });
  });

  logger.info('[ScrapeWorker] Worker started');
}

export async function getQueueStatus() {
  const queue = getScrapeQueue();
  const [active, waiting, completed, failed] = await Promise.all([
    queue.getActiveCount(),
    queue.getWaitingCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);
  return { active, waiting, completed, failed };
}
