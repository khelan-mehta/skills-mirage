import cron from 'node-cron';
import { getScrapeQueue } from './scrapeQueue';
import { logger } from '../utils/logger';

const SCRAPE_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune',
  'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Indore',
  'Coimbatore', 'Kochi', 'Nagpur', 'Noida', 'Gurgaon', 'Thiruvananthapuram',
  'Bhopal', 'Visakhapatnam', 'Vadodara', 'Surat',
];

export function startScheduler() {
  // Daily at 2:00 AM IST (20:30 UTC previous day)
  cron.schedule('30 20 * * *', async () => {
    logger.info('[Scheduler] Starting daily scrape cycle');
    const queue = getScrapeQueue();

    for (const city of SCRAPE_CITIES) {
      await queue.add(
        `daily-${city.toLowerCase()}`,
        { city, source: undefined, sector: undefined },
        { attempts: 2, backoff: { type: 'exponential', delay: 60_000 } }
      );
    }

    logger.info(`[Scheduler] Enqueued ${SCRAPE_CITIES.length} scrape jobs`);
  });

  logger.info('[Scheduler] Cron scheduled: daily at 2:00 AM IST');
}
