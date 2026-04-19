# QA Agent QA4 — Feature Integration Tests
**Runs after:** B5 + B6 (Phases 3-6 complete)
**Severity gate:** Fix Sev 1/2 before B7.

---

## Read These First

1. `agents/AGENT_MASTER_PLAN.md`
2. `AGENT_HANDOFF.md`
3. Components in `components/composed/` — SpendProgress, RetentionCard, etc.

---

## What You're Testing

Four features: Bonus Spend Tracker, Points Portfolio, Annual Fee Advisor, Spend Optimizer.

---

## Seed Data for Testing

Create or import this test state:

**Pro user (Zubair) with:**
- 3 open cards: Amex Plat ($695 fee, due in 30 days), CSR ($550 fee, due in 87 days), Amex Gold ($250 fee, due in 180 days)
- Amex Gold has active bonus: $4,000 min spend, $2,800 current, 67 days left
- Points balances: 247k Chase UR, 180k Amex MR, 94k Hyatt, 62k United
- Expected portfolio value: ~$7,553

---

## Bonus Spend Tracker Flows

### Flow 1 — Spend Progress Display
1. Open Amex Gold application detail
2. Verify bonus progress section shows:
   - Progress bar at 70% ($2,800 / $4,000)
   - "67 days left"
   - "Need $18/day" calculation
3. Status badge should be green (on pace: $18/day is manageable)

**Expected:** Math is correct. Progress bar visual matches percentage.
**Sev 1 if:** Math wrong (wrong daily amount, wrong percentage).
**Sev 2 if:** Progress section missing on active bonus card.

### Flow 2 — Update Spend
1. Tap "Update Spend" on Amex Gold
2. Enter $3,500
3. Save
4. Verify progress bar updates to 87.5%
5. "Need $X/day" recalculates

**Expected:** Real-time update. Correct recalculation.
**Sev 2 if:** Update doesn't persist after navigation.

### Flow 3 — Mark Bonus Complete
1. Update spend to $4,000+ (meets threshold)
2. "Mark Bonus Received" option should appear
3. Tap it
4. Bonus progress section should change to "Bonus Achieved" badge
5. Progress bar at 100% green

**Expected:** State transition works.
**Sev 2 if:** Can't mark bonus complete.

### Flow 4 — Intelligence Hub Active Bonuses
1. Return to Intelligence hub
2. Verify "Active Bonuses" section shows Amex Gold with deadline

**Expected:** Shows card name, progress bar, days remaining.
**Sev 2 if:** Active bonuses section missing from hub.

---

## Points Portfolio Flows

### Flow 5 — Portfolio Display
1. Navigate to Intelligence → Portfolio
2. Verify hero number matches expected total

**Manual calculation:**
- 247,000 UR × 1.25¢ = $3,087.50
- 180,000 MR × 1.25¢ = $2,250.00
- 94,000 Hyatt × 1.50¢ = $1,410.00
- 62,000 United × 1.30¢ = $806.00
- **Total: $7,553.50**

3. Verify each program row shows correct balance, CPP, and dollar value
4. Verify progress bars are proportional to portfolio share

**Expected:** Total = $7,553 (rounded). Per-program math correct.
**Sev 1 if:** Total calculation wrong.
**Sev 2 if:** Individual program values wrong.
**Sev 2 if:** Raw points shown as headline instead of dollars.

### Flow 6 — Edit Balance
1. Tap Chase UR row
2. Bottom sheet opens
3. Change balance to 250,000
4. Save
5. Verify total updates: 250,000 × 1.25 = $3,125 (was $3,087.50)
6. New total: $7,591

**Expected:** Real-time total update.
**Sev 2 if:** Total doesn't update after balance change.

### Flow 7 — Add Program
1. Tap "+ Add Program"
2. Select "Southwest Rapid Rewards"
3. Enter balance: 45,000
4. Save
5. Verify new row appears with dollar value (45,000 × 1.30¢ = $585)

**Expected:** New program added. Total increases.
**Sev 2 if:** Can't add new program.

