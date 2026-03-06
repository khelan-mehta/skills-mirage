# Scraper Agent — Data Pipeline & Intelligence Extraction

## Role
You build all scraping pipelines. Gemini is your primary tool for NLP extraction.
Every scraper must produce STRUCTURED data that feeds Layer 1 analytics.

## Data Sources (from deck)

| Source | Method | Frequency | Priority |
|--------|--------|-----------|----------|
| Naukri (Kaggle) | Direct download | One-time seed | P0 |
| Naukri Live | Puppeteer/Apify | Every 6 hours | P0 |
| LinkedIn India | Apify actor | Every 12 hours | P1 |
| NPTEL Catalog | Cheerio scrape | Weekly | P1 |
| SWAYAM Courses | Cheerio scrape | Weekly | P1 |
| PLFS Microdata | CSV download | Quarterly | P2 |
| PMKVY Data | data.gov.in API | Monthly | P2 |
| GitHub Profiles | GitHub REST API | On-demand | P0 (graph) |
| WEF Reports | PDF parse | One-time | P2 |

## Naukri Scraper
```typescript
// scrapers/naukri.scraper.ts
class NaukriScraper {
  // Use Puppeteer for dynamic content
  // Target: naukri.com/jobs-in-{city}?experience={range}&keyword={sector}

  async scrapeCity(city: string, sector?: string): Promise<RawJobListing[]> {
    // 1. Navigate to search results
    // 2. Extract: title, company, skills, salary, description
    // 3. Paginate through results (max 50 pages per city)
    // 4. Pass each JD through Gemini for NLP extraction
    // 5. Store raw + processed in MongoDB
    // 6. Emit socket event for live dashboard update
  }

  async processWithGemini(rawListings: RawJobListing[]): Promise<ProcessedListing[]> {
    // Batch process through Gemini:
    // - Skill extraction
    // - AI vulnerability signal detection
    // - Sector classification
    // - Salary normalization
  }
}
```

## GitHub Scraper (for Knowledge Graph)
```typescript
// scrapers/github.scraper.ts
class GitHubScraper {
  private octokit; // @octokit/rest

  async scrapeProfile(username: string): Promise<GitHubProfile> {
    // 1. GET /users/{username} — bio, location, company
    // 2. GET /users/{username}/repos?sort=updated — all repos
    // 3. For each repo:
    //    - GET /repos/{owner}/{repo}/languages — tech stack
    //    - GET /repos/{owner}/{repo}/topics — topics/tags
    //    - GET /repos/{owner}/{repo}/readme — README content
    //    - Contribution stats (commits, issues, PRs)
    // 4. Feed through Gemini for analysis:
    //    - "Analyze these GitHub repos and extract:
    //       skills, expertise areas, project types,
    //       collaboration patterns, tech stack proficiency levels"
    // 5. Return structured graph-ready data
  }

  async analyzeWithGemini(repos: RepoData[]): Promise<GraphNodes[]> {
    const prompt = `Analyze this developer's GitHub repos:
    ${JSON.stringify(repos)}

    Generate a knowledge graph with:
    - Skill nodes (with proficiency: beginner/intermediate/advanced)
    - Project nodes (with description, tech stack)
    - Language nodes (with LOC count)
    - Topic/domain nodes
    - Edges connecting them (uses, built_with, contributes_to)

    Return as JSON: { nodes: [...], edges: [...] }`;

    return await gemini.generateContent(prompt);
  }
}
```

## Resume Parser (for Knowledge Graph)
```typescript
// services/ai/resumeParser.ts
class ResumeParser {
  async parse(fileBuffer: Buffer, mimeType: string): Promise<ResumeData> {
    // 1. If PDF: extract text via pdf-parse
    // 2. Feed to Gemini:
    const prompt = `Parse this resume into structured JSON:
    {
      name, email, phone, location,
      education: [{ institution, degree, year, gpa }],
      experience: [{ company, title, duration, description, skills }],
      skills: { technical: [], soft: [], tools: [], languages: [] },
      certifications: [{ name, issuer, year }],
      projects: [{ name, description, techStack, url }],
      summary: string
    }
    Resume text: ${resumeText}`;

    // 3. Return structured data ready for graph construction
  }
}
```

## AI Vulnerability Index Computation
```typescript
// This is the CORE intelligence — not a black box
function computeVulnerabilityIndex(role: string, city: string, signals: MarketSignals): VulnerabilityScore {
  // Methodology (must be visible in UI):
  const weights = {
    hiringDeclineRate: 0.30,     // % decline in postings for this role/city
    aiToolMentionRate: 0.25,     // % of JDs mentioning AI tools
    roleReplacementRatio: 0.20,  // ratio of AI-augmented roles replacing this role
    automationFeasibility: 0.15, // WEF/research-based automation score
    salaryCompression: 0.10,     // salary trend (declining = higher risk)
  };

  let score = 0;
  const factors = [];

  // Each factor computed from REAL scraped data
  const hiringDecline = calculateHiringDecline(role, city, signals.jobListings);
  score += hiringDecline * weights.hiringDeclineRate;
  factors.push({ signal: `${role} hiring ${hiringDecline > 50 ? 'declining' : 'stable'} in ${city}`, weight: hiringDecline });

  // ... similar for each factor

  return {
    score: Math.round(score),
    level: score > 80 ? 'CRITICAL' : score > 60 ? 'HIGH' : score > 40 ? 'MEDIUM' : 'LOW',
    factors,
    methodology: weights, // TRANSPARENT — shown in UI
    computedAt: new Date(),
  };
}
```

## Scraping Schedule (BullMQ)
```typescript
// jobs/scheduledScrape.ts
const scrapeSchedule = [
  { name: 'naukri-tier1', cron: '0 */6 * * *', cities: TIER_1_CITIES },
  { name: 'naukri-tier2', cron: '0 */12 * * *', cities: TIER_2_CITIES },
  { name: 'linkedin-all', cron: '0 0 */12 * * *', cities: ALL_CITIES },
  { name: 'courses-refresh', cron: '0 0 0 * * 0', sources: ['nptel', 'swayam'] },
];
```

## Rate Limiting & Ethics
- Naukri: max 100 requests/hour, random delays 2-5s
- LinkedIn: use Apify actors (they handle rate limits)
- GitHub API: 5000 requests/hour with token
- ALWAYS respect robots.txt
- Cache aggressively in Redis (TTL: 6 hours for jobs, 1 week for courses)
