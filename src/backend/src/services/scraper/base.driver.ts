export interface ScrapeResult {
  title: string;
  company: string;
  city: string;
  description: string;
  salary?: { min: number; max: number };
  skills?: string[];
  source: string;
  sourceUrl?: string;
}

export interface ScrapeOptions {
  maxPages?: number;
  pageDelay?: { min: number; max: number };
}

export interface DriverStatus {
  name: string;
  source: string;
  enabled: boolean;
  lastRun?: Date;
  lastResultCount?: number;
  lastError?: string;
}

export abstract class BaseScrapeDriver {
  abstract name: string;
  abstract source: string;

  protected _lastRun?: Date;
  protected _lastResultCount?: number;
  protected _lastError?: string;

  abstract scrape(city: string, sector?: string, opts?: ScrapeOptions): Promise<ScrapeResult[]>;

  get status(): DriverStatus {
    return {
      name: this.name,
      source: this.source,
      enabled: this.isEnabled(),
      lastRun: this._lastRun,
      lastResultCount: this._lastResultCount,
      lastError: this._lastError,
    };
  }

  protected isEnabled(): boolean {
    return true;
  }

  protected randomDelay(range: { min: number; max: number }): Promise<void> {
    const ms = range.min + Math.random() * (range.max - range.min);
    return new Promise((r) => setTimeout(r, ms));
  }
}
