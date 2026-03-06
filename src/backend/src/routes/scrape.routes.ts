import { Router, Request, Response } from 'express';
import { getScrapeQueue, getQueueStatus } from '../jobs/scrapeQueue';
import { scrapeOrchestrator } from '../services/scraper/orchestrator';
import { logger } from '../utils/logger';

export const scrapeRoutes = Router();

scrapeRoutes.post('/trigger', async (req: Request, res: Response) => {
  try {
    const { city, sector, source } = req.body;
    if (!city) return res.status(400).json({ error: 'City is required' });

    const queue = getScrapeQueue();
    const job = await queue.add(
      `manual-${city.toLowerCase()}`,
      { city, sector, source },
      { attempts: 2, backoff: { type: 'exponential', delay: 30_000 } }
    );

    const io = req.app.get('io');
    if (io) io.emit('scrape:started', { jobId: job.id, city, sector, source, timestamp: new Date() });

    res.json({ jobId: job.id, message: 'Scrape job queued', city, sector, source });
  } catch (err: any) {
    logger.error('Scrape trigger error:', err.message);
    res.status(500).json({ error: 'Failed to trigger scrape' });
  }
});

// Direct scrape — bypasses BullMQ/Redis, runs synchronously
scrapeRoutes.post('/direct', async (req: Request, res: Response) => {
  try {
    const { city, sector, source } = req.body;
    if (!city) return res.status(400).json({ error: 'City is required' });

    logger.info(`[DirectScrape] Starting: ${city} / ${sector || 'all'} / ${source || 'all'}`);

    const io = req.app.get('io');
    if (io) io.emit('scrape:started', { city, sector, source, timestamp: new Date() });

    let count: number;
    if (source) {
      count = await scrapeOrchestrator.scrapeSource(source, city, sector);
    } else {
      count = await scrapeOrchestrator.scrapeAll(city, sector);
    }

    logger.info(`[DirectScrape] Done: ${count} listings saved for ${city}`);

    if (io) {
      io.emit('scrape:completed', { city, count });
      io.emit('dashboard:update', { type: 'scrape-complete', city, count });
    }

    res.json({ message: 'Scrape completed', city, sector, source, count });
  } catch (err: any) {
    logger.error('Direct scrape error:', err.message);
    res.status(500).json({ error: 'Scrape failed', detail: err.message });
  }
});

// Batch scrape — scrape multiple cities directly
scrapeRoutes.post('/batch', async (req: Request, res: Response) => {
  try {
    const { cities } = req.body;
    const cityList: string[] = cities || [
      'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune',
      'Kolkata', 'Ahmedabad', 'Jaipur', 'Indore',
    ];

    logger.info(`[BatchScrape] Starting for ${cityList.length} cities`);
    res.json({ message: 'Batch scrape started', cities: cityList });

    // Run in background (response already sent)
    let total = 0;
    for (const city of cityList) {
      try {
        const count = await scrapeOrchestrator.scrapeAll(city);
        total += count;
        logger.info(`[BatchScrape] ${city}: ${count} listings`);
      } catch (err: any) {
        logger.error(`[BatchScrape] ${city} failed: ${err.message}`);
      }
    }

    const io = req.app.get('io');
    if (io) io.emit('dashboard:update', { type: 'batch-complete', total });
    logger.info(`[BatchScrape] Complete: ${total} total listings`);
  } catch (err: any) {
    logger.error('Batch scrape error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Batch scrape failed' });
  }
});

scrapeRoutes.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await getQueueStatus();
    res.json(status);
  } catch (err: any) {
    logger.error('Queue status error:', err.message);
    res.json({ active: 0, waiting: 0, completed: 0, failed: 0 });
  }
});

scrapeRoutes.get('/drivers', (_req: Request, res: Response) => {
  const drivers = scrapeOrchestrator.getDrivers();
  res.json({ drivers });
});
