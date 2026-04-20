# Card Planner — Port to UnifiedApp
> Created: 2026-04-19
> Status: Planned, not started
> Source: `cc-recommender/app/planner/page.tsx` (1,410 lines)

---

## What It Is

The Card Planner is the crown jewel of CardScout — a 5-path interactive planning tool that combines quiz, portfolio expander, bonus sequencer, and strategy lab into one unified experience. Each path has unique questions, optimization logic, and result displays.

---

## The 5 Paths

### Path A: "I have a big expense coming up"
**Goal:** Find the best card combo for a specific spend target.
**Questions:** Spend budget (numeric) | Max cards (1-9) | 5/24 status
**Engine:** 0/1 knapsack algorithm — maximizes bonus value within budget constraint
**Output:** Strategy table (Card | Spend | Fee | Bonus), stats bar (Total Bonus | Fees | Net | Spend Used), numbered card tiles with apply links

### Path B: "I want to know what card to get next"
**Goal:** Personalized single/multi-card recommendation based on goals.
**Questions:** Primary goal (travel/cashback/bonus) | 5/24 status | Max cards (1-4) | Card type (personal/business/both) | [If cashback] Flat rate or category? | Credit quality | Owned cards (visual selector)
**Engine:** Strategy-mode filtering + sorting (chase_first / non_chase / neutral)
**Output:** 1-4 card tiles with per-card rationale ("Get Sapphire first to unlock UR transfers")

### Path C: "I'm planning my Chase card order"
**Goal:** Optimized Chase-only sequence before hitting 5/24.
**Questions:** 5/24 slots left (1/2/3+/over) | Owned Chase cards (multi-select of 7) | Chase goal (travel/cashback/business)
**Engine:** Chase-family-aware sorting (Sapphire > Ink > Freedom > co-brands)
**Output:** Numbered sequence with rationale, or "over 5/24" empty state
**Special:** Business cards noted as not counting toward 5/24

### Path D: "I want to maximize points this year"
**Goal:** 6-24 month multi-card strategy with calculated spend budget.
**Questions:** Time horizon (6/12/24 mo) | Reward type (travel/airline/hotel/cashback) | 5/24 status | Monthly spend range | Max cards (1-9) | Card type | [If cashback] preference | Credit quality | Owned cards
**Engine:** Monthly spend x horizon = budget cap ($50k max) → knapsack + strategy sorting
**Output:** Same as Path A but framed as a roadmap ("Your 12-month points strategy")

### Path E: "Show me the best bonuses right now"
**Goal:** Browse top current signup bonuses, no constraints.
**Questions:** Reward preference (all/travel/airline/hotel/cashback) | Card type
**Engine:** Simple filter + sort by bonus value desc
**Output:** Top 12 card tiles, discovery-focused, no tables

---

## Key Algorithms to Port

### 1. Knapsack Optimizer (`spendAllocation.ts`)
- 0/1 bounded knapsack with constraints
- Weight: minimum spend per card
- Value: bonus value (gross) or bonus minus fee (net)
- Capacity: user's spend budget
- Max items: user's card limit
- Bank constraint: max 2 cards per issuer
- Must port: `computeOptimalPlan()` function

### 2. Strategy Engine (`advancedStrategy.ts`)
- `getStrategyMode(under524, goal)` → chase_first / non_chase / neutral
- `filterCardsByStrategy(cards, strategy, ...)` → filtered pool
- `sortAllocationByStrategy(allocation, strategy, goal)` → ordered results
- `getCardRationale(card, index, strategy)` → per-card explanation string
- `getStrategySummary(strategy)` → top-of-results explanation
- Chase family order: Sapphire > Ink > Freedom > United > Southwest > Marriott > IHG > Hyatt

### 3. Point Valuation (`pointValues.ts`)
- Already exists in UnifiedApp as `lib/pointValues.ts`
- CPP table: UR 1.25, MR 1.25, TYP 1.0, Hyatt 1.5, Hilton 0.5, etc.

---

## Branching Logic Summary

