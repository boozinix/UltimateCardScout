# CardScout — Agent Handoff Document
Version: 1.0 | Last updated: April 2026
Read this entire file before writing any code.

---

## WHAT WE ARE BUILDING

CardScout is a freemium React Native (Expo) app.
It is a credit card operating system — not a comparison
site, not a reminder app. It replaces the spreadsheet
every serious churner maintains manually.

Tagline: "Your cards are working against you.
          We fix that."

One sentence: CardScout tells you what to DO with your
credit cards, not just what you have.

---

## NON-NEGOTIABLES (never violate these)

1. NO bank logins. No Plaid. No credential sharing. Ever.
   All data is manually entered by the user.
   This is a feature, not a limitation. Market it.

2. NO automated writes to production.
   All scraped/AI-extracted data writes to
   data_proposals table first. Human approves.

3. NO dynamic AI generation for user-facing advice.
   Retention scripts: static library of 30, tagged
   by issuer + situation. Served from DB, not generated.

4. NO sponsored card rankings. Ever.
   Cards are ranked by fit to user profile only.

5. SEPARATE test database.
   Never run tests against production Supabase.
   Test project URL stored in .env.test only.

---

## TECH STACK

Mobile/Web:
  Expo SDK 54
  Expo Router v3 (file-based routing)
  React Native
  NativeWind v4 (Tailwind for RN)
  Reanimated 3
  Moti (animation)
  expo-notifications
  expo-haptics
  expo-blur

Backend:
  Supabase (PostgreSQL + Auth + RLS + Edge Functions)
  OpenAI GPT-4o-mini (extraction only, NOT advice)
  Resend (transactional email)
  Stripe (billing)

Deployment:
  Expo EAS Build (iOS + Android)
  Vercel (web)
  GitHub Actions (CI/QA)

---

## DESIGN TOKENS (use these everywhere, no exceptions)

### Colors
background:     #0A0A0F
surface:        #13131A
surface-raised: #1C1C26
border:         #2A2A38
text-primary:   #F0F0FF
text-secondary: #8888AA
text-muted:     #55556A
brand:          #6C63FF
success:        #22C55E
warning:        #F59E0B
danger:         #EF4444
chase:          #117ACA
amex:           #016FD0
citi:           #E31837
capital-one:    #CC0000
discover:       #FF6600

### Typography
Display (big numbers): font-bold text-4xl (36pt)
Screen headings:       font-semibold text-2xl (24pt)
Body:                  font-normal text-base (16pt)
Captions:              font-normal text-xs (12pt)
All currency/numbers:  fontVariant: ['tabular-nums']

### tailwind.config.js custom tokens
module.exports = {
  theme: {
    extend: {
      colors: {
        background: '#0A0A0F',
        surface: '#13131A',
        'surface-raised': '#1C1C26',
        border: '#2A2A38',
        brand: '#6C63FF',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      }
    }
  }
}

---

## FOLDER STRUCTURE

/app                    Expo Router screens
  /(auth)               Login, signup, onboarding
  /(tabs)               Main app (bottom nav)
    /index              Home dashboard
    /vault              My cards + benefits
    /ledger             Application ledger + velocity
    /portfolio          Points portfolio + spend optimizer
    /discover           Card finder + search + compare
  /card/[id]            Card detail
  /onboarding           First-run flow
  /admin                Data review queue (your use only)

/components
  /ui                   Design system primitives
    CardVisual.tsx
    StatCard.tsx
    WealthRing.tsx
    ProgressBar.tsx
    AlertChip.tsx
    SectionHeader.tsx
    BottomSheet.tsx
    ProGate.tsx
  /features             Feature-specific components
    /vault
    /ledger
    /portfolio
    /discover
    /deals

/lib
  /supabase.ts          Client init
  /stripe.ts            Billing helpers
  /openai.ts            GPT-4o-mini client
  /rules                Issuer rule logic
    chase.ts            5/24 calculator
    amex.ts             Velocity + lifetime rules
    citi.ts             8/65 day rules
    capitalOne.ts       6-month rule

/supabase
  /functions            Edge Functions (cron jobs)
    ingest-doc/         Doctor of Credit scraper
    ingest-reddit/      Reddit API monitor
    ingest-issuers/     Card page scraper
    extract-benefits/   GPT-4o-mini benefit extractor
  /migrations           All schema migrations

/scripts
  /seed-test-db.ts      Test database seeder
  /seed-cards.ts        Card catalog seeder

/tests
  /e2e                  Playwright tests
  /unit                 Logic unit tests
  /fixtures             Test data

/.github
  /workflows
    qa.yml              Runs on every push

---

## BOTTOM NAVIGATION (5 tabs)

Tab 1: Home (index)     — Dashboard, expiring chips,
                          active bonuses, deal highlights
Tab 2: Vault            — Cards held, benefits, calendar
Tab 3: Ledger           — Application history, velocity
Tab 4: Portfolio        — Points balances, spend optimizer
Tab 5: Discover         — Card finder, search, compare

---

## PRO GATE PATTERN

Every Pro feature uses the <ProGate> component.
When a free user hits a Pro feature:
  - Content is blurred behind overlay
  - Lock icon + "Pro feature" label
  - Tap → opens paywall BottomSheet
  - Never hard-block navigation, always show
    what they're missing

Free tier limits:
  - Max 3 cards in Vault
  - Card Finder, Search, Compare (unlimited)
  - Basic benefit list per card
  - No Ledger access
  - No Portfolio access
  - No Deal Passport

Pro tier ($9.99/mo or $99/yr):
  - Unlimited cards
  - Full Ledger + Velocity Dashboard
  - Bonus Spend Tracker
  - Points Portfolio Valuation
  - Annual Fee Advisor
  - Spend Optimizer
  - Deal Passport
  - ICS export

---

## STRIPE INTEGRATION

- Products created in Stripe dashboard (not code)
- Price IDs stored in environment variables:
  STRIPE_MONTHLY_PRICE_ID
  STRIPE_ANNUAL_PRICE_ID
- Pro status stored in Supabase users table:
  is_pro: boolean
  pro_expires_at: timestamptz
  stripe_customer_id: text
- Stripe webhook updates is_pro on
  checkout.session.completed and
  customer.subscription.deleted
- Never trust client-side pro status.
  Always verify from Supabase server-side.