# Skills Mirage — Setup Plan & Build Guide

## Quick Start

```bash
# 1. Unzip the project
unzip skills-mirage.zip && cd skills-mirage

# 2. Copy environment variables
cp .env.example .env
# → Fill in GEMINI_API_KEY, CLAUDE_API_KEY, GITHUB_TOKEN

# 3. Start infrastructure
docker-compose up -d mongodb redis

# 4. Install dependencies
npm install                          # Root workspace
cd src/frontend && npm install       # Frontend
cd ../backend && npm install         # Backend

# 5. Run development
npm run dev                          # Starts both frontend + backend
```

## Using Claude Code with this Project

### Open the project:
```bash
cd skills-mirage
claude
```

Claude Code will automatically read `CLAUDE.md` and understand the full architecture.

### How subagents work:
The `.claude/skills/` directory contains 6 specialized agents. When you ask Claude Code to work on a specific area, reference the agent:

```
# UI work
"Follow the ui-agent skill and build the Navbar component matching devxlabs.ai exactly"

# Backend work
"Follow backend-agent skill — implement the /api/v1/dashboard/hiring-trends endpoint"

# Scraping
"Follow scraper-agent skill — build the Naukri scraper with Gemini NLP extraction"

# Knowledge graph
"Follow knowledge-graph-agent skill — implement the Three.js force-directed graph"

# Chatbot
"Follow chatbot-agent skill — wire up the Claude API chatbot with Hindi support"
```

### Using Gemini CLI in Claude Code tasks:
Gemini is the primary AI workhorse. Claude Code can invoke Gemini through the backend:

```bash
# Install Gemini SDK
cd src/backend && npm install @google/generative-ai

# In Claude Code, when implementing AI services:
"Implement the GeminiService class in src/backend/src/services/ai/gemini.service.ts
 using the @google/generative-ai SDK. It should handle:
 - Job description NLP extraction
 - Resume parsing
 - GitHub repo analysis
 - Risk score computation
 Use gemini-2.0-flash model for speed."
```

Alternatively, use Gemini CLI directly:
```bash
# Install Gemini CLI globally
npm install -g @anthropic-ai/gemini-cli

# Use in scraping scripts:
echo "Extract skills from: {job_description}" | gemini
```

## Build Order (48-hour hackathon strategy)

### Phase 1: Foundation (Hours 0–6)
```
Priority: Get the skeleton running end-to-end

1. [ ] npm install all dependencies
2. [ ] MongoDB + Redis via Docker
3. [ ] Backend Express server running on :5000
4. [ ] Frontend Vite dev server on :3000 with proxy
5. [ ] Socket.IO connection verified
6. [ ] Basic routing working (all 5 pages load)
7. [ ] Tailwind + devxlabs theme applied globally
8. [ ] Navbar + GridOverlay components done
```

### Phase 2: Layer 1 — Dashboard (Hours 6–16)
```
Priority: Live data pipeline = highest scoring component

1. [ ] Naukri Kaggle CSV seed data loaded into MongoDB
2. [ ] Naukri live scraper (Puppeteer) — at least 5 cities
3. [ ] Gemini NLP extraction pipeline for job descriptions
4. [ ] Tab A: Hiring Trends — Recharts time-series by city/sector
5. [ ] Tab B: Skills Intelligence — Rising/declining bars
6. [ ] Tab C: AI Vulnerability Index — Score computation + heatmap
7. [ ] Methodology panel — transparent weights visible
8. [ ] Live refresh button → triggers scrape → Socket.IO update
9. [ ] Time range selector (7d/30d/90d/1yr)
```

### Phase 3: Layer 2 — Worker Engine (Hours 16–28)
```
Priority: Risk score reactivity = demo showstopper

1. [ ] Worker form (4 inputs) → POST to backend
2. [ ] Gemini NLP: extract skills from write-up
3. [ ] Risk score computation using Layer 1 signals
4. [ ] Animated risk gauge (SVG arc, 0-100)
5. [ ] Risk factors breakdown (why this score)
6. [ ] Reskilling path generation (Gemini + NPTEL/SWAYAM data)
7. [ ] Week-by-week timeline component with real course links
8. [ ] L1→L2 propagation: dashboard change → risk recalculation
9. [ ] Socket.IO: live risk update on screen
```

### Phase 4: Chatbot (Hours 28–36)
```
Priority: Context-awareness = judges will test this live

1. [ ] Claude API integration with context-injected system prompt
2. [ ] Chat UI: message bubbles, markdown, typing indicator
3. [ ] 5 question types working:
   a. "Why is my risk score high?" (cites L1 data)
   b. "What jobs are safer?" (queries vulnerability index)
   c. "Paths under 3 months" (time-constrained reskill)
   d. "How many BPO jobs in Indore?" (live L1 count)
   e. Hindi question (Gemini translate pipeline)
4. [ ] Language toggle: EN ↔ हिंदी
5. [ ] Quick action buttons for 5 question types
```

