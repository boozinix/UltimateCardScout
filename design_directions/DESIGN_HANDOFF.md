# Design Redesign — Agent Handoff

> **Purpose:** Single source of truth for the UX redesign project. Read this FIRST in every session.
> **Created:** 2026-04-20
> **Working dir:** `/Users/zubairnizami/Projects/Ultimate Card Scout/UnifiedApp/`

---

## What This Work Is

Build 5 complete, visually distinct design directions for the CardScout UnifiedApp. Each direction covers all major screens with full working code. A toggle system lets the user switch between directions in-app to compare them side-by-side.

**This is a VISUAL-ONLY pass.** Do not change:
- Navigation structure (4 tabs: Discover, Vault, Intelligence, Settings)
- Data layer (hooks, React Query, Supabase)
- Business logic (scoring, velocity engine, etc.)
- Test suite (133 tests must keep passing)

**What DOES change per direction:**
- Color tokens (light + dark)
- Font families
- Component styling (borders, shadows, spacing, radius)
- Screen compositions (layout and hierarchy within screens)
- Motion approach (within MOTION_SPEC constraints)

---

## How to Run

```bash
cd "/Users/zubairnizami/Projects/Ultimate Card Scout/UnifiedApp"
npm install --legacy-peer-deps
npx expo start --web
# Open http://localhost:8081
```

---

## Critical Files to Read Before Any Work

1. `lib/theme.ts` — current design tokens (DO NOT modify this file directly)
2. `external_plans_Docs/claude_opus/MOTION_SPEC.md` — motion rules (non-negotiable)
3. `external_plans_Docs/claude_opus/UI_DESIGN_SYSTEM_PROMPT.md` — primitives spec
4. `external_plans_Docs/claude_opus/UI_SCREENS_PROMPT.md` — screen composition spec
5. `design_directions/DESIGN_PROGRESS.md` — current progress
6. `design_directions/DESIGN_HANDOFF.md` — this file

---

## Architecture

### Theme System

Each direction has its own theme file:
```
lib/themes/
  direction1-night-ledger.ts
  direction2-warm-paper.ts
  direction3-ink-steel.ts
  direction4-scout-continuum.ts
  direction5-quiet-intelligence.ts
```

Each exports the same shape as the current `theme.ts` (colors, spacing, radius, fonts, motion).

### Design Context Provider

```
contexts/DesignDirectionContext.tsx
```

Wraps the app. Provides:
- `direction: 1 | 2 | 3 | 4 | 5`
- `setDirection(n)` — switches active theme
- `activeTheme` — the resolved color/font/spacing tokens

### Screen Variants

Each major screen gets a variant file per direction:
```
app/(tabs)/intelligence/index.tsx          — original (direction 0, kept intact)
app/design-preview/d1/intelligence.tsx     — Direction 1 variant
app/design-preview/d2/intelligence.tsx     — Direction 2 variant
...etc
```

### Toggle System

```
app/design-preview/index.tsx
```

Dev-only screen with:
- Direction picker (1-5 radio buttons)
- Screen picker (which page to preview)
- Desktop/Mobile toggle (via BreakpointContext override)
- Renders the selected direction's version of the selected screen
- Side-by-side comparison mode (2 directions at once on desktop)

---

## The 5 Directions