```
User picks path (A-E)
  |
  +-- Path-specific questions appear (progressive disclosure)
  |     |
  |     +-- Some questions are conditional:
  |           - Cashback preference only if goal = cashback
  |           - Travel type only if goal = travel
  |           - Chase-specific questions only for Path C
  |
  +-- Global preferences (shown for all except C):
  |     - Credit quality (any/poor/ok/good/great)
  |     - Optimization mode (gross/net) — only Paths A & D
  |     - Visual card selector for owned cards
  |
  +-- Submit → Run path-specific engine
  |
  +-- Results render path-specifically:
        - A & D: Stats bar + summary table + card grid
        - B: Card grid with rationale
        - C: Numbered sequence or empty state
        - E: Simple card grid (12 cards)
```

---

## Visual Design (from original)

### Path Selection Cards
- 5 large cards in responsive grid (auto-fill minmax(320px, 1fr))
- Each has: icon, title, description, unique color
  - Path A: Blue (#1B4FD8)
  - Path B: Green (#059669)
  - Path C: Purple (#7C3AED)
  - Path D: Amber (#D97706)
  - Path E: Pink (#DB2777)
- Selected path's color propagates through form and results

### Stats Bar (Paths A & D)
```
| Total Bonus | Annual Fees | Net Value | Spend Used |
|   $2,100    |    $200     |  $1,900   |  $12,000   |
```
4-column grid, responsive to 2x2 on mobile

### Summary Table (Paths A & D)
```
| # | Card                    | Spend  | Fee   | Bonus  |
|---|-------------------------|--------|-------|--------|
| 1 | Chase Sapphire Pref     | $5,000 | $95   | $750   |
| 2 | Amex Gold               | $6,000 | $325  | $600   |
| 3 | Citi Double Cash         | $1,000 | $0    | $200   |
|   | Totals                  |$12,000 | $420  | $1,550 |
|   | Net bonus (bonus - fees)|        |       | $1,130 |
```
Strikethrough on fee amounts, green on bonus values

### Card Tiles
- Card image with multi-fallback (card logo → bank logo → issuer initial)
- Sequence number badge (for Paths A, C, D)
- Card name, issuer, reward model
- Rationale in italic with left accent border
- Key metrics: Welcome Bonus, Required Spend, Annual Fee, Bonus Value
- "Apply Now" link to issuer URL
- Hover: border color shifts, shadow appears

### Visual Card Selector (Owned Cards)
- Collapsible section ("Exclude cards I already have")
- Search bar + bank filter chips
- 90px grid tiles with card images
- Selected = green checkmark + "EXCLUDED" label
- Removable chips showing selected cards

---

## UX Principles to Preserve

1. **Progressive disclosure** — only show questions relevant to selected path
2. **Smart defaults** — 3 cards, 12 months, "travel", "gross" mode
3. **Validation at submit** — don't block form filling, validate on click
4. **Path-specific colors** — each path feels distinct
5. **Rich results** — not just card names, but rationale, strategy context, spend breakdown
6. **Mobile-first** — grids collapse, tables scroll horizontally
7. **Smooth scroll** to results after submit
8. **Empty states** — specific messaging ("over 5/24" vs "no matches")

---

## Implementation Plan

### Chunk 1: Port Core Libraries
- Port `spendAllocation.ts` → `lib/spendAllocation.ts` (knapsack algorithm)
- Port `advancedStrategy.ts` → `lib/advancedStrategy.ts` (strategy engine)
- Verify `pointValues.ts` matches original

### Chunk 2: Build Planner Screen
- New screen: `app/(tabs)/tools/planner.tsx`
- Path selector UI (5 cards)
- Path-specific form sections with branching logic
- Visual card selector component

### Chunk 3: Wire Engines + Results
- Connect knapsack for Paths A & D
- Connect strategy filtering for Paths B, C, D
- Simple sort for Path E
- Result rendering: stats bar, table, card grid with rationale

### Chunk 4: Polish
- Path-specific colors
- Card image fallbacks
- Mobile responsive grids
- Empty states and validation
- Smooth scroll to results

---

## Relationship to Other Tools

The Card Planner may **absorb** some existing tools:
- **Bonus Sequencer** → Path A covers this (knapsack for spend allocation)
- **Portfolio Expander** → Path B covers this (what card to get next, given owned cards)

Consider whether to keep separate tools or redirect to the planner with pre-selected paths.