---

## Annual Fee Advisor Flows

### Flow 8 — Fee Timeline
1. Navigate to Intelligence → Fee Advisor
2. Verify cards sorted by fee due date:
   - Amex Plat: 30 days (amber/red)
   - CSR: 87 days (yellow)
   - Amex Gold: 180 days (green)

**Expected:** Correct sorting. Color coding by urgency.
**Sev 2 if:** Wrong sort order. Wrong due dates.

### Flow 9 — Recommendation Logic
1. Amex Plat: $695 fee, $420 captured → 60% → "Call retention"
2. CSR: $550 fee, $480 captured → 87% → "Keep, near breakeven"
3. Amex Gold: $250 fee, $100 captured → 40% → "Consider downgrade"

**Verify each recommendation matches the logic:**
- >= 100%: Keep
- 80-99%: Keep, near breakeven
- 50-79%: Call retention
- < 50%: Consider downgrade
- < 12 months old: Always "Call retention" override

**Sev 1 if:** Recommendation is wrong for any card.

### Flow 10 — Retention Scripts
1. Tap Amex Plat (recommendation: call retention)
2. Verify retention script section appears
3. Verify script is relevant to Amex + below-breakeven situation
4. Tap "Copy Script"
5. Verify text copied to clipboard

**Expected:** Script from DB (static, not AI-generated). Copy works.
**Sev 2 if:** Script missing. Copy fails.
**Sev 3 if:** Script text inappropriate or wrong issuer.

### Flow 11 — Downgrade Paths
1. On Amex Plat detail (recommendation: call retention or downgrade)
2. Verify downgrade options shown: Plat → Green, Plat → EveryDay

**Expected:** Correct paths from `downgrade_paths` table.
**Sev 2 if:** No downgrade paths shown.
**Sev 3 if:** Wrong paths (e.g., Amex → Chase).

### Flow 12 — Log Retention Outcome
1. Tap "I called retention"
2. Select: "Got Points Offer"
3. Enter: 30,000 points
4. Accept: Yes
5. Notes: "Called on 4/19, agent offered immediately"
6. Save
7. Verify retention history shows on card detail

**Expected:** Outcome logged. Shows in history.
**Sev 2 if:** Save fails. History doesn't show.

---

## Spend Optimizer Flows

### Flow 13 — Category Selection
1. Navigate to Intelligence → Spend Optimizer
2. Verify category grid renders (Dining, Grocery, Travel, etc.)
3. Tap "Dining"
4. Verify ranked results appear

**Expected:** Cards ranked by value per dollar spent on dining.
**Sev 2 if:** No results. Category selection doesn't work.

### Flow 14 — Ranking Accuracy
1. Select "Dining"
2. Verify ranking order:
   - #1: Amex Gold (4x MR × 1.25¢ = 5.0¢/dollar)
   - #2: CSR (3x UR × 1.25¢ = 3.75¢/dollar)

3. Enter amount: $100
4. Verify dollar values:
   - Amex Gold: $5.00 value
   - CSR: $3.75 value

**Expected:** Ranking correct. Dollar values correct.
**Sev 1 if:** Ranking wrong (wrong card recommended = real money lost).
**Sev 2 if:** Dollar calculation wrong.

### Flow 15 — Edge Cases
1. Select a category where only 1 user card has a bonus multiplier
2. Verify other cards show at 1x or base rate, not hidden
3. Select a category where no card has a bonus
4. Verify all cards show at base rate

**Expected:** No crashes. Fallback to base rate.
**Sev 2 if:** Crash on category with no bonus cards.

---

## Report Format

```markdown
# QA4 Report — [Date]

## Summary
- Flows run: 15
- Pass: X / Sev 1: X / Sev 2: X / Sev 3: X

## Bonus Spend Tracker: X/4 flows pass
## Points Portfolio: X/3 flows pass
## Annual Fee Advisor: X/5 flows pass
## Spend Optimizer: X/3 flows pass

## [Issues by severity...]
```
