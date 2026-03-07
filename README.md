<div align="center">

# Skills Mirage

**India's first open workforce intelligence system**

Built for **HACKaMINeD 2026** by Team Phoenix

[![React](https://img.shields.io/badge/React_18-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com)
[![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat&logo=three.js&logoColor=white)](https://threejs.org)

<br/>

<img src="docs/banner.png" alt="Skills Mirage Preview" width="800"/>

*Real-time job market signals → personalized reskilling paths → interactive knowledge graphs*

</div>

---

## The Problem

Millions of Indian workers face AI-driven job displacement with **zero visibility** into which skills are declining, which are rising, and what to do about it. Government portals are static. Job boards show listings, not intelligence.

## The Solution

Skills Mirage connects **live job market data** (Layer 1) to **personalized reskilling engines** (Layer 2), overlaid with an interactive **knowledge graph** — all in real-time.

---

## Architecture

```
 ┌──────────────────────────────────────────────────────────┐
 │              FRONTEND  ·  React + Vite + Three.js        │
 │   Dashboard  ·  Worker Engine  ·  Chatbot  ·  KG Viz    │
 ├──────────────────────────────────────────────────────────┤
 │              BACKEND   ·  Express + Socket.IO            │
 │   Scrapers  ·  AI Services  ·  REST API  ·  WebSocket   │
 ├──────────────────────────────────────────────────────────┤
 │              DATA      ·  MongoDB + Redis                │
 │   Job Listings  ·  Worker Profiles  ·  Skills Graph      │
 ├──────────────────────────────────────────────────────────┤
 │              AI        ·  Gemini 2.0 Flash + Claude API  │
 │   Risk Scoring  ·  NLP  ·  Chatbot  ·  Graph Gen        │
 └──────────────────────────────────────────────────────────┘
```

---

## Features

### `[01]` Job Market Dashboard
- Live scraping from **Naukri + LinkedIn** across 22 cities (Tier 1–3)
- Hiring trends by city, sector, and role — updated in real-time
- Skills intelligence: rising vs declining, week-over-week delta
- **AI Vulnerability Index** (0–100) with transparent scoring methodology

### `[02]` Worker Intelligence Engine
- 4 inputs: job title + city + experience + write-up
- Personal **AI Risk Score** (0–100) that reacts to live market data
- Week-by-week reskilling path with real **NPTEL / SWAYAM / PMKVY** courses
- City-matched recommendations — not generic advice

### `[03]` AI Chatbot
- Context-aware assistant in **English + Hindi**
- 5 question types: risk, skills, courses, market trends, career advice
- Powered by Claude API with full conversation memory

### `[04]` Knowledge Graph
- Upload resume + GitHub URL
- Interactive **3D force-directed graph** (Three.js)
- Maps skills, projects, repos, certifications — all connected
- Gemini-powered extraction from unstructured data

---

## Tech Stack

| Layer | Stack |
|:------|:------|
| **Frontend** | React 18, Vite, TypeScript, TailwindCSS, Framer Motion, Three.js |
| **Backend** | Express.js, TypeScript, MongoDB (Mongoose), Redis, Socket.IO |
| **AI** | Gemini 2.0 Flash (NLP/scraping), Claude API (chatbot) |
| **Scraping** | Puppeteer, Cheerio, Octokit, Apify |
| **Graph** | @react-three/fiber, d3-force-3d |
| **Deploy** | Docker Compose |

---

## Quick Start

```bash
# clone & setup
git clone https://github.com/your-org/skills-mirage.git
cd skills-mirage
cp .env.example .env          # add your API keys

# infrastructure
docker-compose up -d          # MongoDB + Redis

# install & run
npm install
npm run db:seed               # seed 5000 job listings
npm run dev                   # frontend + backend
```

Open `http://localhost:5173`

---

## Project Structure

```
src/
├── frontend/                 # React + Vite app
│   ├── components/           # UI components (PascalCase)
│   ├── hooks/                # Custom hooks (useX)
│   ├── pages/                # Route pages
│   └── utils/                # Helpers
├── backend/                  # Express API
│   ├── routes/               # REST endpoints
│   ├── services/             # Business logic + AI
│   ├── models/               # Mongoose schemas
│   └── scripts/              # Seeders, scrapers
└── shared/                   # Shared types
```

---

## Scripts

| Command | Description |
|:--------|:------------|
| `npm run dev` | Start frontend + backend |
| `npm run dev:frontend` | Vite dev server only |
| `npm run dev:backend` | Express with nodemon |
| `npm run scrape:naukri` | Run Naukri scraper |
| `npm run scrape:github` | Scrape GitHub profiles |
| `npm run db:seed` | Seed sample data |
| `npm run build` | Production build |

---

## Design System

UI strictly follows the [devxlabs.ai](https://devxlabs.ai) aesthetic:

- **Dark theme** — `#0a0a0a` base, never pure black
- **Teal accent** — `#00d4aa` → `#00bcd4` gradient
- **Typography** — Playfair Display (headings), DM Sans (body)
- **Grid** — Crosshair overlay with `+` markers
- **Motion** — Diagonal dot-matrix, aurora streaks, smooth reveals

---

<div align="center">

**Built with sleep deprivation and Claude Code**

[devx labs](https://devxlabs.ai)

</div>
