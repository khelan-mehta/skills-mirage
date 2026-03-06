# UI Agent — devxlabs.ai Design System Enforcer

## Role
You are the UI design authority. Every component MUST match the devxlabs.ai aesthetic.
Before writing ANY UI code, consult this file. Reject generic designs.

## Design DNA (extracted from devxlabs.ai)

### Color Palette
```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0a;
  --bg-secondary: #111111;
  --bg-card: rgba(255, 255, 255, 0.03);
  --bg-card-hover: rgba(255, 255, 255, 0.06);
  --bg-teal-gradient: linear-gradient(180deg, #0a0a0a 0%, #0a2a2a 50%, #00d4aa22 100%);

  /* Accent */
  --accent-teal: #00d4aa;
  --accent-cyan: #00bcd4;
  --accent-teal-dim: rgba(0, 212, 170, 0.15);
  --accent-gradient: linear-gradient(135deg, #00d4aa, #00bcd4);

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.6);
  --text-tertiary: rgba(255, 255, 255, 0.35);
  --text-accent: #00d4aa;

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-accent: rgba(0, 212, 170, 0.3);

  /* Risk Colors */
  --risk-critical: #ff4444;
  --risk-high: #ff8800;
  --risk-medium: #ffcc00;
  --risk-low: #00d4aa;
}
```

### Typography System
```css
/* Display / Hero headings — SERIF ITALIC */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap');

/* Body / UI — GEOMETRIC SANS */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&display=swap');

/* Mono / Data */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap');

.heading-hero {
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-weight: 400;
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  line-height: 1.1;
  color: var(--text-primary);
}

.heading-section {
  font-family: 'Playfair Display', serif;
  font-weight: 400;
  font-size: clamp(1.8rem, 3vw, 3rem);
  color: rgba(255, 255, 255, 0.7);
}

.label-bracketed {
  font-family: 'DM Sans', sans-serif;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  color: var(--text-secondary);
  /* Format: [ Label Text ] */
}

.body-text {
  font-family: 'DM Sans', sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.data-value {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
}

.nav-link {
  font-family: 'DM Sans', sans-serif;
  font-size: 0.8rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
```

### Grid Overlay Pattern
The site has a subtle crosshair grid. Implement as:
```tsx
// GridOverlay.tsx — render as fixed background
const GridOverlay = () => (
  <div className="fixed inset-0 pointer-events-none z-0"
    style={{
      backgroundImage: `
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
      `,
      backgroundSize: '200px 200px',
    }}
  >
    {/* Crosshair markers at grid intersections */}
    {/* Small + signs at major grid points */}
  </div>
);
```

### Diagonal Dot Matrix Animation
The hero has flowing diagonal teal dots:
```tsx
// Use canvas or CSS for diagonal dot pattern
// Dots flow from bottom-left to top-right
// Color: var(--accent-teal) with varying opacity
// Size: 1-2px dots, spaced ~8px apart diagonally
// Animation: slow drift upward-right, parallax on scroll
```

### Component Patterns

#### Navigation Bar
```
┌──────────────────────────────────────────────────────┐
│ devx labs          HOME  ABOUT US  CAREERS  [GET IN TOUCH] │
└──────────────────────────────────────────────────────┘
- Logo: bold lowercase "skills mirage" or project name
- Links: uppercase, letter-spaced, DM Sans
- CTA: bordered button, not filled
- Background: transparent → blur on scroll
```

#### Section Headers
```
[SECTION LABEL]        ← bracketed, teal, small caps

Section Heading        ← Playfair Display, large
in Serif Italic        ← lighter weight

Description text       ← DM Sans, secondary color
```

#### Cards (Dashboard/Data)
```
┌─────────────────────────┐
│ ┌─────────────────────┐ │  Outer: subtle border
│ │  CARD TITLE          │ │  Inner: translucent bg
│ │                      │ │  No heavy shadows
│ │  Data/Content        │ │  Hover: border brightens
│ │                      │ │  
│ └─────────────────────┘ │
└─────────────────────────┘
```

#### Numbered Sections (About/Values)
```
[01]
          Document to Scale            ← Playfair serif, large
          Description in body font     ← DM Sans, secondary
──────────────────────────────────────
[02]
          AI-Native Thinking
          ...
```

### Animation Principles
1. **Entrance**: Stagger children with 50-100ms delays, fade + translateY(20px)
2. **Scroll**: Parallax on hero elements, reveal sections on scroll
3. **Hover**: Scale 1.02 on cards, underline-reveal on links
4. **Transitions**: 300-500ms ease-out, never bounce/elastic
5. **Loading**: Skeleton screens with shimmer (teal-tinted)

### Dashboard-Specific Patterns
- Tab switching: underline indicator slides, content crossfades
- Charts: dark theme, teal accent lines, minimal gridlines
- Heatmaps: dark-to-teal gradient (low → high risk uses red spectrum)
- Tables: no alternating rows, subtle row-hover highlight
- Badges: pill-shaped, translucent backgrounds

### Knowledge Graph (Three.js)
- Dark space background with subtle stars
- Nodes: glowing spheres with teal core
- Edges: thin lines with flowing particles
- Labels: billboard text, DM Sans
- Interaction: orbit controls, click to focus, hover glow
- Categories: color-coded but teal-dominant palette

### FORBIDDEN
- Purple/violet gradients
- White backgrounds for main content (only for portfolio sections)
- Inter, Roboto, Arial fonts
- Heavy drop shadows
- Rounded corners > 8px on cards
- Generic dashboard libraries without theming
- Bright/saturated colors without dark context
