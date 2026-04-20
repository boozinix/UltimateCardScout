# QA Layer 1 — Velocity Engine Unit Tests

> **Purpose:** Deterministic test coverage for `lib/velocityEngine.ts` and `lib/issuerRules.ts`.
> **Stakes:** If a velocity rule is wrong, a user applies for a card they weren't eligible for, eats a hard pull, and gets denied. That's trust-destroying. This file exists to prevent it.
> **When to run:** Every commit, via Vitest in CI. Pre-merge gate.
> **Coverage target:** 95% branch coverage on `lib/issuerRules.ts` and `lib/velocityEngine.ts`. 100% on the individual rule functions.

---

## How This File Is Used

Claude Code reads this file and translates each `Given/When/Then` block into a Vitest test case. The file itself is the spec. Tests live in `__tests__/velocityEngine.test.ts`. Running `npm test` executes them.

Every rule added to `lib/issuerRules.ts` requires corresponding tests here before merge. No exceptions.

---

## Setup

```ts
// __tests__/helpers/fixtures.ts

import { Application, HouseholdMember } from '@/lib/applicationTypes';

export function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: `app-${Math.random()}`,
    user_id: 'test-user',
    household_member_id: 'member-1',
    card_name: 'Test Card',
    issuer: 'chase',
    card_type: 'personal',
    counts_toward_5_24: true,
    applied_month: '2025-01',
    status: 'active',
    bonus_currency: 'chase_ur',
    bonus_amount: 60000,
    bonus_min_spend: 4000,
    bonus_spend_months: 3,
    bonus_achieved: false,
    annual_fee: 95,
    credit_bureau: 'equifax',
    ...overrides
  };
}

export function makeHouseholdMember(overrides = {}): HouseholdMember {
  return {
    id: 'member-1',
    user_id: 'test-user',
    name: 'Zubair',
    role: 'primary',
    ...overrides
  };
}

// For "today is X" tests, mock the date
export function withDate(isoDate: string, fn: () => void) {
  const RealDate = Date;
  global.Date = class extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(isoDate);
      } else {
        super(...args);
      }
    }
    static now() { return new RealDate(isoDate).getTime(); }
  } as any;
  try { fn(); } finally { global.Date = RealDate; }
}
```

All tests assume "today" is `2026-04-19` unless otherwise specified via `withDate()`.

---

## Section 1: Chase 5/24 Rule

> The Rule: Chase will deny a personal card application if the applicant has opened 5 or more credit cards from any issuer in the past 24 months. Business cards from Chase, Amex, Capital One, and some others don't count. Authorized user cards count (with some exceptions).

### Test 1.1 — Zero cards = 0/24, clear

**Given:** No applications in ledger for member
**When:** Computing 5/24 for member
**Then:** `count === 0`, `status === 'clear'`, `next_drop_off === null`

### Test 1.2 — One personal card 12 months ago = 1/24, clear

**Given:** One active personal card, applied 2025-04
**When:** Computing 5/24
**Then:** `count === 1`, `status === 'clear'`, `next_drop_off === '2027-04'`

### Test 1.3 — Four cards in past 24 months = 4/24, clear

**Given:** 4 personal cards applied 2024-06, 2024-11, 2025-03, 2025-09
**When:** Computing 5/24
**Then:** `count === 4`, `status === 'clear'`

### Test 1.4 — Exactly 5 cards = 5/24, blocked

**Given:** 5 personal cards applied in last 24 months
**When:** Computing 5/24
**Then:** `count === 5`, `status === 'blocked'`, `next_drop_off` = oldest application's date + 24 months

### Test 1.5 — 6 cards = blocked, drop-off correct

**Given:** 6 personal cards, oldest applied 2024-07
**When:** Computing 5/24
**Then:** `count === 6`, `status === 'blocked'`, `next_drop_off === '2026-07'`, months_until_clear === 3

### Test 1.6 — Chase Ink Business excluded

**Given:** 4 personal cards + 1 Chase Ink Business Preferred in last 24 months
**When:** Computing 5/24
**Then:** `count === 4` (business excluded)

### Test 1.7 — Amex Business Platinum excluded

**Given:** 4 personal cards + 1 Amex Business Platinum
**When:** Computing 5/24
**Then:** `count === 4` (Amex business excluded)

