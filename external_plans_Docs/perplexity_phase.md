Phase 5:   Annual Fee Advisor + Retention Logging
Phase 6:   Spend Optimizer (which card right now)
Phase 7:   Deal Passport (fed by Phase 0.5 pipeline)
Phase 8:   Onboarding Flow (5-screen first-run)
Phase 9:   UI Polish Pass (design system enforcement)
Phase 10:  Paywall Gates Live ($9.99/$99)
Phase 11:  Community Retention Aggregation
           (only after 50+ user submissions)

Rule: Never start Phase N+1 until Phase N is
testable on device. No half-open phases.

---

## BUSINESS LOGIC — ISSUER RULES

### Chase 5/24
Definition: If you have opened 5+ personal credit
cards (any issuer) in the last 24 months, Chase
will deny most card applications.

Calculation:
  count = card_applications WHERE
    card_type = 'personal'
    AND status = 'approved'
    AND applied_date >= NOW() - INTERVAL '24 months'

Business cards from ANY issuer do NOT count toward 5/24.

Drop-off date = oldest qualifying card's applied_date
                + 24 months

Next drop-off = MIN(applied_date) of cards in
                the 5/24 count + 24 months

### Amex Velocity
Soft rule: No more than 1 Amex card per 90 days.
Hard rule: No more than 2 Amex cards per 90 days.

Calculation:
  recent_amex = card_applications WHERE
    issuer = 'American Express'
    AND status = 'approved'
    AND approved_date >= NOW() - INTERVAL '90 days'

If recent_amex >= 1: warn "Soft limit — wait for
  cleaner velocity"
If recent_amex >= 2: error "Hard limit — do not apply"

### Amex Once-Per-Lifetime
Many Amex cards are once-per-lifetime for signup bonus.
Tracked via bonus_lifetime_burned boolean on
card_applications.

Card families that are once-per-lifetime:
  Amex Platinum family
  Amex Gold family
  Amex Green family
  Delta cards (each variant separate)
  Hilton cards (each variant separate)
  Marriott cards (each variant separate)

### Chase Sapphire 48-Month Rule
Cannot receive signup bonus on any Sapphire card
(CSR or CSP) if you received a Sapphire bonus in
the last 48 months.

Calculation:
  last_sapphire_bonus = MAX(last_bonus_received)
    WHERE card_applications.card_id IN
    (SELECT id FROM cards WHERE
     name ILIKE '%Sapphire%' AND issuer = 'Chase')

Eligible again = last_sapphire_bonus + 48 months

### Citi Rules
8-day rule: Cannot apply for 2 Citi cards within
  8 days of each other.
65-day rule: Cannot apply for 3 Citi cards within
  65 days of each other.

### Capital One
6-month rule: Cannot be approved for more than 1
  Capital One card every 6 months.

---

## BUSINESS LOGIC — ANNUAL FEE ADVISOR

Input: card_application record + sum of
       user_benefits.value WHERE used_this_period = true

captured_ratio = benefits_captured / annual_fee

Recommendation rules:
  >= 1.0  → "Keep. You're ahead on value."
  0.80–0.99 → "Keep. You're near breakeven."
  0.50–0.79 → "Call retention first."
             → serve retention script from
               retention_scripts table
             → show downgrade options from
               downgrade_paths table
  < 0.50  → "Consider downgrade or cancel."
             → show downgrade options
             → show cancel considerations
  card age < 12 months → override all above with:
    "Too early to cancel safely. Closing a card
     under 1 year old hurts credit score. Call
     retention instead."

---

## BUSINESS LOGIC — POINTS PORTFOLIO

portfolio_value = SUM(
  points_balances.balance *
  points_valuations.cpp / 100
) for all user programs

Display: always as dollars ($X,XXX)
Never display raw points as the headline number.
Points balance is secondary — dollar value is primary.

---

## BUSINESS LOGIC — SPEND OPTIMIZER

