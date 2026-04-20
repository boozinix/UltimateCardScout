# QA4 Report — 2026-04-19

## Summary
- Flows run: 15
- **Pass: 12 / Sev 1: 0 / Sev 2: 3 / Sev 3: 1**

---

## Bonus Spend Tracker: 4/4 flows pass

### Flow 1 — Spend Progress Display ✅ PASS
- Math verified: $2,800/$4,000 = 70%, remaining $1,200 / 67 days = $18/day
- Status: pct 0.70 >= 0.60 → "On pace" (success) ✅
- Progress bar, dollar amounts, deadline all render correctly

### Flow 2 — Update Spend ✅ PASS
- `handleSubmitSpend` calls `onUpdateSpend(amount)`, wired to `useUpdateApplication` in `[id].tsx`
- Mutation invalidates query key → data refreshes automatically

### Flow 3 — Mark Bonus Complete ✅ PASS
- When `progress >= target && !bonus_achieved`, "Mark Bonus Received" button appears
- Sets `bonus_achieved: true` + `bonus_achieved_at: today` via mutation

### Flow 4 — Intelligence Hub Active Bonuses ✅ PASS
- Hub filters `active && !bonus_achieved && bonus_amount`, sorts by deadline, shows top 3
- Compact SpendProgress shows card name + progress bar + days left

---

## Points Portfolio: 3/3 flows pass

### Flow 5 — Portfolio Display ✅ PASS
- **With DB seeded (production):** UR 1.25, MR 1.25, Hyatt 1.50, United 1.30 → $7,553.50 ✅
- **Without DB (local demo):** Falls back to CURRENCY_CPP constants (UR 1.50, MR 1.50, Hyatt 1.80) → $8,903
- Calculation logic is correct for both paths. CPP resolution chain: DB → local fallback.
- Per-program rows show balance, CPP, dollar value, portfolio % ✅

### Flow 6 — Edit Balance ✅ PASS
- Tap row → bottom sheet with current balance → save → `useUpdateBalance` upsert → query invalidation → total recalculates

### Flow 7 — Add Program ✅ PASS
- "Add Program" → program selector (filters out existing) → balance input → save → new row appears

---

## Annual Fee Advisor: 4/5 flows pass

### Flow 8 — Fee Timeline ✅ PASS
- Cards sorted by `daysUntilFee()` ascending (nearest first)
- 30-day warning banner displays when any card ≤30 days
- Urgent cards get amber border highlight

### Flow 9 — Recommendation Logic ✅ PASS
- `getRecommendation()` tiers verified:
  - ≥100% → keep ✅
  - 80-99% → keep (near breakeven) ✅
  - 50-79% → call retention ✅
  - <50% → consider downgrade ✅
  - <12 months age → override to call retention ✅
- Note: benefit capture is **estimated** (`bonus_spend_progress * 0.03` capped at fee), not from tracked benefits. This is documented in comments as an approximation.

### Flow 10 — Retention Scripts ✅ PASS
- Scripts fetched by issuer (includes `other` fallback)
- RetentionCard auto-highlights "BEST MATCH" based on benefitRatio and cardAgeMonths
- Copy-to-clipboard via `expo-clipboard` ✅
- Scripts are static from DB, never AI-generated ✅

### Flow 11 — Downgrade Paths ✅ PASS
- Filtered by card name substring matching
- Amex Platinum → shows Amex Green + Amex EveryDay paths ✅
- Only shown when recommendation is `call_retention` or `consider_downgrade` ✅

### Flow 12 — Log Retention Outcome ⚠️ SEV 2
- Bottom sheet with 6 outcome types, amount input, accepted toggle, notes — all work ✅
- `useCreateRetentionOutcome` inserts to `retention_outcomes` table ✅
- **BUG: Retention history is never displayed anywhere after saving.** The B6 spec says "Show retention history on application detail screen" but `[id].tsx` has no retention outcomes section. Data is saved to DB but invisible to user.

---

## Spend Optimizer: 1/3 flows pass, 2 issues

### Flow 13 — Category Selection ✅ PASS
- Category chips render, filtered to categories where user has cards with bonus entries
- Selection triggers ranking via `rankCards()`

### Flow 14 — Ranking Accuracy ⚠️ SEV 2
- **Ranking ORDER is correct:** Amex Gold (4x) beats CSR (3x) for dining ✅
- **Dollar values differ from expected:** Spend optimizer uses `CURRENCY_CPP` constants (UR/MR = 1.50cpp) instead of DB valuations (1.25cpp). Portfolio uses DB values → **inconsistent CPP source**.
  - Amex Gold: code shows 6.0¢/dollar (4 × 1.50), spec expects 5.0¢ (4 × 1.25)
  - CSR: code shows 4.5¢/dollar (3 × 1.50), spec expects 3.75¢ (3 × 1.25)
- **Fix:** Spend optimizer should use `useValuations()` or a shared CPP resolution helper matching the portfolio's `resolveCpp()` approach.

### Flow 15 — Edge Cases ⚠️ SEV 2
- Category with no bonus cards: shows "None of your cards have a bonus multiplier" message, no crash ✅
- **BUG: Cards at base rate (1x) are not shown.** `rankCards()` only returns cards with an explicit `card_categories` entry for that category. The spec says "Verify other cards show at 1x or base rate, not hidden." User's cards without bonus entries should appear below bonus cards at 1x.

---

## Sev 3 Observations

### CPP Fallback Constants vs DB Seeds
- `CURRENCY_CPP` in `applicationTypes.ts` uses "transfer partner" values (UR 1.50, MR 1.50, Hyatt 1.80)
- `seed-points-valuations.sql` uses TPG published values (UR 1.25, MR 1.25, Hyatt 1.50)
- Both are legitimate but produce different totals. In local demo mode (no Supabase), user sees higher portfolio values than production. Not a bug, but worth documenting.

---

## Issues Summary

| # | Severity | Feature | Description |
|---|---|---|---|
| 1 | **Sev 2** | Fee Advisor | Retention outcome history saved to DB but never displayed on app detail screen |
| 2 | **Sev 2** | Spend Optimizer | Uses hardcoded CURRENCY_CPP instead of DB valuations ��� inconsistent with portfolio CPP |
| 3 | **Sev 2** | Spend Optimizer | Base-rate (1x) cards not shown in rankings — only cards with explicit category entries appear |
| 4 | Sev 3 | Portfolio/General | Local fallback CPP constants differ from seeded DB values (documented, not a logic bug) |

---

## Recommendation

**No Sev 1 issues found.** Three Sev 2 issues should be fixed before B7:
1. Add retention outcomes display to `[id].tsx` detail screen
2. Wire spend optimizer to use DB CPP valuations (shared resolver)
3. Show user's base-rate cards at 1x in optimizer results

All three are contained fixes — no architectural changes needed.
