# Build Agent B4 — Velocity Engine + Dashboard
**Phase:** 2
**Duration:** 1.5-2 weeks
**Depends on:** B3 (ledger UI complete)
**Blocks:** B5, B6, QA3

---

## Read These First

1. `agents/AGENT_MASTER_PLAN.md`
2. `AGENT_HANDOFF.md`
3. `DECISIONS_NEEDED.md` — specifically issuer rules decision
4. `lib/applicationTypes.ts` — Application type, issuer types, velocity types
5. `hooks/useApplications.ts` — how to query applications

---

## What You're Building

The velocity engine: the core intelligence that makes this app worth paying for. 14 issuer rules as TypeScript constants, a computation engine, a dashboard screen, and ~120 unit tests. **If any rule is wrong, a user could apply for a card and get denied. Test thoroughly.**

---

## Part 1: Issuer Rules (2-3 days)

Create `lib/issuerRules.ts`:

### Rule 1: Chase 5/24
- Count personal cards opened in last 24 months from ANY issuer
- Business cards from Chase, Amex, Capital One do NOT count
- **Citi business cards DO count** (also US Bank, TD Bank)
- Closed cards still count within the 24-month window
- Product-changed cards count once (the original app)
- `BUSINESS_CARDS_THAT_COUNT_TOWARD_5_24 = ['citi', 'us_bank', 'td_bank', 'barclays']`
- Drop-off: first day of applied_month + 24 months

### Rule 2: Chase Sapphire 48-Month
- No Sapphire bonus (CSP or CSR) if you received any Sapphire bonus in last 48 months
- Cross-product: CSR bonus blocks CSP and vice versa
- Only matters if `bonus_achieved === true`
- Denial (no bonus) or not hitting min spend = eligible

### Rule 3: Amex 1-in-90 (Credit Cards)
- Max 1 new Amex credit card per 90 days
- Charge cards (Gold, Platinum, Green) are EXEMPT
- Business credit cards count against personal pace
- Need `isChargeCard(cardName)` helper function
- `AMEX_CHARGE_CARDS = ['Platinum', 'Business Platinum', 'Gold', 'Business Gold', 'Green', 'Business Green']`

### Rule 4: Amex 2-in-90 (Credit Cards)
- Hard limit: max 2 credit cards in 90 days
- Same charge card exemption as Rule 3

### Rule 5: Amex 4/5 Credit Card Limit
- Max 4-5 open credit cards simultaneously (use 5 as threshold)
- Charge cards don't count
- Only OPEN cards count (closed cards excluded)

### Rule 6: Amex Once-Per-Lifetime
- Most Amex cards: signup bonus once per lifetime per card product
- Card families matter: Gold and Rose Gold are the same product
- Business and Personal versions are SEPARATE products
- `LIFETIME_BONUS_FAMILIES` map grouping variants
- Check `bonus_lifetime_burned` flag OR `bonus_achieved` on any prior app of same family

### Rule 7: Citi 8-Day Rule
- Max 1 Citi personal card per 8 calendar days
- Personal only — business cards exempt
- Uses exact date if available, otherwise first-of-month estimate

### Rule 8: Citi 65-Day Rule
- Max 2 Citi personal cards per 65 days

### Rule 9: Citi 24-Month Bonus Rule
- No bonus if received OR closed same card in last 24 months
- Unique: `max(bonus_received_date, closed_date) + 24 months`

### Rule 10: Capital One 6-Month
- ~1 personal card per 6 months (soft rule, show as warning not hard block)
- Business cards don't count

### Rule 11: BofA 2/3/4
- 2 cards in 2 months (60 days)
- 3 cards in 12 months
- 4 cards in 24 months
- Business cards DO count

### Rule 12: Discover Once-Per-Lifetime
- Discover IT bonus is once per lifetime
- Discover Miles is a separate product

### Rule 13: Barclays 6/24
- Denied if 6+ total cards in 24 months from any issuer
- Business cards INCLUDED (unlike Chase 5/24)

### Rule 14: US Bank 2/30
- Max 2 US Bank cards in any 30-day window

### Each rule function signature:

```typescript
type RuleResult = {
  rule_id: string;           // 'chase_5_24'
  issuer: Issuer;
  status: 'clear' | 'warning' | 'blocked';
  current_value: number | null;
  limit_value: number | null;
  eligible_after: string | null;   // 'YYYY-MM' or null
  days_until_clear: number | null;
  message: string;
  applications_considered: string[];
};
```

### Helper functions:
- `countInLastNMonths(apps, N, referenceDate)` — count apps in window
- `isBusinessCardCounted(issuer, cardType)` — per-issuer business card rules
- `getMonthDiff(month1, month2)` — month arithmetic
- `addMonthsToMonthString(monthStr, n)` — month math
- `isChargeCard(cardName)` — Amex charge vs credit
- `getCardFamily(cardName, issuer)` — lifetime bonus family grouping

---

## Part 2: Velocity Engine (1-2 days)

