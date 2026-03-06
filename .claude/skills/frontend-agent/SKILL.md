# Frontend Agent — React Architecture & Implementation

## Role
You build the React application. Always consult `ui-agent/SKILL.md` before writing any JSX.

## Stack
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (utility-first, custom theme extending devxlabs palette)
- Framer Motion (animations)
- Three.js + @react-three/fiber + @react-three/drei (knowledge graph)
- Recharts (dashboard charts, MUST be themed dark/teal)
- React Router v6 (routing)
- Zustand (state management — lightweight, no Redux bloat)
- Socket.IO client (real-time L1→L2 updates)
- React Query / TanStack Query (server state)
- react-markdown (chatbot responses)
- i18next (Hindi + English)

## Project Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx          # Top nav matching devxlabs
│   │   ├── GridOverlay.tsx     # Background crosshair grid
│   │   ├── DotMatrix.tsx       # Diagonal flowing dots (canvas)
│   │   ├── Footer.tsx
│   │   └── PageTransition.tsx  # Route transition wrapper
│   ├── dashboard/              # LAYER 1
│   │   ├── DashboardLayout.tsx # Tab container
│   │   ├── HiringTrends.tsx    # Tab A — volume by city/sector
│   │   ├── SkillsIntel.tsx     # Tab B — rising/declining skills
│   │   ├── VulnerabilityIndex.tsx # Tab C — AI risk heatmap
│   │   ├── CityHeatmap.tsx     # Map visualization
│   │   ├── TrendChart.tsx      # Reusable time-series
│   │   ├── SkillGapBar.tsx     # Hired vs trained comparison
│   │   └── MethodologyPanel.tsx # Transparent scoring
│   ├── worker/                 # LAYER 2
│   │   ├── WorkerForm.tsx      # 4-input profile form
│   │   ├── RiskScore.tsx       # Animated gauge 0-100
│   │   ├── ReskillPath.tsx     # Week-by-week timeline
│   │   ├── CourseCard.tsx      # NPTEL/SWAYAM/PMKVY links
│   │   └── ProfileSummary.tsx  # NLP-extracted skills display
│   ├── chatbot/
│   │   ├── ChatInterface.tsx   # Full chat UI
│   │   ├── ChatMessage.tsx     # Message bubble (markdown)
│   │   ├── ChatInput.tsx       # Input with Hindi toggle
│   │   └── QuickActions.tsx    # 5 predefined question types
│   ├── knowledge-graph/
│   │   ├── GraphCanvas.tsx     # Three.js scene
│   │   ├── GraphNode.tsx       # Individual node component
│   │   ├── GraphEdge.tsx       # Connection lines
│   │   ├── GraphControls.tsx   # Filter/zoom controls
│   │   ├── NodeDetail.tsx      # Click-to-expand panel
│   │   └── ResumeUpload.tsx    # Resume + GitHub URL input
│   └── shared/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── TabGroup.tsx
│       ├── Skeleton.tsx        # Teal shimmer loading
│       ├── Modal.tsx
│       └── Tooltip.tsx
├── pages/
│   ├── Landing.tsx             # Hero + overview
│   ├── Dashboard.tsx           # Layer 1 — 3 tabs
│   ├── WorkerEngine.tsx        # Layer 2 — profile → results
│   ├── KnowledgeGraph.tsx      # Full-page graph view
│   └── Chat.tsx                # Standalone chatbot page
├── hooks/
│   ├── useJobData.ts           # Fetch + cache job market data
│   ├── useWorkerProfile.ts     # Worker state management
│   ├── useRiskScore.ts         # Computed risk with reactivity
│   ├── useChat.ts              # Chat state + socket
│   ├── useGraphData.ts         # Knowledge graph data
│   ├── useScrollReveal.ts      # Intersection observer animations
│   └── useSocket.ts            # Socket.IO connection
├── stores/
│   ├── dashboardStore.ts       # Zustand — L1 state
│   ├── workerStore.ts          # Zustand — L2 state
│   └── graphStore.ts           # Zustand — knowledge graph
├── utils/
│   ├── api.ts                  # Axios instance + interceptors
│   ├── formatters.ts           # Number/date formatting
│   ├── riskColors.ts           # Score → color mapping
│   └── graphLayout.ts          # Force-directed graph helpers
├── styles/
│   ├── globals.css             # CSS variables + fonts
│   └── animations.css          # Keyframe definitions
├── i18n/
│   ├── en.json
│   └── hi.json
├── App.tsx
├── main.tsx
└── vite-env.d.ts
```

## Key Implementation Notes

### Real-time L1 → L2 Propagation
```typescript
// useSocket.ts — listen for dashboard updates
socket.on('dashboard:update', (data) => {
  dashboardStore.getState().updateSignals(data);
  // This MUST trigger risk score recalculation
  workerStore.getState().recalculateRisk();
});
```

### Risk Score Gauge
- Animated SVG arc that fills based on score
- Color transitions: 0-30 green, 31-60 yellow, 61-80 orange, 81-100 red
- Pulsing glow effect at high risk
- Must update LIVE when Layer 1 data changes

### Knowledge Graph (Three.js)
- Use @react-three/fiber for React integration
- Force-directed layout using d3-force-3d
- Node types: Skills, Projects, Languages, Certifications, Repos
- Edge types: "uses", "contributes_to", "certified_in", "skilled_at"
- Resume data + GitHub scrape data converge into single graph
- Click node → side panel with details
- Search/filter by category

### Chatbot
- Floating bubble in bottom-right (expandable)
- Context-aware: knows current worker profile + visible dashboard data
- Language toggle: EN ↔ HI (uses i18next + Gemini for Hindi gen)
- Must handle 5 question types from the deck
- Markdown rendering for structured responses
- Typing indicator with teal dots animation

## Tailwind Config Extensions
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'mirage': {
          bg: '#0a0a0a',
          card: 'rgba(255,255,255,0.03)',
          teal: '#00d4aa',
          cyan: '#00bcd4',
        }
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['DM Sans', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      }
    }
  }
}
```
