# Skills Mirage — Claude Code Master Config

## Project Overview
**Skills Mirage** is India's first open workforce intelligence system for HACKaMINeD 2026 by devx labs.
It connects job market signals (Layer 1) to personalized worker reskilling (Layer 2) with a knowledge graph overlay.

## Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│  Dashboard │ Worker Engine │ Chatbot │ Knowledge Graph   │
├─────────────────────────────────────────────────────────┤
│                    BACKEND (Express.js + Node)           │
│  Scrapers │ AI Services │ REST API │ WebSocket           │
├─────────────────────────────────────────────────────────┤
│              DATA LAYER (MongoDB + Redis)                │
│  Job Listings │ Worker Profiles │ Skills Graph │ Cache   │
├─────────────────────────────────────────────────────────┤
│            AI LAYER (Gemini CLI + Claude API)            │
│  Risk Scoring │ NLP │ Chatbot │ Graph Generation         │
└─────────────────────────────────────────────────────────┘
```

## UI Design System — STRICTLY FOLLOW devxlabs.ai
- **Dark theme**: `#0a0a0a` primary bg, NOT pure black
- **Accent**: Teal/cyan `#00d4aa` → `#00bcd4` gradient (their signature)
- **Typography**: Serif display headings (Playfair Display or similar italic serif), sans-serif body (Syne, DM Sans)
- **Grid**: Subtle crosshair grid overlay with `+` markers at intersections
- **Animations**: Diagonal dot-matrix pattern (teal dots flowing diagonally), aurora/light streak effects
- **Sections**: Dark → teal gradient transitions, white sections for portfolio/work
- **Navigation**: Minimal top nav, `GET IN TOUCH` CTA with border
- **Content labels**: Bracketed labels like `[ AI-native CX partner ]`
- **Numbered sections**: `[01]`, `[02]`, `[03]` with serif headings
- **Hover states**: Smooth transitions, underline reveals
- **Cards**: Subtle border, translucent backgrounds, no heavy shadows

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + Three.js (knowledge graph) + Framer Motion
- **Backend**: Express.js + TypeScript + MongoDB (Mongoose) + Redis + Socket.IO
- **AI**: Gemini CLI (primary workhorse for scraping/NLP), Claude API (chatbot intelligence)
- **Scraping**: Puppeteer + Cheerio (Naukri, LinkedIn via Apify), GitHub API
- **Knowledge Graph**: Three.js force-directed graph + D3.js for layout calculations
- **Deployment**: Docker Compose (MongoDB + Redis + App)

## Gemini CLI Integration
Gemini CLI is used as the primary AI workhorse for:
1. **Job posting NLP** — Extract skills, seniority, AI-vulnerability signals from raw JDs
2. **Resume parsing** — Extract structured data from uploaded resumes
3. **GitHub scraping analysis** — Analyze repos for tech stack, contribution patterns
4. **Risk score computation** — Feed market signals + worker profile → score
5. **Reskilling path generation** — Match worker skills to rising roles with course mapping

### How to use Gemini CLI in tasks:
```bash
# Install globally
npm install -g @anthropic-ai/gemini-cli  # or use npx

# In backend services, call via subprocess:
import { exec } from 'child_process';

# Or use the Gemini API directly:
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
```

## Subagent Architecture
Each agent has a dedicated skill file in `.claude/skills/`:
| Agent | Role | Primary AI |
|-------|------|------------|
| `ui-agent` | Implements all frontend components strictly matching devxlabs.ai | — |
| `frontend-agent` | React architecture, state management, routing | — |
| `backend-agent` | Express API, DB schemas, WebSocket | — |
| `scraper-agent` | Naukri/LinkedIn/GitHub scraping pipelines | Gemini |
| `knowledge-graph-agent` | Three.js graph from resume + GitHub data | Gemini |
| `chatbot-agent` | Context-aware EN+HI chatbot | Claude API |

## Key Commands
```bash
# Development
npm run dev           # Start both frontend + backend
npm run dev:frontend  # Frontend only (Vite dev server)
npm run dev:backend   # Backend only (nodemon)

# Scraping
npm run scrape:naukri  # Run Naukri scraper
npm run scrape:github  # Scrape GitHub profile

# Database
npm run db:seed        # Seed with sample data
npm run db:migrate     # Run migrations

# Build
npm run build          # Production build
docker-compose up      # Full stack with Docker
```

## Scoring Priority (from deck)
1. **25%** Technical complexity & architecture
2. **20%** Problem depth & real-world applicability
3. **20%** Reskilling path quality (city-matched, weekly, real resources)
4. **15%** Chatbot intelligence (5 question types, Hindi support)
5. **10%** Layer integration (L1 ↔ L2 live propagation)
6. **10%** Layer 1 live signal quality

## File Conventions
- Components: PascalCase (`HiringTrends.tsx`)
- Hooks: camelCase with `use` prefix (`useJobData.ts`)
- Utils: camelCase (`calculateRiskScore.ts`)
- API routes: kebab-case (`/api/v1/job-market`)
- Types: PascalCase with `.types.ts` suffix