Create `lib/velocityEngine.ts`:

```typescript
function computeVelocity(
  applications: Application[],
  memberId: string,
  referenceDate?: string  // defaults to current month
): VelocityReport

type VelocityReport = {
  member_id: string;
  chase: { five_twenty_four: RuleResult; sapphire_48: RuleResult };
  amex: { one_in_90: RuleResult; two_in_90: RuleResult; credit_limit: RuleResult; lifetime: RuleResult[] };
  citi: { eight_day: RuleResult; sixty_five_day: RuleResult; bonus_24: RuleResult[] };
  capital_one: { six_month: RuleResult };
  bofa: { two_three_four: RuleResult };
  discover: { lifetime: RuleResult };
  barclays: { six_24: RuleResult };
  us_bank: { two_30: RuleResult };
  overall_status: 'clear' | 'some_warnings' | 'some_blocked';
  blocked_issuers: Issuer[];
  warning_issuers: Issuer[];
  optimal_next: string | null;  // recommendation message
};
```

Engine must:
- Filter applications by household member
- Run all 14 rules
- Aggregate results per issuer
- Compute `optimal_next` recommendation
- Complete in <50ms for 50 applications

---

## Part 3: Velocity Dashboard Screen (2-3 days)

Create `app/(tabs)/intelligence/velocity.tsx`:

- Household member filter chips at top
- Per-issuer velocity cards (IssuerVelocityCard component)
- Each card: issuer name + logo color, primary status, badge (clear/warning/blocked), expandable detail
- Chase card: large 5/24 counter with progress bar, Sapphire eligibility row
- Amex card: velocity status, open credit count, lifetime burns list
- Summary at top: "3 issuers clear, 1 warning"
- "Optimal next application" recommendation section at bottom

Create `components/composed/IssuerVelocityCard.tsx`:
- Issuer name with colored dot (Chase blue, Amex blue, Citi red, etc.)
- Primary metric (e.g., "3/5" for Chase)
- Status badge
- Expandable section: list of applications factoring in
- Next eligible date if blocked

**Pro gate:** Free users see the dashboard but velocity calculations are blurred/locked. Use ProGate pattern from existing PaywallModal.

---

## Part 4: Unit Tests (~120 cases, 2-3 days)

Create `__tests__/velocityEngine.test.ts` and `__tests__/helpers/fixtures.ts`.

Install Vitest if not already: `npm install -D vitest`

Test structure follows the 14 rules. Key tests per rule:

**Chase 5/24 (15 tests):** 0 cards, 1 card, 4 cards, 5 cards (blocked), 6 cards, biz excluded (Chase/Amex), biz counted (Citi), closed card counts, product change counts once, 25-month-old card drops off, edge case at exactly 24 months, household separation, authorized user.

**Sapphire 48-month (8 tests):** No prior, 50 months ago (eligible), 40 months ago (not), CSR→CSP crossover, closed doesn't reset, product change doesn't reset, denied (no bonus = eligible), approved but no bonus (eligible).

**Amex velocity (12 tests):** Clear at 100 days, blocked at 60 days, charge card exempt, mixed credit+charge, 2-in-90 hard limit, 4/5 credit card limit, closed cards not counted for limit.

**Amex lifetime (10 tests):** Never had = eligible, 10 years ago = not eligible, biz vs personal separate, Gold vs Rose Gold same family, manual `bonus_lifetime_burned` flag, denied = eligible.

**Citi (8 tests):** 8-day clear/blocked, 65-day clear/blocked, biz exempt, 24-month bonus rule with closure date.

**Other issuers (12 tests):** Cap One 6-month, BofA 2/3/4 (multiple windows), Discover lifetime, Barclays 6/24 (biz included), US Bank 2/30.

**Integration (5 tests):** Complex churner state applying for CSP. Household "who should apply?" scenario. Full 20-app history across 8 issuers. Performance: <50ms.

**Helpers (10 tests):** `countInLastNMonths`, `isBusinessCardCounted`, `getMonthDiff`, `addMonthsToMonthString`.

Add to `package.json`: `"test": "vitest run", "test:watch": "vitest"`

---

## Hard Rules

1. Every rule must have a corresponding test. No untested rules.
2. 95% branch coverage target on `issuerRules.ts` and `velocityEngine.ts`.
3. Rules are TypeScript constants, NOT database tables.
4. Amex charge vs credit distinction is critical. Get it right.
5. Citi business cards counting toward 5/24 is a common gotcha. Test it explicitly.
6. Month precision: all date comparisons use first-of-month. "2024-04" means 2024-04-01.
7. Performance: full velocity computation <50ms for 50 applications.

---

## When Done

1. All ~120 unit tests pass: `npm test`
2. Velocity dashboard renders with real-looking test data
3. Per-issuer cards show correct status
4. Pro gate works on velocity screen
5. Update `AGENT_HANDOFF.md` and `PROGRESS_TRACKER.md`
6. Trigger QA3 (most critical QA agent)
