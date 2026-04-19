# Build Agent B6 — Annual Fee Advisor + Spend Optimizer
**Phase:** 5 + 6
**Duration:** 2 weeks
**Depends on:** B4 (velocity engine complete)
**Can parallel with:** B5 (zero file overlap)
**Blocks:** B7, QA4

---

## Read These First

1. `agents/AGENT_MASTER_PLAN.md`
2. `AGENT_HANDOFF.md`
3. `lib/applicationTypes.ts` — RetentionOutcome, Application types
4. `supabase/migrations/002_extra_tables.sql` — retention_scripts, downgrade_paths, card_categories tables
5. `lib/theme.ts` — design tokens
6. Components from `components/primitives/` and `components/composed/`

---

## What You're Building

Two intelligence features:
1. **Annual Fee Advisor** — 30-day warnings, retention scripts, downgrade paths, outcome logging
2. **Spend Optimizer** — "Which card right now?" category-based ranking

---

## Part 1: Annual Fee Advisor (Phase 5, 1 week)

### Fee Timeline Screen

Create `app/(tabs)/intelligence/fee-advisor.tsx`:

Top section: cards sorted by next annual fee due date.

```
┌─ Fee Due Soon ──────────────────┐
│                                  │
│ ⚠ Amex Platinum · $695          │
│ Due in 30 days                   │
│ Captured: $420 / $695 (60%)      │
│ ████████████░░░░░░░░░ 60%       │
│ Recommendation: Call retention   │
│ [View Details]                   │
│                                  │
│ Chase Sapphire Reserve · $550    │
│ Due in 87 days                   │
│ Captured: $480 / $550 (87%)      │
│ ██████████████████░░░ 87%       │
│ Recommendation: Keep             │
│                                  │
└─────────────────────────────────┘
```

### Fee Advisor Logic

```typescript
function getRecommendation(benefitsCaptured: number, annualFee: number, cardAgeMonths: number): FeeRecommendation {
  const ratio = benefitsCaptured / annualFee;
  
  if (cardAgeMonths < 12) {
    return { action: 'call_retention', reason: 'Too early to cancel. Closing under 1 year hurts credit.' };
  }
  if (ratio >= 1.0) return { action: 'keep', reason: "You're ahead on value." };
  if (ratio >= 0.80) return { action: 'keep', reason: "Near breakeven. Worth keeping." };
  if (ratio >= 0.50) return { action: 'call_retention', reason: "Call retention first." };
  return { action: 'consider_downgrade', reason: "Consider downgrade or cancel." };
}
```

### Retention Script Library

Seed `supabase/seed-retention-scripts.sql` with ~30 curated scripts:

Per issuer × situation:
- Chase + below_breakeven: "I've been a cardmember for [X] years and I'm considering whether the annual fee is still worth it for my spending. I really value [specific benefit] but I'm not sure I'm getting full value. Are there any offers available to help with the fee?"
- Amex + above_breakeven: "I love the card and the benefits. The fee just posted and I wanted to see if there are any retention offers available before I commit for another year."
- (Similar for Citi, Capital One, BofA, etc.)

**These are static, curated, and reviewed. NEVER generate these with AI at runtime.**

Copy-to-clipboard button on each script.

### Downgrade Paths

Seed `supabase/seed-downgrade-paths.sql`:

| From | To | Notes |
|---|---|---|
| Chase Sapphire Reserve | Chase Sapphire Preferred | Keep UR earning, lower fee |
| Chase Sapphire Preferred | Chase Freedom Flex | No fee, quarterly categories |
| Chase Sapphire Preferred | Chase Freedom Unlimited | No fee, 1.5% flat |
| Amex Platinum | Amex Green | Lower fee, keeps MR |
| Amex Platinum | Amex EveryDay | No fee, keeps MR |
| Amex Gold | Amex EveryDay | No fee, keeps MR |
| Capital One Venture X | Capital One Venture | Lower fee |
| Capital One Venture | Capital One VentureOne | No fee |
| Citi Strata Premier | Citi Double Cash | No fee |

Show downgrade options when recommendation is `call_retention` or `consider_downgrade`.

