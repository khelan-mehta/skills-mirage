import { BaseScrapeDriver, ScrapeResult, ScrapeOptions } from './base.driver';
import { logger } from '../../utils/logger';

/**
 * LinkedIn driver — uses Remotive public API (free, no auth) for real tech job listings.
 * Returns remote/global tech jobs with skills tags.
 */
export class LinkedInDriver extends BaseScrapeDriver {
  name = 'LinkedIn (via Apify)';
  source = 'linkedin' as const;

  private readonly apiBase = 'https://remotive.com/api/remote-jobs';

  protected isEnabled(): boolean {
    return true; // Always enabled — free API, no key needed
  }

  async scrape(city: string, sector?: string, _opts?: ScrapeOptions): Promise<ScrapeResult[]> {
    const results: ScrapeResult[] = [];

    try {
      // Map sector to Remotive category if possible
      const categoryMap: Record<string, string> = {
        'IT': 'software-dev',
        'Software': 'software-dev',
        'Data': 'data',
        'Design': 'design',
        'Marketing': 'marketing',
        'Sales': 'sales',
        'DevOps': 'devops-sysadmin',
        'QA': 'qa',
        'Product': 'product',
        'Finance': 'finance-legal',
        'HR': 'hr',
        'Customer Support': 'customer-support',
      };

      const category = sector ? categoryMap[sector] || '' : '';
      const url = category
        ? `${this.apiBase}?category=${category}&limit=50`
        : `${this.apiBase}?limit=50`;

      logger.info(`[LinkedInDriver] Fetching from Remotive: ${url}`);

      const resp = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!resp.ok) {
        logger.warn(`[LinkedInDriver] HTTP ${resp.status}`);
        return results;
      }

      const data = await resp.json() as any;
      const jobs = data.jobs || [];

      for (const job of jobs) {
        const title = job.title?.trim();
        const company = job.company_name?.trim();
        if (!title || !company) continue;

        const skills: string[] = (job.tags || [])
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0 && t.length < 60);

        // Strip HTML from description
        const description = (job.description || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 3000);

        // Parse salary if available
        let salary: { min: number; max: number } | undefined;
        if (job.salary) {
          const match = job.salary.match(/\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/);
          if (match) {
            const min = parseInt(match[1].replace(/,/g, ''), 10);
            const max = parseInt(match[2].replace(/,/g, ''), 10);
            // Convert USD annual to INR LPA (rough: 1 USD = 83 INR)
            salary = {
              min: Math.round(min * 83),
              max: Math.round(max * 83),
            };
          }
        }

        results.push({
          title,
          company,
          city, // Tag with requested city for relevance
          description: description || title,
          salary,
          skills,
          source: this.source,
          sourceUrl: job.url || undefined,
        });
      }

      this._lastRun = new Date();
      this._lastResultCount = results.length;
      this._lastError = undefined;
      logger.info(`[LinkedInDriver] Completed: ${results.length} jobs for ${city}`);
    } catch (err: any) {
      this._lastError = err.message;
      logger.error(`[LinkedInDriver] Scrape failed for ${city}:`, err.message);
    }

    return results;
  }
}
