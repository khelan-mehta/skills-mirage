# Skills Mirage — Backend

## Architecture

```
Express.js + TypeScript + MongoDB + Redis + BullMQ + Socket.IO
```

## Changelog

### 2026-03-05 — Scraper Driver Architecture + Auth System

**Scraper Driver System** (`src/services/scraper/`)
- `base.driver.ts` — Abstract `BaseScrapeDriver` class with status tracking, delay helpers
- `naukri.driver.ts` — Naukri.com scraper using Cheerio + fetch (no browser)
- `linkedin.driver.ts` — LinkedIn stub (Apify-ready, enable via `APIFY_TOKEN`)
- `orchestrator.ts` — Registers drivers, runs them in parallel per city, NLP pipeline (normalize title + extract skills via OpenAI), upserts to JobListing with deduplication

To add a new scraper source:
1. Create `src/services/scraper/yoursite.driver.ts`
2. Extend `BaseScrapeDriver`, implement `scrape(city, sector, opts)`
3. Register in `orchestrator.ts` constructor

**Job Queue** (`src/jobs/`)
- `scrapeQueue.ts` — BullMQ queue + worker (ioredis), processes scrape jobs with configurable concurrency
- `scheduler.ts` — node-cron daily schedule (2 AM IST) for all 22 cities

**Authentication System**
- `src/models/User.ts` — User model (email/password + GitHub OAuth, profile link, starred jobs)
- `src/services/auth.service.ts` — JWT auth, bcrypt hashing, GitHub OAuth flow
- `src/middleware/auth.ts` — Route protection middleware
- `src/routes/auth.routes.ts` — Register, login, GitHub OAuth endpoints

**Route Protection**
- Public: `/api/v1/auth`, `/api/v1/dashboard`, `/api/v1/scrape`
- Protected: `/api/v1/chat`, `/api/v1/graph` (require JWT)
- Legacy: `/api/v1/worker` (unprotected, for backward compat)

**AI Services** — All use OpenAI (`gpt-4o-mini`) via single `OPENAI_API_KEY`:
- `gemini.service.ts` — NLP (skill extraction, resume parsing, reskilling, translation, graph building)
- `claude.service.ts` — Chatbot with context-aware system prompt
- `risk.service.ts` — 5-factor weighted risk scoring with WEF automation baselines

### 2026-03-05 — Initial Setup
- Express + MongoDB + Redis + Socket.IO scaffold
- 4 data models: JobListing, WorkerProfile, ChatMessage, GraphData
- Dashboard service with hiring trends, skills trends, vulnerability index
- Worker service with NLP pipeline (normalize → extract → risk score → reskill path)
- Knowledge graph from resume + GitHub data
- Seed script with 2000+ jobs across 22 Indian cities

## API Endpoints

### Auth (`/api/v1/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | - | Create account |
| POST | /login | - | Get JWT token |
| GET | /me | JWT | Current user info |
| GET | /github | - | Get GitHub OAuth URL |
| GET | /github/callback | - | GitHub OAuth callback |

### Dashboard (`/api/v1/dashboard`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /hiring-trends | - | Job posting trends by city/sector |
| GET | /skills | - | Rising/declining skills |
| GET | /vulnerability | - | AI vulnerability by city/role |
| GET | /vulnerability/heatmap | - | Heatmap data |
| GET | /methodology | - | Scoring weights |
| GET | /stats | - | Summary stats |
| POST | /refresh | - | Trigger dashboard refresh |

### Scraping (`/api/v1/scrape`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /trigger | - | Queue scrape job (city, sector, source) |
| GET | /status | - | BullMQ queue stats |
| GET | /drivers | - | List registered scraper drivers |

### Chat (`/api/v1/chat`) — Protected
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | / | JWT | Send chat message |
| GET | /:workerId/history | JWT | Chat history |

### Graph (`/api/v1/graph`) — Protected
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /build | JWT | Build knowledge graph |
| GET | /:id | JWT | Get graph data |
| GET | /:id/nodes | JWT | Get nodes |
| GET | /:id/edges | JWT | Get edges |

## Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/skills-mirage
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:5000/api/v1/auth/github/callback
APIFY_TOKEN=...          # optional, enables LinkedIn driver
GITHUB_TOKEN=...         # optional, for unauthenticated GitHub API
```