For each card in user's open wallet:
  1. Look up card_categories WHERE
     card_id = card.id AND category = selected_category
  2. Get multiplier (e.g. 4.0 for Amex Gold dining)
  3. Get cpp from points_valuations for card's
     points_currency
  4. value_per_dollar = multiplier * cpp / 100
  5. If amount provided:
     total_value = amount * value_per_dollar
  6. Rank cards by value_per_dollar descending

Edge cases:
  - Quarterly bonus categories: check expires_date
    on card_categories, show warning if near expiry
  - Capped categories: show cap_amount and note
    if user might be near cap (manual input)
  - Cashback cards: cpp = 1.0 by definition,
    multiplier = cashback percentage

---

## AUTOMATION PIPELINE

### Cron Schedule
ingest-doc:      Every Monday 6am PT
ingest-reddit:   Every day 7am PT
ingest-issuers:  Every Sunday 2am PT
auto-apply:      Every hour (applies approved
                 proposals past auto_apply_after)

### Auto-apply Thresholds
confidence >= 0.90 AND source = 'doc'
  → auto_apply_after = created_at + 24 hours

confidence >= 0.85 AND source = 'issuer_page'
  → auto_apply_after = created_at + 24 hours

Everything else → auto_apply_after = NULL
  (never auto-apply, requires manual approval)

Retention data → NEVER auto-apply regardless
  of confidence score

### GPT-4o-mini Extraction Prompt (benefits)
"You are extracting credit card benefit data.
Given the following HTML content from a credit
card benefits page, extract all benefits as JSON.

For each benefit return:
{
  name: string,
  value: number (annual dollar value),
  period: monthly|quarterly|semi-annual|annual,
  category: string,
  description: string (one sentence),
  conditions: string (key restrictions)
}

Return ONLY a JSON array. No explanation.
If you cannot determine a value, use null.
Do not hallucinate benefits not present in the text."

### GPT-4o-mini Extraction Prompt (deals/Reddit)
"You are analyzing a Reddit post or web page
about credit cards.

Determine if this content describes ONE of:
1. A transfer bonus (points transfer promotion)
2. An elevated signup bonus (limited time higher offer)
3. A bank rule change (application policy change)
4. A new card announcement
5. A retention offer data point
6. None of the above

If 1-5, return structured JSON matching the
deal_passport or data_proposals schema.
If 6, return null.

Confidence score: your certainty 0.0-1.0.
Be conservative — return null if uncertain."

---

## ENVIRONMENT VARIABLES

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Supabase Test Project (never use in prod)
SUPABASE_TEST_URL=
SUPABASE_TEST_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_MONTHLY_PRICE_ID=
STRIPE_ANNUAL_PRICE_ID=

# Resend
RESEND_API_KEY=
ADMIN_EMAIL=  # your email for digest notifications

# Admin
ADMIN_USER_ID=  # your Supabase user ID

---

## SESSION RULES FOR CLAUDE CODE

1. Read this entire file before writing any code.

2. One phase per session. Do not start the next
   phase until told to.

3. Every new screen needs a corresponding
   Playwright test in /tests/e2e/

4. Every new table needs RLS policies in the
   same migration file.

5. Never write to data_proposals from client-side
   code. Only Edge Functions write to that table.

6. Never generate retention scripts dynamically.
   Always serve from retention_scripts table.

7. When in doubt about a design decision, use the
   design tokens above. Do not introduce new colors
   or font sizes.

8. After completing any phase, update the
   PHASE_STATUS section below.

---

## PHASE_STATUS

Phase 0:   [ ] pending
Phase 0.5: [ ] pending
Phase 1:   [ ] pending
Phase 2:   [ ] pending
Phase 3:   [ ] pending
Phase 4:   [ ] pending
Phase 5:   [ ] pending
Phase 6:   [ ] pending
Phase 7:   [ ] pending
Phase 8:   [ ] pending
Phase 9:   [ ] pending
Phase 10:  [ ] pending
Phase 11:  [ ] pending

Update format when complete:
Phase 0: [x] complete — Stripe live, 20 cards seeded,
              submitted to App Store 2026-04-20