### Phase 5: Knowledge Graph (Hours 36–42)
```
Priority: Bonus feature — differentiation from other teams

1. [ ] Resume upload → pdf-parse → Gemini structured extraction
2. [ ] GitHub scraper → Octokit → all repos + languages
3. [ ] Gemini: merge into graph nodes + edges
4. [ ] Three.js scene with @react-three/fiber
5. [ ] Force-directed layout (d3-force-3d)
6. [ ] Node rendering with glow effects
7. [ ] Edge lines with flowing particles
8. [ ] Click-to-focus + detail panel
9. [ ] Category filter controls
```

### Phase 6: Polish & Demo Prep (Hours 42–48)
```
1. [ ] Landing page animations (diagonal dots, entrance stagger)
2. [ ] Displacement Early Warning (bonus feature)
3. [ ] Employer-Side View (bonus feature)
4. [ ] Mobile responsiveness check
5. [ ] Error handling & loading states
6. [ ] Demo script rehearsal
7. [ ] Seed impressive demo data
```

## Folder Structure Reference

```
skills-mirage/
├── CLAUDE.md                           # ← Master config for Claude Code
├── .claude/
│   └── skills/                         # ← Subagent skill files
│       ├── ui-agent/SKILL.md           # devxlabs.ai design system
│       ├── frontend-agent/SKILL.md     # React architecture
│       ├── backend-agent/SKILL.md      # Express API + DB
│       ├── scraper-agent/SKILL.md      # Data pipeline + Gemini NLP
│       ├── knowledge-graph-agent/SKILL.md  # Three.js graph
│       └── chatbot-agent/SKILL.md      # Claude API + Hindi
├── src/
│   ├── frontend/                       # React + Vite + Three.js
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── layout/             # Navbar, GridOverlay, Footer
│   │   │   │   ├── dashboard/          # Layer 1 components
│   │   │   │   ├── worker/             # Layer 2 components
│   │   │   │   ├── chatbot/            # Chat UI
│   │   │   │   ├── knowledge-graph/    # Three.js graph
│   │   │   │   └── shared/             # Button, Card, Badge, etc.
│   │   │   ├── pages/                  # Route pages
│   │   │   ├── hooks/                  # Custom hooks
│   │   │   ├── stores/                 # Zustand stores
│   │   │   ├── utils/                  # Helpers
│   │   │   ├── styles/                 # CSS + animations
│   │   │   ├── i18n/                   # EN + HI translations
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── tailwind.config.js
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── backend/                        # Express + MongoDB
│       ├── src/
│       │   ├── routes/                 # API endpoints
│       │   ├── controllers/
│       │   ├── services/
│       │   │   ├── ai/                 # Gemini + Claude services
│       │   │   └── scraper/            # Naukri, LinkedIn, GitHub
│       │   ├── models/                 # Mongoose schemas
│       │   ├── middleware/
│       │   ├── socket/                 # Socket.IO handlers
│       │   ├── jobs/                   # BullMQ queues
│       │   └── utils/
│       ├── config/
│       └── package.json
├── shared/
│   └── types/index.ts                  # Shared TypeScript types
├── docker-compose.yml                  # MongoDB + Redis + App
├── .env.example
├── .gitignore
└── package.json                        # Root workspace
```

## Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| State management | Zustand | Lightweight, no boilerplate, perfect for hackathon |
| AI for NLP | Gemini 2.0 Flash | Fast, cheap, great for structured extraction |
| AI for chatbot | Claude API | Superior context handling, nuanced responses |
| Charting | Recharts | React-native, easy dark theming |
| 3D Graph | Three.js + R3F | Production-grade, React integration via fiber |
| Graph layout | d3-force-3d | Standard force-directed algorithm |
| Job queue | BullMQ | Redis-backed, reliable for scraping jobs |
| Styling | Tailwind + CSS vars | Fast iteration, custom theme extends devxlabs |

## Demo Script (for judges)

1. **Open Dashboard** → Show Tab A (hiring trends), filter by Pune, 30d
2. **Click Tab C** → Show AI Vulnerability heatmap, hover over Pune BPO
3. **Click Methodology** → Show transparent scoring weights
4. **Switch to Worker Engine** → Enter: "Senior Executive, BPO" / Pune / 8 years / write-up
5. **Watch risk score animate** → 74/100 HIGH RISK
6. **Show reskilling path** → Week-by-week with NPTEL/SWAYAM links
7. **Open Chatbot** → Ask "Why is my risk score so high?"
8. **Ask in Hindi** → "मुझे क्या करना चाहिए?"
9. **Go back to Dashboard** → Hit REFRESH LIVE → show data updating
10. **Show risk score change** → L1 update propagates to L2
11. **Open Knowledge Graph** → Upload resume + GitHub → show 3D graph
12. **Navigate graph** → Click skill nodes, show connections

## Environment Setup Notes

### Gemini API Key
1. Go to https://aistudio.google.com/apikey
2. Create a new API key
3. Add to `.env` as `GEMINI_API_KEY`

### Claude API Key (for chatbot)
1. Go to https://console.anthropic.com/
2. Create API key
3. Add to `.env` as `CLAUDE_API_KEY`

### GitHub Token (for graph scraping)
1. Go to https://github.com/settings/tokens
2. Generate fine-grained token with `public_repo` read access
3. Add to `.env` as `GITHUB_TOKEN`

### Apify Token (optional, for LinkedIn)
1. Sign up at https://apify.com/
2. Get API token from settings
3. Add to `.env` as `APIFY_TOKEN`
