# Quiz & Results Redesign — UnifiedApp
> Created: 2026-04-19
> Status: Planned, not started

## Problem

The UnifiedApp quiz/results flow is too shallow compared to the original CardScout. Three questions alone produce results too broad to be useful, but adding more questions creates friction. The original solved this with adaptive refinement filters on the results page — filters that change based on quiz answers.

---

## What Needs to Change

### 1. Personal/Business Toggle (Before Quiz)

**Current:** Only detected via NLP free-text search. No explicit UI.

**Fix:** Add a segmented control or two large buttons on the Discover home screen, above "Take the guided quiz." This carries into the quiz and results as `card_mode`. Business and personal cards are completely separate — never mixed in results.

- Personal bucket = card_type: personal, secured, student
- Business bucket = card_type: business

### 2. Adaptive Refinement Filters (On Results Page)

**Current:** 6 static filter chips (All, Personal, Business, No fee, Travel, Cashback). Don't adapt to user's answers.

**Fix:** Add a "Refine results" section that shows only filters relevant to quiz answers, using `dependsOn()` logic from original CardScout.

| If user picked... | Show these refinements |
|---|---|
| **Travel as #1** | Travel type (General/Airline/Hotel) -> preferred airline/hotel/bank -> travel tier -> perks (lounge, TSA/GE) |
| **Cashback as #1** | Spending focus (gas, grocery, dining) -> 0% APR need -> favorite brands (Amazon, Costco, etc.) |
| **Everyday as #1** | 0% APR need -> spending focus -> favorite brands |
| **Bonus as #1** | Exclude travel cards? -> travel type if applicable |
| **Always visible** | Credit profile, issuer approval rules (Chase 5/24, Amex 2/90, etc.), expert filters (max fee slider, exclude issuers, lounge required) |

**UX approach:**
- Mobile: collapsible panel or bottom sheet, starts closed
- Desktop: sidebar (like original) or collapsible panel at top
- Each filter change re-scores cards in real-time

### 3. Results Count & Deduplication

**Current:** Shows 30 cards. No family deduplication.

**Fix:**
- Show **6 cards** initially, "Show more" to load next 6
- Dedupe by card family (only show best Sapphire, best Freedom, etc.)
- Show "Other type" section (top 3 business cards if user picked personal, vice versa)

### 4. Near-Miss Section ("Cards That Almost Made It")

**Current:** `getWhyNotReason()` function exists in scoring.ts but is never called.

**Fix:** After the top 6, show a collapsed "Cards that almost made it" section with the next 3 cards + their specific reason for not ranking higher:
- Fee mismatch
- Reward model mismatch
- Brand mismatch (wrong airline/hotel)
- Foreign transaction fee
- High minimum spend
- Low bonus value
- Network acceptance (Amex penalty)
- Premium card vs low fee tolerance

### 5. Narrative Oneliners & Score Breakdown

**Current:** `getNarrativeOneliner()` and `getScoreBreakdown()` exist but unclear if displayed.

**Fix:** Each card tile should show:
- Narrative oneliner: "Best for you: flexible points with airline transfers, no foreign fees"
- Collapsible score breakdown: 3 dimensions (goal match, fee fit, bonus efficiency) with good/bad indicators

---

## Key Scoring Details (Reference)

### Primary Goal Weights
- Primary (rank 1): full weight (up to +80 points)
- Secondary (rank 2): ~60% weight (up to +30 points)
- Tertiary: ~33% weight (up to +12 points) — currently disabled (only 2 picks)

### Hard Filters (score = -9999, card excluded)
- Card already owned
- Issuer excluded by approval rules
- Travel card but user excluded travel
- Exceeds max annual fee
- Issuer in excluded list
- Lounge required but card lacks it
- Spend comfort "Low" + minimum spend >= $1,000
- Travel type mismatch (user wants airline-only but card is hotel)

### Scoring by Goal
- **Travel:** +80 base, +40 airline/hotel preference match, +25 lounge, +25 TSA/GE, +15 transfer partners, -20 foreign tx fee
- **Cashback:** +50 base, scaled by effective cashback rate + bonus ratio
- **Everyday:** scales with cashback rate * 15, +35 for 0% intro APR
- **Bonus:** +0-80 based on bonus value, +0-15 bonus ratio, -20 if user doesn't want bonus

### Annual Fee Modifiers
- None: -50 penalty for any fee card, -15 for premium
- Low: -30 if above $100
- Medium: -30 if above $400, +20 for premium
- High: +20 for premium

---

## Implementation Plan

Execute as 4 chunks in sequence:

**Chunk 1:** Personal/Business toggle on Discover screen + wire into quiz + results filtering

**Chunk 2:** Adaptive refinement filters — port `dependsOn()` logic, build collapsible filter panel, wire into scoring

**Chunk 3:** Results redesign — cap at 6, family dedup, "show more", near-miss section with reasons

**Chunk 4:** Card tile enhancement — narrative oneliners, score breakdown collapsible, visual polish

---

## Design Principles

- Don't ruin the clean UI — refinements should be discoverable but not overwhelming
- Mobile-first: filters are a collapsible/bottom-sheet, not a permanent sidebar
- Desktop can show sidebar if space allows (1024px+)
- Real-time re-scoring on filter change (no "Apply" button)
- Quiz stays at 3 questions max — depth comes from refinements, not more questions