### Retention Outcome Logging

When user taps "I called retention" on a card:

Bottom sheet flow:
1. "What happened?" → Kept / Fee Waived / Got Points Offer / Got Statement Credit / Downgraded / Cancelled
2. If points/credit: "How much?" → number input
3. "Did you accept?" → Yes / No
4. Notes (optional)
5. Save → creates `retention_outcomes` row

Show retention history on application detail screen.

### Push Notification (scaffold)

30-day advance notification for upcoming fees. Same pattern as B5 spend notifications.

---

## Part 2: Spend Optimizer (Phase 6, 1 week)

### Card Categories Seed Data

Create `supabase/seed-card-categories.sql` for the 20 Phase 0 cards:

Key multipliers:
- Amex Gold: Dining 4x, Grocery 4x
- Chase Sapphire Reserve: Travel 3x, Dining 3x
- Chase Sapphire Preferred: Travel 2x, Dining 3x
- Chase Freedom Flex: Rotating quarterly 5x
- Capital One Savor: Dining 4x, Entertainment 4x
- Bilt: Dining 3x, Travel 2x, Rent 1x (unique)
- etc.

Include `cap_amount` and `expires_date` for quarterly/capped categories.

### Spend Optimizer Screen

Create `app/(tabs)/intelligence/spend.tsx`:

```
┌─────────────────────────────────┐
│ Which Card?                      │
│ For your best return             │
│                                  │
│ ┌──────┐ ┌──────┐ ┌──────┐     │
│ │Dining│ │Grocer│ │Travel│     │
│ └──────┘ └──────┘ └──────┘     │
│ ┌──────┐ ┌──────┐ ┌──────┐     │
│ │ Gas  │ │Hotels│ │Stream│     │
│ └──────┘ └──────┘ └──────┘     │
│                                  │
│ Amount (optional): [$___]        │
│                                  │
│ Best for Dining:                 │
│ 🥇 Amex Gold · 4x MR            │
│    $3.40 value on $85            │
│ 🥈 CSR · 3x UR                  │
│    $2.81 value on $85            │
│ 🥉 CSP · 3x UR                  │
│    $2.81 value on $85            │
└─────────────────────────────────┘
```

### Optimizer Logic

```typescript
function rankCards(
  userCards: UserCard[],
  category: string,
  amount?: number
): RankedCard[] {
  return userCards
    .map(uc => {
      const catEntry = cardCategories.find(cc => cc.card_id === uc.card_id && cc.category === category);
      const multiplier = catEntry?.multiplier ?? 1;
      const cpp = pointsValuations.find(pv => pv.program === uc.points_currency)?.cpp ?? 1;
      const valuePerDollar = multiplier * cpp / 100;
      return {
        ...uc,
        multiplier,
        cpp,
        valuePerDollar,
        totalValue: amount ? amount * valuePerDollar : null,
        isNearCap: catEntry?.cap_amount ? checkNearCap(uc, catEntry) : false,
        isExpiring: catEntry?.expires_date ? isNearExpiry(catEntry) : false,
      };
    })
    .sort((a, b) => b.valuePerDollar - a.valuePerDollar);
}
```

Edge cases:
- Quarterly categories: show warning if near expiry
- Capped categories: show cap and warn if near cap
- Cashback cards: cpp = 1.0, multiplier = cashback %
- Cards not in user's vault: don't show

---

## Hard Rules

1. Retention scripts are STATIC from DB. Never AI-generated at runtime.
2. Fee advisor logic uses the tiered recommendation with <12 month override.
3. Spend optimizer ranks by dollar value (multiplier × cpp), not raw earn rate.
4. Copy-to-clipboard on retention scripts.
5. Pro gate: free users see the fee advisor with recommendations blurred. Spend optimizer fully locked.
6. Use primitives from B3.

---

## When Done

1. Fee advisor shows cards sorted by fee date with recommendations
2. Retention scripts display with copy button
3. Downgrade paths show when relevant
4. Retention outcome logging works
5. Spend optimizer ranks user's cards by category
6. Update `AGENT_HANDOFF.md` and `PROGRESS_TRACKER.md`
