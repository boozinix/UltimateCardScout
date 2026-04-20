# Tools & UI Redesign — UnifiedApp
> Created: 2026-04-19
> Status: Planned, not started

---

## 1. Card Browser — Major Overhaul

**Current state:** Ugly search bar, no real filters, just a text search. Cards display is bland.

**Required changes:**

### Filters (like original CardScout)
- **Row 1 — Reward type chips:** All, Cashback, Travel, Airline, Hotel
- **Row 2 — Fee range chips:** No fee, Under $100, Under $400, $400+
- **Row 3 — Issuer chips:** All, Chase, Amex, Citi, Capital One, etc.
- Search bar should be secondary to filters, not the only mechanism
- Filters + search work together (AND logic)

### Card Display
- Each card tile should show: issuer badge, card name, welcome bonus, annual fee, key rates
- Use issuer-colored gradients or accents (Chase blue, Amex gold, etc.) like original
- Cards should be visually distinct, not flat beige boxes

### UX
- Filter chips should be horizontally scrollable per row
- Active filter state should be visually clear (filled vs outline)
- Card count badge updates in real-time as filters change

---

## 2. Value Calculator — Slider-Based, Not Binary

**Current state:** Benefits are binary toggles (0 or 1 — use it or don't). This doesn't reflect reality. A person might extract $160 of a $300 travel credit, not all or nothing.

**Required changes (match original CardScout):**

### Slider + Input for Each Benefit
- Each benefit gets a **slider** (range: $0 to max value) AND a **number input box** for direct entry
- Slider and input are synced — change one, other updates
- Show current value as dollar amount AND percentage: "$160 (53%)"
- Show max value label: "Max Value: $300"

### Fee Coverage Bar
- Add a **fee coverage completion bar** at top or bottom
- Shows total extracted value vs annual fee as a progress bar
- Color-coded:
  - **Red** (0-50%): "You're not using enough benefits to justify the annual fee."
  - **Yellow/Orange** (50-90%): "You're close to breaking even. Consider using more benefits."
  - **Green** (90%+): "This Card is Worth It For You"
- At 90%+, show encouraging message: "Based on your usage, you're getting $980 in value from this card's benefits, which is $185 more than the $795 annual fee. Keep the card and make sure you use these benefits every year."

### Subjectiveness / Context Messages
- Near-threshold values get contextual descriptions
- 92% = "You're almost there — just $47 more in benefits to break even"
- 110% = "You're $75 ahead — this card pays for itself"
- Below 30% = "This card isn't working for you. Consider downgrading."

### Visual Design
- Use the dark-themed card style from original (dark surface, light text, accent-colored sliders)
- Category headers with icons (Travel Credits, Dining, Entertainment, etc.)
- Each benefit card: title, description, slider, dollar display, max value

---

## 3. Bonus Sequencer — Full Rebuild

**Current state:** Basic UI, missing the strategy table and refinement controls from original.

**Required changes (match original CardScout planner):**

### Input Controls (Refinement Panel)
- **Total spend budget** (input or preset: $10k, $15k, $25k, $50k)
- **Card type toggle:** Personal / Business / Both
- **Reward preference:** Airline miles, Bank rewards (UR/MR/TYP), Hotel points, Cash back
- **5/24 status:** Under 5/24 / Over 5/24 / Don't know
- **Max cards:** 2, 3, 4, 5
- **Optimize for:** Gross bonus / Net bonus (after fees)

### Strategy Table (from original)
- Summary row: Total Spend | Gross Bonus | Net Bonus (after fees)
- Per-card rows: Card name | Allocated Spend | Annual Fee | Bonus Value
- Totals row with net calculation
- Strikethrough on fees to show net impact

### "Apply in This Order" Section
- Numbered card tiles (1, 2, 3, 4...)
- Each shows: Welcome Bonus, Required Spend, Annual Fee, Bonus Value
- Visual card art with issuer gradients
- Clear sequential ordering for application strategy

### Visual Design
- Dark theme like original (navy/dark gray background, white text)
- Accent colors for bonus values (green for positive, red for fees)
- Summary stats in large, prominent display at top

---

## 4. Color Scheme & Visual Language — Across All Tools

**Current state:** Everything is a dull beige/cream. No visual meaning. No emotional feedback. Hard to scan.

**Required changes:**

### Semantic Colors (convey meaning)
- **Green:** Positive outcomes, value exceeded, card worth keeping, good match
- **Red/Orange:** Negative outcomes, fee not justified, poor match, warnings
- **Yellow/Amber:** Caution, close to threshold, almost breaking even
- **Blue:** Informational, neutral data, issuer branding
- **Gold/Accent:** CTAs, active states, emphasis

### Issuer Branding
- Chase: blue gradient
- Amex: gold/platinum gradient
- Capital One: red/dark
- Citi: blue/navy
- Discover: orange
- Use these consistently on card tiles, browser, results

### Progress/Status Indicators
- Fee coverage bars: red -> yellow -> green gradient
- Bonus progress: fill color changes with completion
- Score indicators: color-coded good/bad/neutral

### Apply To
- Value calculator: dark cards with colored sliders, fee coverage bar
- Card browser: issuer-tinted card tiles
- Results page: score-colored indicators
- Bonus sequencer: dark strategy table with accent highlights
- All tool pages: consistent use of semantic colors

---

## 5. Calculator Pages — General Review

Need to audit ALL calculator pages in UnifiedApp tools tab:
- Point Value Calculator (UR, MR, TYP, AA, etc.)
- Portfolio Expander
- Bonus Sequencer (covered above)
- Value Calculator (covered above)

### Common Issues to Check
- Are inputs functional (not just static text)?
- Do calculations update in real-time?
- Are results visually clear with color-coded feedback?
- Do they match the quality/depth of original CardScout equivalents?
- Mobile responsiveness — do they work on small screens?

---

## 6. Guide Pages — Audit Needed

Need to compare UnifiedApp guide pages vs original CardScout guides:
- Are all guides ported?
- Is the content complete or stubbed?
- Do internal links work?
- Is formatting consistent?

---

## 7. Portfolio Expander — Broken UX

**Current state:** You add cards you already own, then it recommends "what's next" — but there's no search/filter on the card selector, and no context for recommendations. It just dumps generic suggestions with no explanation of *why* based on *what you have*.

**Required changes:**

### Card Selector Improvements
- Search bar to find cards by name
- Filter chips by issuer (Chase, Amex, Citi, etc.)
- Visual card tiles (not a plain list)
- Show selected cards as removable chips

### Recommendation Context
- After selecting owned cards, ask follow-up questions:
  - What are you looking for? (Travel / Cashback / Bonus / Fill gaps)
  - Are you under Chase 5/24?
  - Personal or business?
- Recommendations should explain WHY based on what user already has:
  - "You have CSP — add Freedom Flex to stack 5x categories with UR transfers"
  - "You're missing an Amex card — Gold fills your dining gap"
  - "You have 3 Chase cards — consider non-Chase before hitting 5/24"

### Display
- Show complementary card logic, not just "highest bonus"
- Gap analysis: "You're strong on travel, weak on everyday spending"
- Strategy-aware ordering (chase_first if under 5/24)

---

## 8. Vault Page — Not Functional

**Current state:** Adding cards to the vault does nothing. The "Add" button is a dummy — no card gets saved, no confirmation, nothing appears in the vault list.

**Required changes:**
- Wire the add-card flow to actually save cards (Supabase `user_cards` table or local state if not logged in)
- Show confirmation after adding
- Vault list should display added cards with: card name, issuer, last four, date added
- Remove/edit functionality
- If not logged in, prompt login OR save to local state with sync-on-login

---

## 9. Card Planner — Port from Original (Major Feature)

**See separate file: `CARD_PLANNER_PORT.md`**

The original Card Planner at `cc-recommender/app/planner/page.tsx` is 1,400 lines with:
- 5 distinct paths (A-E) with unique Q&A flows
- Knapsack optimization algorithm for spend allocation
- Strategy-aware filtering (chase_first / non_chase / neutral)
- Per-card rationale generation
- Visual card selector for owned cards
- Summary tables with spend/fee/bonus breakdowns
- Path-specific color theming

This is the most complex and valuable feature to port. Needs its own redesign doc.

---

## Priority Order

1. **Vault page** — fix the add-card flow (nothing works without this)
2. **Value Calculator** — slider inputs + fee coverage bar + contextual messages
3. **Card Browser** — proper filters + issuer-colored cards
4. **Card Planner** — port the 5-path planner (biggest feature, see CARD_PLANNER_PORT.md)
5. **Portfolio Expander** — search/filter + recommendation context
6. **Color scheme** — semantic colors across all tools
7. **Bonus Sequencer** — strategy table + refinement controls (may be absorbed into Card Planner)
8. **Calculator audit** — verify all calc pages work
9. **Guide pages** — audit and fix gaps
