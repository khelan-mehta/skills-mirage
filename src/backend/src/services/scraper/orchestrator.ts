import { BaseScrapeDriver, ScrapeResult, ScrapeOptions } from './base.driver';
import { NaukriDriver } from './naukri.driver';
import { LinkedInDriver } from './linkedin.driver';
import { JobListing } from '../../models/JobListing';
import { geminiService } from '../ai/gemini.service';
import { logger } from '../../utils/logger';
import { TUNING } from '../../config/tuning';
import { Semaphore } from '../../lib/concurrency';

class ScrapeOrchestrator {
  private drivers: BaseScrapeDriver[] = [];
  private nlpSemaphore = new Semaphore(TUNING.NLP_QUEUE_CONCURRENCY);

  constructor() {
    this.register(new NaukriDriver());
    this.register(new LinkedInDriver());
  }

  register(driver: BaseScrapeDriver) {
    this.drivers.push(driver);
    logger.info(`[Orchestrator] Registered driver: ${driver.name} (${driver.source})`);
  }

  getDrivers() {
    return this.drivers.map((d) => d.status);
  }

  getDriver(source: string): BaseScrapeDriver | undefined {
    return this.drivers.find((d) => d.source === source);
  }

  /** Run all enabled drivers in parallel for a city */
  async scrapeAll(city: string, sector?: string, opts?: ScrapeOptions): Promise<number> {
    const enabledDrivers = this.drivers.filter((d) => d.status.enabled);
    if (enabledDrivers.length === 0) {
      logger.warn('[Orchestrator] No enabled drivers');
      return 0;
    }

    logger.info(`[Orchestrator] Scraping ${city} with ${enabledDrivers.length} drivers`);

    const results = await Promise.allSettled(
      enabledDrivers.map((driver) => driver.scrape(city, sector, opts))
    );

    let totalSaved = 0;
    const allRawResults: ScrapeResult[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const driver = enabledDrivers[i];
      if (result.status === 'fulfilled') {
        allRawResults.push(...result.value);
        logger.info(`[Orchestrator] ${driver.name}: ${result.value.length} scraped`);
      } else {
        logger.error(`[Orchestrator] ${driver.name} failed: ${result.reason}`);
      }
    }

    // Quick save — insert all jobs with raw data immediately
    totalSaved = await this.quickSave(allRawResults);
    logger.info(`[Orchestrator] Quick-saved ${totalSaved} jobs for ${city}`);

    // NLP enrichment — runs in background, don't await
    this.enrichWithNLP(allRawResults).catch((err) =>
      logger.error(`[Orchestrator] Background NLP enrichment error: ${err.message}`)
    );

    return totalSaved;
  }

  /** Run a single driver */
  async scrapeSource(source: string, city: string, sector?: string, opts?: ScrapeOptions): Promise<number> {
    const driver = this.getDriver(source);
    if (!driver) throw new Error(`Unknown driver: ${source}`);
    if (!driver.status.enabled) throw new Error(`Driver ${source} is not enabled`);

    const results = await driver.scrape(city, sector, opts);

    const saved = await this.quickSave(results);
    logger.info(`[Orchestrator] Quick-saved ${saved} jobs from ${driver.name}`);

    // Background NLP
    this.enrichWithNLP(results).catch((err) =>
      logger.error(`[Orchestrator] Background NLP enrichment error: ${err.message}`)
    );

    return saved;
  }

  /**
   * Quick save — upsert jobs with raw data (no NLP).
   * Uses raw title, tags-as-skills, and basic metadata.
   * Jobs appear in the UI immediately.
   */
  private async quickSave(results: ScrapeResult[]): Promise<number> {
    let saved = 0;

    const ops = results.map((raw) => ({
      updateOne: {
        filter: {
          company: raw.company,
          title: raw.title,
          city: raw.city,
          source: raw.source,
        },
        update: {
          $set: {
            title: raw.title,
            normalizedTitle: raw.title.toLowerCase().trim(),
            company: raw.company,
            city: raw.city,
            sector: 'General',
            skills: raw.skills || [],
            salary: raw.salary || { min: 0, max: 0 },
            aiToolMentions: [] as string[],
            source: raw.source as 'naukri' | 'linkedin',
            scrapedAt: new Date(),
            rawDescription: (raw.description || '').slice(0, 5000),
            sourceUrl: raw.sourceUrl || '',
            vulnerabilitySignals: {
              aiReplacementRisk: 20,
              hiringTrend: 'stable' as const,
              automationKeywords: [] as string[],
            },
          },
        },
        upsert: true,
      },
    }));

    // Bulk write in chunks of 500
    for (let i = 0; i < ops.length; i += 500) {
      const batch = ops.slice(i, i + 500);
      try {
        const result = await JobListing.bulkWrite(batch);
        saved += (result.upsertedCount || 0) + (result.modifiedCount || 0);
      } catch (err: any) {
        logger.error(`[Orchestrator] Bulk save error: ${err.message}`);
      }
    }

    return saved;
  }

  /**
   * NLP enrichment — runs in background after quick save.
   * Updates existing jobs with normalized titles, extracted skills, AI signals.
   */
  private async enrichWithNLP(results: ScrapeResult[]): Promise<void> {
    logger.info(`[Orchestrator] Starting NLP enrichment for ${results.length} jobs...`);
    let enriched = 0;

    const batchSize = TUNING.GEMINI_BATCH_SIZE;
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map((raw) =>
          this.nlpSemaphore.acquire(async () => {
            try {
              const [normalizedTitle, extraction] = await Promise.all([
                geminiService.normalizeJobTitle(raw.title),
                geminiService.extractSkillsFromJD(raw.description),
              ]);

              await JobListing.updateOne(
                {
                  company: raw.company,
                  title: raw.title,
                  city: raw.city,
                  source: raw.source,
                },
                {
                  $set: {
                    normalizedTitle,
                    sector: extraction.sector || 'General',
                    skills: extraction.required_skills.length > 0
                      ? extraction.required_skills
                      : (raw.skills || []),
                    aiToolMentions: extraction.ai_tool_mentions,
                    vulnerabilitySignals: {
                      aiReplacementRisk: extraction.ai_tool_mentions.length > 0 ? 50 : 20,
                      hiringTrend: 'stable',
                      automationKeywords: extraction.automation_risk_signals,
                    },
                  },
                }
              );

              enriched++;
            } catch (err: any) {
              logger.error(`[Orchestrator] NLP failed for "${raw.title}": ${err.message}`);
            }
          })
        )
      );
    }

    logger.info(`[Orchestrator] NLP enrichment complete: ${enriched}/${results.length} jobs enriched`);
  }
}

export const scrapeOrchestrator = new ScrapeOrchestrator();
