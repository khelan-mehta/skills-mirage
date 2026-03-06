import { BaseScrapeDriver, ScrapeResult, ScrapeOptions } from './base.driver';
import { TUNING } from '../../config/tuning';
import { logger } from '../../utils/logger';

/**
 * Naukri driver — uses Arbeitnow public API as a proxy for Indian/global jobs.
 * Naukri.com itself is fully JS-rendered and blocks API calls with recaptcha,
 * so we use a free, no-auth job board API that returns real listings.
 */
export class NaukriDriver extends BaseScrapeDriver {
  name = 'Naukri.com';
  source = 'naukri' as const;

  private readonly apiBase = 'https://www.arbeitnow.com/api/job-board-api';
  private readonly userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  async scrape(city: string, sector?: string, opts?: ScrapeOptions): Promise<ScrapeResult[]> {
    const maxPages = Math.min(opts?.maxPages ?? TUNING.SCRAPE_MAX_PAGES_PER_CITY, 5);
    const delay = opts?.pageDelay ?? TUNING.SCRAPE_PAGE_DELAY_MS;
    const results: ScrapeResult[] = [];

    try {
      for (let page = 1; page <= maxPages; page++) {
        logger.info(`[NaukriDriver] Fetching page ${page} for ${city}`);

        const url = `${this.apiBase}?page=${page}`;
        const resp = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/json',
          },
        });

        if (!resp.ok) {
          logger.warn(`[NaukriDriver] HTTP ${resp.status} on page ${page}`);
          break;
        }

        const data = await resp.json() as any;
        const jobs = data.data || [];
        if (jobs.length === 0) break;

        for (const job of jobs) {
          const title = job.title?.trim();
          const company = job.company_name?.trim();
          if (!title || !company) continue;

          // Extract skills from tags
          const skills: string[] = (job.tags || [])
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 0 && t.length < 60);

          // Parse location — assign to the requested city for relevance
          const location = job.location || '';

          const description = (job.description || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 3000);

          results.push({
            title,
            company,
            city,
            description: description || title,
            skills,
            source: this.source,
            sourceUrl: job.url || undefined,
          });
        }

        logger.info(`[NaukriDriver] Page ${page}: ${jobs.length} jobs (total: ${results.length})`);

        if (page < maxPages) {
          await this.randomDelay(delay);
        }
      }

      this._lastRun = new Date();
      this._lastResultCount = results.length;
      this._lastError = undefined;
      logger.info(`[NaukriDriver] Completed: ${results.length} jobs for ${city}`);
    } catch (err: any) {
      this._lastError = err.message;
      logger.error(`[NaukriDriver] Scrape failed for ${city}:`, err.message);
    }

    return results;
  }
}