### Test 1.8 — Capital One Venture X Business excluded

**Given:** 4 personal cards + 1 Capital One Venture X Business
**When:** Computing 5/24
**Then:** `count === 4`

### Test 1.9 — Citi Business counts (important edge case)

**Given:** 4 personal cards + 1 Citi / AAdvantage Business
**When:** Computing 5/24
**Then:** `count === 5`, `status === 'blocked'` — Citi business DOES count toward 5/24

**Implementation note:** `BUSINESS_CARDS_THAT_COUNT_TOWARD_5_24 = ['citi', 'us_bank', 'td_bank']` — do not get this wrong.

### Test 1.10 — Closed card still counts within 24 months

**Given:** Personal card applied 2025-02, closed 2025-10
**When:** Computing 5/24 today (2026-04)
**Then:** `count === 1` — closure doesn't remove from 5/24 count

### Test 1.11 — Product-changed card counts once

**Given:** Chase Freedom → product-changed to Chase Freedom Unlimited
**When:** Computing 5/24
**Then:** `count === 1`, not 2 — product change is not a new application

### Test 1.12 — Card applied 25 months ago = not counted

**Given:** 1 card applied 2024-03
**When:** Computing 5/24 today (2026-04)
**Then:** `count === 0`, it dropped off

### Test 1.13 — Card applied exactly 24 months ago today = edge case

**Given:** 1 card applied 2024-04 (today is 2026-04-19)
**When:** Computing 5/24
**Then:** `count === 1` — 24-month window is inclusive of same-month application 24 months prior

**Decision rule:** Use first day of applied_month + 24 months as drop-off date. Applied 2024-04-01 drops off 2026-04-01. So on 2026-04-19, it's no longer in the window. `count === 0`. Document this clearly in the rule.

**Rewrite:** Given the above decision, Test 1.13 should expect `count === 0`. Pick the convention and stick with it in code comments.

### Test 1.14 — Household: member 1 has 4/24, member 2 has 2/24

**Given:** Household with 2 members, member-1 has 4 applications, member-2 has 2
**When:** Computing 5/24 per member
**Then:** member-1 `count === 4`, member-2 `count === 2`. Separately tracked.

### Test 1.15 — Authorized user card counts