### Direction 1: "Night Ledger"
- **Thesis:** Dark mode primary. Premium financial instrument.
- **Accent:** Gold (#C8A86E) on dark navy (#0D1117)
- **Fonts:** Literata (display) + General Sans (body) + Geist Mono (numbers)
- **Carries from CardScout:** Navy-tinted dark surfaces, stat trio pattern, calculator sidebar UX
- **Brief:** `design_directions/D1_NIGHT_LEDGER.md`

### Direction 2: "Warm Paper"
- **Thesis:** Light editorial. Printed financial report on cream stock.
- **Accent:** Deep teal (#1A6B5F) on warm cream (#F5F0E8)
- **Fonts:** Satoshi (body) + Editorial New (display) + Geist Mono (numbers)
- **Carries from CardScout:** Warm canvas, clean stat layouts, verdict card pattern
- **Brief:** `design_directions/D2_WARM_PAPER.md`

### Direction 3: "Ink & Steel"
- **Thesis:** High-contrast industrial. Bloomberg terminal made accessible.
- **Accent:** Signal red (#E5484D) on near-black (#0A0A0B)
- **Fonts:** JetBrains Mono (primary) + Mona Sans (headings) + JetBrains Mono (numbers)
- **Carries from CardScout:** Monospace numbers, data density, dark depth
- **Brief:** `design_directions/D3_INK_STEEL.md`

### Direction 4: "Scout Continuum"
- **Thesis:** Visual continuity with CardScout web. Instant brand recognition.
- **Accent:** Scout blue (#1B4FD8) on warm linen (#F7F6F3)
- **Fonts:** Manrope (headings) + system sans (body) + Geist Mono (numbers)
- **Carries from CardScout:** Everything — same color language, card patterns, search UX
- **Brief:** `design_directions/D4_SCOUT_CONTINUUM.md`

### Direction 5: "Quiet Intelligence"
- **Thesis:** Ultra-minimal. Typography and whitespace do all the work.
- **Accent:** Deep indigo (#3E3A85) on pure white (#FEFEFE)
- **Fonts:** Epilogue (body) + Gambetta (display) + Geist Mono (numbers)
- **Carries from CardScout:** Functional patterns stripped of color
- **Brief:** `design_directions/D5_QUIET_INTELLIGENCE.md`

---

## Major Pages (Priority Order)

1. **Intelligence Hub** — `app/(tabs)/intelligence/index.tsx` — HIGHEST PRIORITY. Current UI is bad. Needs complete rethink in every direction.
2. **Discover Home** — `app/(tabs)/discover/index.tsx` — Entry point, first impression.
3. **Velocity Dashboard** — `app/(tabs)/intelligence/velocity.tsx` — Key pro feature, data-dense.
4. **Application Ledger** — `app/(tabs)/intelligence/ledger.tsx` — The spreadsheet replacement.
5. **Fee Advisor** — `app/(tabs)/intelligence/fee-advisor.tsx` — Complex screen with retention scripts.
6. **Points Portfolio** — `app/(tabs)/intelligence/portfolio.tsx` — Financial data display.
7. **Settings** — `app/(tabs)/settings/index.tsx` — Must match the direction's voice.

---

## Rules (Non-Negotiable)

1. **MOTION_SPEC governs all motion.** 7 patterns only. No stagger. No celebration. No count-up on first render.
2. **No border-left/border-right accent stripes.** Banned by impeccable.
3. **No gradient text.** Banned by impeccable.
4. **No cards-inside-cards.** Flatten hierarchy.
5. **No AI color palette** (cyan-on-dark, purple-to-blue gradients, neon accents).
6. **Every direction must have reduced-motion support.**
7. **44px minimum tap targets on mobile.**
8. **Fonts must NOT be from the reflex list** (Inter, Playfair Display, DM Sans, Space Grotesk, etc.) — EXCEPT Direction 4 (Scout Continuum) which inherits from the web for brand continuity.
9. **TypeScript must compile clean.** Zero new errors.
10. **133 existing tests must still pass** after all changes.

---

## Chunk Execution Order

See `DESIGN_PROGRESS.md` for live status. Work is chunked for token resilience:

```
Chunk 0: Infrastructure (toggle system, theme files, route setup)
Chunk 1: Direction 1 — Night Ledger (all 7 pages)
Chunk 2: Direction 2 — Warm Paper (all 7 pages)
Chunk 3: Direction 3 — Ink & Steel (all 7 pages)
Chunk 4: Direction 4 — Scout Continuum (all 7 pages)
Chunk 5: Direction 5 — Quiet Intelligence (all 7 pages)
Chunk 6: Polish (desktop layouts, side-by-side, final QA)
```

Each chunk is independent. If a chunk fails or runs out of tokens, the next session picks up from where it left off using `DESIGN_PROGRESS.md`.

---

## Git State

- Branch: `main`
- Do NOT commit unless explicitly asked.
- All design work is additive (new files), not destructive (no existing files modified except theme integration).