**Given:** Application marked `is_authorized_user: true` (on primary's Amex, added to partner)
**When:** Computing 5/24 for partner
**Then:** `count === 1` — AU cards count for 5/24 even though partner didn't "apply"

**Implementation note:** AU handling is complex — Chase deprioritizes some AU cards in 5/24 count but officially it counts. Default to counting. Allow user to manually flag an AU as "not reported" if they know it wasn't.

---

## Section 2: Chase 48-Month Sapphire Rule

> The Rule: Chase will not grant a Sapphire Preferred or Sapphire Reserve signup bonus if the applicant has received a bonus from any Sapphire card (Preferred or Reserve) within the past 48 months.

### Test 2.1 — No prior Sapphire = eligible

**Given:** No Sapphire cards in history
**When:** Checking eligibility for CSP bonus
**Then:** `eligible === true`

### Test 2.2 — Got CSP bonus 50 months ago = eligible

**Given:** CSP applied 2022-01, bonus_achieved 2022-05
**When:** Checking eligibility today (2026-04)
**Then:** `eligible === true` — 50 months since bonus

### Test 2.3 — Got CSP bonus 40 months ago = NOT eligible

**Given:** CSP applied 2022-11, bonus_achieved 2023-01
**When:** Checking eligibility today
**Then:** `eligible === false`, `eligible_after === '2027-01'`

### Test 2.4 — CSR → CSP crossover: got CSR bonus 30 months ago, applying for CSP

**Given:** CSR applied 2023-10, bonus_achieved 2024-01
**When:** Checking CSP eligibility today
**Then:** `eligible === false` — 48-month rule covers BOTH Sapphire products, not just the same one

### Test 2.5 — CSP → closed 24 months ago, applying for new CSP

**Given:** CSP applied 2022-01, bonus_achieved 2022-05, closed 2024-01
**When:** Checking CSP eligibility today
**Then:** `eligible === false` — closure doesn't reset the 48-month clock, only time since bonus matters

### Test 2.6 — Product change from CSP to Freedom, then applying for new CSP

**Given:** CSP bonus in 2022, product-changed to Freedom in 2024
**When:** Checking CSP eligibility in 2026
**Then:** `eligible === false` — product change also doesn't reset

### Test 2.7 — Got CSP denied (no bonus earned) 12 months ago

**Given:** CSP application status=denied, no bonus earned
**When:** Checking eligibility today
**Then:** `eligible === true` — rule is about receiving bonus, not applying

### Test 2.8 — Got CSP approved but didn't hit min spend (no bonus earned) 20 months ago

**Given:** CSP approved 2024-08, `bonus_achieved === false`
**When:** Checking eligibility today
**Then:** `eligible === true` — no bonus received, rule doesn't apply

---

## Section 3: Amex Once-Per-Lifetime

> The Rule: Amex grants most signup bonuses only once per lifetime per card. Pop-up message says "We have determined you are not eligible for this welcome offer." Applies across all personal and business variants of each card family.

### Test 3.1 — Never had Plat = eligible for Plat bonus

**Given:** No Amex Platinum in history
**When:** Checking Amex Plat bonus eligibility
**Then:** `eligible === true`

### Test 3.2 — Got Plat bonus 10 years ago = NOT eligible

**Given:** Amex Plat bonus_achieved 2016-01
**When:** Checking today
**Then:** `eligible === false` — lifetime, not time-based

### Test 3.3 — Had Plat, closed it, applying for new Plat = NOT eligible

**Given:** Amex Plat bonus_achieved 2020-03, closed 2022-08
**When:** Checking today
**Then:** `eligible === false`

### Test 3.4 — Got Plat Biz bonus, applying for Plat Personal

**Given:** Amex Business Platinum bonus earned 2023-05
**When:** Checking Amex Personal Platinum eligibility
**Then:** `eligible === true` — Biz and Personal Plat are separate products

### Test 3.5 — Got Plat bonus, applying for Amex Gold

**Given:** Amex Plat bonus 2022
**When:** Checking Gold eligibility
**Then:** `eligible === true` — different product family

### Test 3.6 — Got Amex Gold bonus, applying for Amex Rose Gold variant

**Given:** Amex Gold (standard) bonus 2023
**When:** Checking Rose Gold eligibility
**Then:** `eligible === false` — Rose Gold is a Gold variant, same product for eligibility

**Implementation note:** Card variants need explicit grouping. `LIFETIME_BONUS_FAMILIES = { 'amex_gold': ['amex_gold_standard', 'amex_gold_rose'], 'amex_plat_personal': [...], 'amex_plat_business': [...] }`

### Test 3.7 — Hilton Aspire → Hilton Surpass (different cards)

**Given:** Hilton Aspire bonus 2023
**When:** Checking Hilton Surpass eligibility
**Then:** `eligible === true` — separate Hilton products

### Test 3.8 — Delta Gold → Delta Platinum (same family)

**Given:** Delta Gold bonus 2022
**When:** Checking Delta Platinum eligibility
**Then:** `eligible === true` — different Delta card tiers count separately

### Test 3.9 — Applied but denied, no bonus

**Given:** Amex Plat denied 2021, no bonus received
**When:** Checking today
**Then:** `eligible === true` — no bonus = clean slate

### Test 3.10 — `bonus_lifetime_burned: true` flag

**Given:** Manual flag `bonus_lifetime_burned: true` on Amex Plat (from pop-up message)
**When:** Checking Plat eligibility
**Then:** `eligible === false` regardless of history — user manually marked as burned

---

## Section 4: Amex 1-in-90 Day Rule

> The Rule: Amex approves only 1 new credit card (not charge card) per 90 days. Charge cards (Gold, Plat) do not count. Business cards do count against personal pace and vice versa.

### Test 4.1 — Last Amex credit card 100 days ago = clear

**Given:** Amex Delta Gold (credit card) applied 2026-01-05, today 2026-04-19
**When:** Checking 1-in-90
**Then:** `status === 'clear'`, 104 days elapsed

### Test 4.2 — Last Amex credit card 60 days ago = blocked

**Given:** Amex BCE applied 2026-02-19
**When:** Checking 1-in-90 today
**Then:** `status === 'blocked'`, `eligible_after = applied_date + 90 days = 2026-05-20`, days remaining = 31

### Test 4.3 — Amex Gold (charge card) 30 days ago = clear

**Given:** Amex Gold (charge card) applied 2026-03-20
**When:** Checking for another Amex credit card
**Then:** `status === 'clear'` — charge cards don't count toward 1-in-90

### Test 4.4 — Amex Plat (charge) 30 days ago, now applying for another Plat

**Given:** Amex Plat (charge) applied 2026-03-20
**When:** Checking for Amex Business Plat (charge)
**Then:** `status === 'clear'` — charge→charge also clear (different rule applies: 5-day rule for charge cards)

**Implementation note:** Amex has a separate "5-day rule" for charge cards. Keep rules separate; don't conflate.

### Test 4.5 — Mixed: credit card 60 days ago + charge card 30 days ago

**Given:** Delta Gold (credit) 2026-02-19, Plat (charge) 2026-03-20
**When:** Checking for another credit card
**Then:** `status === 'blocked'` — 1-in-90 counted from most recent credit card (Delta Gold), not charge card

---

## Section 5: Amex 2-in-90 Rule (Credit Cards)

> The Rule: Amex approves max 2 credit cards per 90 days. Even if 1-in-90 is satisfied, if 2 credit cards in last 90 days, third is denied.

### Test 5.1 — 0 credit cards in last 90 days = clear

### Test 5.2 — 1 credit card in last 90 days = clear for 2nd

### Test 5.3 — 2 credit cards in last 90 days = blocked for 3rd

**Given:** Two Amex credit cards applied in past 90 days
**When:** Checking for 3rd
**Then:** `status === 'blocked'`, `eligible_after` = oldest of the 2 applications + 90 days

---

## Section 6: Amex 4/5 Credit Card Limit

> The Rule: Amex approves max 4-5 credit cards open simultaneously (exact limit varies by profile, conservatively use 5). Charge cards excluded.

### Test 6.1 — 3 open credit cards = clear for another

### Test 6.2 — 5 open credit cards = blocked

### Test 6.3 — 5 open charge cards + 3 credit = clear for another credit card

**Given:** 5 Amex charge cards + 3 Amex credit cards all open
**When:** Checking for new credit card
**Then:** `status === 'warning'` — approaching limit but not over (credit: 3/5)

### Test 6.4 — Closed credit card not counted

**Given:** 5 credit cards open at some point, 2 now closed
**When:** Checking today
**Then:** `status === 'clear'` (3 open credit cards)

---

## Section 7: Citi 8-Day Rule

> The Rule: Citi approves max 1 personal credit card per 8 days. Separate from 65-day rule.

### Test 7.1 — Last Citi personal 10 days ago = clear

### Test 7.2 — Last Citi personal 5 days ago = blocked

**Given:** Citi Custom Cash applied 2026-04-14
**When:** Checking today (2026-04-19) for another Citi personal
**Then:** `status === 'blocked'`, `eligible_after === '2026-04-22'`

### Test 7.3 — Citi business 5 days ago doesn't block personal

**Given:** Citi business card applied 2026-04-14
**When:** Checking Citi personal today
**Then:** `status === 'clear'` — 8-day rule is personal-only

---

## Section 8: Citi 65-Day Rule

> The Rule: Citi approves max 2 personal credit cards per 65 days.

### Test 8.1 — 1 Citi personal in last 65 days = clear for 2nd

### Test 8.2 — 2 Citi personals in last 65 days = blocked for 3rd

### Test 8.3 — 2 Citi personals: one 70 days ago, one 10 days ago = clear for 3rd

**Given:** First Citi applied 2026-02-08, second 2026-04-09
**When:** Checking today (2026-04-19)
**Then:** Only 1 counts in window → `status === 'clear'`

---

## Section 9: Citi 24-Month Bonus Rule

> The Rule: Citi grants signup bonus only if applicant has not received OR closed a bonus on the same card in the past 24 months.

### Test 9.1 — Never had Strata Premier = eligible

### Test 9.2 — Strata Premier bonus 30 months ago = eligible

### Test 9.3 — Strata Premier bonus 20 months ago = NOT eligible

### Test 9.4 — Strata Premier closed 20 months ago (bonus 30 months ago) = NOT eligible

**Given:** Got bonus 2023-10 but closed card 2024-08
**When:** Checking today
**Then:** `eligible === false` — closure triggers 24-month clock from closure date

**Implementation note:** Citi's rule is uniquely complex — it looks at max(bonus_date, closed_date) + 24 months.

---

## Section 10: Capital One 6-Month Rule

> The Rule: Capital One approves roughly 1 personal card per 6 months. Informal, not strict, but should be warned about.

### Test 10.1 — Last CapOne personal 8 months ago = clear

### Test 10.2 — Last CapOne personal 3 months ago = warning

**Given:** Venture applied 2026-01-15
**When:** Checking today (2026-04-19)
**Then:** `status === 'warning'`, `recommended_wait_until === '2026-07-15'`

### Test 10.3 — CapOne business doesn't count

**Given:** Spark Cash business 2 months ago
**When:** Checking for CapOne personal
**Then:** `status === 'clear'`

---

## Section 11: Bank of America 2/3/4 Rule

> The Rule: BofA limits new cards: 2 in 2 months, 3 in 12 months, 4 in 24 months per applicant.

### Test 11.1 — Zero BofA cards = clear

### Test 11.2 — 1 BofA card in last 2 months = clear

### Test 11.3 — 2 BofA cards in last 2 months = blocked (2/2)

### Test 11.4 — 2 BofA cards in last 12 months but one was 3 months ago = clear for 2-month window, check 12-month

**Given:** Two BofA cards: one 1 month ago, one 3 months ago
**When:** Checking today
**Then:** 2/2 triggered (both in last 2 months counts? Need to clarify)

**Decision:** "2 in 2 months" means in the past 60 days. Card from 3 months ago doesn't count toward 2/2 rule. Card from 1 month ago does. So count = 1/2, clear.

### Test 11.5 — 3 BofA cards in last 12 months = blocked (3/12)

### Test 11.6 — 4 BofA cards in last 24 months = blocked (4/24)

### Test 11.7 — BofA business card counts

**Given:** 1 BofA Business Advantage + 2 BofA personal in last 12 months
**When:** Checking for new BofA card
**Then:** `status === 'blocked'` (3/12) — BofA business cards count toward this rule

---

## Section 12: Discover Once-Per-Lifetime

> The Rule: Discover IT card signup bonus is once per lifetime, similar to Amex.

### Test 12.1 — Never had Discover IT = eligible
### Test 12.2 — Got Discover IT bonus 5 years ago = NOT eligible
### Test 12.3 — Discover Miles vs IT = separate products, eligible

---

## Section 13: Barclays 6/24

> The Rule: Barclays less formal rule — denies applications where applicant has 6+ cards in past 24 months from any issuer.

### Test 13.1 — 5 total cards in 24 months = clear
### Test 13.2 — 6 total cards in 24 months = blocked
### Test 13.3 — Business cards included in Barclays count (different from Chase)

---

## Section 14: US Bank 2/30

> The Rule: US Bank limits applicants to 2 credit cards in any rolling 30-day window.

### Test 14.1 — 0 US Bank cards in 30 days = clear
### Test 14.2 — 1 US Bank card in 30 days = clear for 2nd
### Test 14.3 — 2 US Bank cards in 30 days = blocked for 3rd

---

## Section 15: Integration Tests (Cross-Rule Scenarios)

These test the engine's ability to produce the right combined output when multiple rules apply.

### Test 15.1 — Complex churner state: applying for Chase Sapphire Preferred

**Given:**
- 4 personal cards in last 24 months (4/24)
- CSP bonus received 2022-04 (48 months ago exactly)
- Last Chase application 5 months ago

**When:** Checking eligibility for new CSP
**Then:**
- `five_twenty_four: { count: 4, status: 'clear' }`
- `sapphire_48_month: { eligible: true }` — just at the 48-month mark
- `overall_recommendation: 'apply'`

### Test 15.2 — Household: who should apply for the new Ink Preferred?

**Given:** Two household members:
- Member A: 4/24, last Chase 2 months ago, got Ink Preferred 15 months ago
- Member B: 2/24, no Chase cards ever, no history

**When:** Asking "who should apply for Chase Ink Preferred?"
**Then:** Recommends Member B (cleaner slate)

### Test 15.3 — All issuers, full history

**Given:** 20 applications spanning 3 years across 8 issuers (realistic Zubair state)
**When:** Running full velocity engine
**Then:**
- Chase 5/24 counted correctly
- Amex open credit cards counted
- Citi 65-day window checked
- All per-issuer statuses returned
- Performance: completes in <50ms

---

## Section 16: Helper Function Tests

### Test 16.1 — `countInLastNMonths(applications, N, referenceDate)`

- 0 applications → 0
- 5 applications all within N months → 5
- 5 applications, 2 older than N months → 3
- Edge: applied_month exactly N months ago (see Test 1.13 decision)

### Test 16.2 — `isBusinessCardCounted(issuer, card_type)`

- `chase`, `business` → false
- `amex`, `business` → false
- `citi`, `business` → true
- `us_bank`, `business` → true
- `chase`, `personal` → true

### Test 16.3 — `getMonthDiff(month1, month2)`

- `'2025-01'` vs `'2026-01'` → 12
- `'2024-06'` vs `'2026-04'` → 22
- `'2026-04'` vs `'2026-04'` → 0
- Invalid input → throws

### Test 16.4 — `addMonthsToMonthString(monthStr, n)`

- `('2025-01', 12)` → `'2026-01'`
- `('2025-12', 1)` → `'2026-01'`
- `('2024-06', -3)` → `'2024-03'`

---

## Section 17: Regression Tests

When a real velocity bug is caught in production, a regression test goes here, labeled with the issue number.

Template:
```
### Test 17.X — [Description] (Issue #N)

**Given:** [exact state that produced the bug]
**When:** [action]
**Then:** [correct output]
```

---

## Running the Tests

```bash
# Run all Layer 1 tests
npm test

# Run only velocity engine tests
npm test velocityEngine

# Run with coverage
npm test -- --coverage

# Watch mode while developing
npm test -- --watch
```

**CI requirements:**
- All tests must pass before merge
- Coverage must be ≥95% on `lib/velocityEngine.ts` and `lib/issuerRules.ts`
- Coverage drop >2% between PRs triggers manual review

---

## When a Rule Changes

Issuers update rules occasionally. When this happens:

1. Update the rule in `lib/issuerRules.ts`
2. Update the corresponding section here with the new rule description
3. Update or add tests reflecting the new behavior
4. Add a dated note to the section header: "> **Updated 2026-06-15:** Amex changed 1-in-90 to 1-in-60 for some products."
5. Run full suite, ensure no regressions

---

## Known Limitations (Document, Don't Fix)

These are things the engine intentionally cannot do:

- **Soft inquiries vs hard inquiries** — engine only tracks what user logs; doesn't pull credit report
- **Pre-approvals / targeted offers** — issuer internal rules for targeted mail offers are opaque; engine treats all applications the same
- **Shutdown risk modeling** — "SUS flags" are user-noted, not predicted by engine
- **Score-based denials** — engine doesn't model credit score; assumes user has good credit

Users with these concerns should consult human resources (churning forums, personal finance advisors) in addition to this engine's output.

---

## Velocity Engine Output Shape (Reference)

Every rule function returns this shape:

```ts
type RuleResult = {
  rule_id: string;                 // 'chase_5_24'
  issuer: Issuer;
  status: 'clear' | 'warning' | 'blocked';
  current_value: number | null;    // e.g. 4 for 5/24
  limit_value: number | null;      // e.g. 5 for 5/24
  eligible_after: string | null;   // ISO date or YYYY-MM
  days_until_clear: number | null;
  message: string;                 // human-readable summary
  applications_considered: string[]; // IDs of apps that factored in
};
```

The full engine output aggregates per-issuer `RuleResult[]` arrays.

---

## Summary

- **~120 discrete test cases** across 14 rules + helpers + integration
- **Deterministic** — no external calls, no AI, no fuzzy matching
- **Fast** — full suite runs in <2 seconds
- **Non-negotiable** — phase 2 does not close until all tests pass

If a test seems wrong, the rule might be wrong. If a rule is right but untested, the test is missing. Add it.
