# Agent Handoff Document
**Project:** Card Scout Unified App
**Last updated:** 2026-04-19
**Repo:** https://github.com/boozinix/UltimateCardScout
**Working dir:** `/Users/zubairnizami/Projects/Ultimate Card Scout/UnifiedApp/`

---

## READ THIS FIRST — Session Context

This doc is the single source of truth for any new agent session. Read this + `PROGRESS_TRACKER.md` before writing any code. The full strategy discussion is in `CONVERSATION_LOG_2026-04-19.md`.

---

## What This Project Is

A credit card operating system — merges CardScout (discovery) + PerksVault (benefits tracking) into one Expo SDK 54 app.

**Product vision:** Replace the churner's spreadsheet. Track every dollar of benefit value. Proactively tell users the optimal move before they miss it.

**cardscout.app (cc-recommender) stays live** — it's the free SEO-driven discovery site. This UnifiedApp is the companion app with paid intelligence features.

---

## How to Run

```bash
cd "/Users/zubairnizami/Projects/Ultimate Card Scout/UnifiedApp"
npm install --legacy-peer-deps   # lucide-react-native has React 19 peer conflict
npx expo start --web
# Open http://localhost:8081
# DEV TOGGLE: floating pill button bottom-right — tap to cycle AUTO / MOB / DSK layouts
```

Cards load from `public/cards.csv` when Supabase is unreachable (always in local demo).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54, Expo Router v3 |
| Styling | NativeWind v4 + `lib/theme.ts` design tokens |
| State / Data | React Query (`@tanstack/react-query`) |
| Backend | Supabase (PostgreSQL + Auth + RLS + Deno Edge Functions) |
| Auth | Supabase magic link + Apple Sign-In + Google Sign-In (to add) |
| Payments | Stripe ($8/mo or $59/yr, 14-day trial) |
| AI | OpenAI GPT-4o-mini via Edge Functions (Pro only, cheap calls only) |
| Analytics | PostHog — no-op wrapper if key not set |
| Email | Resend |
| Build | EAS Build (iOS/Android), Vercel (web) |

---

## Product Decisions (LOCKED — do not revisit without user instruction)

| Decision | Choice |
|---|---|
| Concierge tab | REMOVED entirely |
| 4th tab name | "Intelligence" (not Tracker, not Concierge) |
| cardscout.app | Stays live as free discovery site |
| Freemium model | Free = discovery + basic vault. Paid = Intelligence features |
| Paid pricing | **$8/mo**, annual TBD. Can change anytime. |
| Household tracking | Yes — cap at 4 members, no separate auth. Defaults: Johnny, Moira, David, Alexis (Schitt's Creek placeholders). |
| Theme | **Light.** Dark is V2. ThemeContext supports both. |
| App Store timing | Submit AFTER Phase 1 (Application Ledger) + onboarding exist |
| AI usage | GPT-4o-mini only, server-side only, user-triggered only, cached where possible |
| Free ledger limit | Unlimited history viewing free. Paid = velocity intelligence + annual fee advisor + alerts |
| Onboarding | Shows value before asking for account. No household setup during onboarding — do it inside Intelligence tab first-run. |
| Spreadsheet import | **Both CSV + NL chatbot.** CSV for bulk import, chatbot for ongoing single entries. |
| Date precision | **Month ('YYYY-MM').** Matches real churner tracking. |
| Affiliate links | **No.** Raw issuer URLs only. Add affiliate layer later. |
| Issuer rules | **TypeScript constants** (`lib/issuerRules.ts`). 14 rules. Not DB table. |
| Guardrail: No Plaid | No bank logins, no credential sharing. Manual data only. |
| Guardrail: AI quality | AI can parse/extract. User-facing advice must be vetted. Retention scripts are curated static library from DB. |
| Guardrail: No sponsored rankings | Cards ranked by fit only. |
| Guardrail: Human-approved writes | Automated ingestion → review queue → user approves weekly. |
| Guardrail: Separate test DB | Never test against production Supabase. |
| Home dashboard | **No dedicated tab.** Intelligence hub serves as dashboard. |
| QA infrastructure | **Not now.** Unit tests at Phase 2. E2E closer to App Store. |
| Design system | **No dedicated phase.** Build core primitives alongside Phase 1 screens. |
| Automation pipeline | **After Phase 1.** Not Phase 0.5. |
| Email forwarding | **Yes, build it.** Bundled with automation (Phase 7). |

---

## Freemium Tier Breakdown

**FREE:**
- Full card discovery (quiz, NL search, all tools, card browser)
- Vault up to 3 cards (benefit tracking + reminders)
- Application history: view up to 5 entries
- Basic points portfolio (view only)

**PRO ($8/mo or $59/yr):**
- Unlimited vault
- Full Application Ledger (unlimited entries)
- Velocity Dashboard (5/24, all issuer rules, bonus eligibility)
- Bonus Spend Tracker with deadline alerts
- Points Portfolio with valuations + alerts
- Annual Fee Advisor (30-day alerts, retention script, downgrade paths)
- Deal Passport (transfer bonuses, elevated signups, community reports)
- Spend Optimizer ("which card right now?")
- AI natural language card entry (parse-application Edge Function)

---

## Design Tokens (never hardcode)

All in `lib/theme.ts`. Components must use these via `ThemeContext`, not import `colors` directly.

- **Primary accent:** `#1B4FD8` (blue) — buttons, active states, CTAs
- **Gold:** `#92400E` — semantic only for captured value displays
- **Canvas:** `#FAFAF9` warm linen (light mode)
- **Typography:** Playfair Display (hero H1s), Inter (body), Geist Mono (numeric/tabular)
- **Status:** `colors.success` (green), `colors.warn` (amber), `colors.urgent` (red), `colors.muted` (grey)

Dark mode tokens exist in `lib/theme.ts` `dark` object — complete them when building ThemeContext.

---

## Navigation Structure

```
4 visible tabs:
  Discover      → /(tabs)/discover
  Vault         → /(tabs)/portfolio
  Intelligence  → /(tabs)/intelligence   ← new (replaced Concierge)
  Settings      → /(tabs)/settings       ← moved to tab bar (was hidden)

Hidden (router.push only, no tab bar entry):
  Calendar      → /(tabs)/calendar
  Tools         → /(tabs)/tools
  Insights      → /(tabs)/insights       ← may merge into Intelligence later
```

**Desktop (≥1024px):** 240px sidebar. **Mobile (<1024px):** bottom tab bar.

Intelligence tab sub-screens (build in Phase 15):
```
/(tabs)/intelligence/index.tsx        — hub screen, links to all sub-features
/(tabs)/intelligence/ledger.tsx       — Application Ledger list
/(tabs)/intelligence/add.tsx          — Add application (form + NL chatbot)
/(tabs)/intelligence/[id].tsx         — Application detail/edit
/(tabs)/intelligence/velocity.tsx     — Velocity Dashboard (5/24 etc.)
/(tabs)/intelligence/portfolio.tsx    — Points Portfolio
/(tabs)/intelligence/fee-advisor.tsx  — Annual Fee Calendar + Advisor
/(tabs)/intelligence/spend.tsx        — Spend Optimizer
/(tabs)/intelligence/deals.tsx        — Deal Passport
```

---

## Key Files

### App Screens
| File | Purpose |
|---|---|
| `app/(tabs)/discover/index.tsx` | NL search, quick pills, tools section |
| `app/(tabs)/discover/quiz.tsx` | Step wizard |
| `app/(tabs)/discover/results.tsx` | Scored card results |
| `app/(tabs)/portfolio/index.tsx` | VaultScreen — card list |
| `app/(tabs)/portfolio/add-card.tsx` | Search + By URL AI extraction (Pro) |
| `app/(tabs)/portfolio/benefits.tsx` | Per-card benefit list |
| `app/(tabs)/intelligence/index.tsx` | Intelligence hub — Phase 0 placeholder |
| `app/(tabs)/settings/index.tsx` | Account + billing |
| `app/(auth)/login.tsx` | Magic link login + guest bypass |

### Library
| File | Purpose |
|---|---|
| `lib/theme.ts` | All design tokens — light + dark |
| `lib/applicationTypes.ts` | NEW — Application Ledger TypeScript types |
| `lib/supabase.ts` | Supabase client |
| `lib/analytics.ts` | PostHog wrapper |
| `lib/scoring.ts` | Quiz → card scoring |
| `lib/cardTypes.ts` | Card type definition |
| `lib/subscription.ts` | Stripe checkout, FREE_CARD_LIMIT |

### Contexts
| File | Purpose |
|---|---|
| `contexts/BreakpointContext.tsx` | Desktop/mobile override for dev toggle |
| `contexts/ThemeContext.tsx` | Light/dark theme switching — TO BUILD in Phase 0 |

### Hooks
| File | Purpose |
|---|---|
| `hooks/useBreakpoint.ts` | `isDesktop` flag — respects forced mode from DevToggle |
| `hooks/useCards.ts` | Fetch card catalog (Supabase → CSV fallback) |
| `hooks/useSubscription.ts` | `useFeatureGate()`, subscription status |

### Components
| File | Purpose |
|---|---|
| `components/CardTile.tsx` | Expandable card result tile |
| `components/PaywallModal.tsx` | Upgrade modal |
| `components/WealthRing.tsx` | SVG ring — benefit value display |
| `components/Button.tsx` | Shared button |
| `components/Typography.tsx` | Shared text components |
| `components/DevToggle.tsx` | NEW — floating dev layout toggle (DEV only) |

### Database
| File | Purpose |
|---|---|
| `supabase/schema.sql` | Core schema (cards, benefits, user_cards, reminders, subscriptions) |
| `supabase/migrations/001_applications_ledger.sql` | NEW — household_members, applications, retention_outcomes, points_balances |
| `supabase/functions/scrape-card/` | GPT-4o benefit extraction from URL |
| `supabase/functions/create-checkout/` | Stripe checkout |
| `supabase/functions/stripe-webhook/` | Stripe event processor |
| `supabase/functions/send-email/` | Resend |
| `supabase/functions/parse-application/` | TO BUILD — NL → structured application JSON (GPT-4o-mini) |

---

## AI Usage Policy

All AI calls: server-side only (Edge Functions), user-triggered only, cached where possible.

| Feature | Model | When triggered |
|---|---|---|
| Natural language card entry | GPT-4o-mini | User submits chatbot message |
| Benefit URL extraction | GPT-4o | User pastes URL (Pro) |
| Retention script personalization | GPT-4o-mini | Annual fee advisor screen |
| "Next application" narrative | GPT-4o-mini | Velocity dashboard, cached |

Cost estimate: < $5/month at 10,000 users. Never call AI on screen load or automatically.

---

## Environment Variables

File: `UnifiedApp/.env.local` (gitignored)
Template: `UnifiedApp/.env.example` (committed, placeholders only)

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_POSTHOG_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Server-side (Supabase Edge Function secrets only):
```
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
```

---

## What Is Complete

- [x] Full app scaffold + responsive layout (desktop sidebar + mobile tabs)
- [x] All discovery screens (quiz, NL search, results, CardTile)
- [x] Vault: add/remove cards, benefit list
- [x] Tools: all calculators, browser, guides
- [x] Insights: breakeven tracker
- [x] Settings screen (now visible as 4th tab)
- [x] Auth: magic link login + guest bypass + Apple Sign-In + Google Sign-In
- [x] CSV fallback for offline/demo
- [x] PostHog analytics — 10 events (app_open, quiz_start, quiz_complete, calculator_used, signup, card_added, paywall_viewed, trial_started, subscription_created, churn)
- [x] PaywallModal + feature gates ($8/mo pricing)
- [x] Supabase core schema + 4 Edge Functions scaffolded
- [x] `contexts/BreakpointContext.tsx` + `components/DevToggle.tsx` (layout dev toggle)
- [x] `supabase/migrations/001_applications_ledger.sql` (4 new tables)
- [x] `lib/applicationTypes.ts` (full type system for Application Ledger)
- [x] `supabase/migrations/002_extra_tables.sql` (7 new tables: points_valuations, card_categories, downgrade_paths, retention_scripts, deal_passport, data_proposals + card_name_override column)
- [x] `lib/applicationTypes.ts` updated with 7 new types (PointsValuation, CardCategory, DowngradePath, RetentionScript, DealPassportEntry, DataProposal + supporting union types), MAX_HOUSEHOLD_MEMBERS, DEFAULT_MEMBER_NAMES
- [x] `hooks/useApplications.ts` — full CRUD (useApplications, useApplication, useCreateApplication, useUpdateApplication, useDeleteApplication with optimistic delete) + detectIssuer helper
- [x] `hooks/useHousehold.ts` — full CRUD (useHousehold, useCreateMember, useUpdateMember, useDeleteMember) + useHouseholdSetupComplete + useMarkHouseholdSetupComplete, cap enforced at 4
- [x] `hooks/usePointsBalances.ts` — usePointsBalances, useUpdateBalance (upsert), usePortfolioTotal (computed from server CPP → local fallback)
- [x] `lib/csvParser.ts` — parseChurningCSV with 5 date formats, fuzzy person matching, issuer/status/currency/cardType detection, duplicate detection
- [x] `supabase/seed-points-valuations.sql` — 15 programs seeded with TPG CPP values
- [x] Concierge tab removed (files deleted, not just hidden)
- [x] Card catalog: 115 cards in CSV, 20 priority cards verified
- [x] Stripe wired end-to-end: checkout ($8/mo, $59/yr), webhook (5 events), entitlement via React Query (5min stale, refetch on focus)
- [x] Onboarding: 3 screens + skip, persists `hasSeenOnboarding` in AsyncStorage, root layout routes accordingly
- [x] Sentry error monitoring: `@sentry/react-native`, Expo config plugin, root wrapped in `Sentry.wrap()`, disabled in dev
- [x] EAS config: development, preview, production profiles ready (blocked on user credentials)
- [x] Core primitives: Text, Button, Input, Surface, Badge (5 components in `components/primitives/`)
- [x] Composed components: ListItem, StatCard, ProgressBar, EmptyState, FilterChip, HouseholdSetupModal (6 in `components/composed/`)
- [x] Intelligence hub rebuilt with live data (summary stats, feature nav, household setup)
- [x] Application Ledger screens: list (with filters), add (with catalog prefill), detail/edit, CSV import
- [x] Intelligence `_layout.tsx` Stack navigator for sub-screen routing
- [x] `lib/issuerRules.ts` — 14 issuer velocity rules + 6 helper functions, RuleResult type
- [x] `lib/velocityEngine.ts` — computeVelocity() engine, VelocityReport type, summary helpers
- [x] `app/(tabs)/intelligence/velocity.tsx` — Velocity dashboard screen with household filter, per-issuer cards, pro gate
- [x] `components/composed/IssuerVelocityCard.tsx` — expandable issuer card with status badge, progress bar, rule detail
- [x] `__tests__/velocityEngine.test.ts` — 120 unit tests covering all 14 rules + engine + helpers
- [x] `__tests__/helpers/fixtures.ts` — test fixture factory functions
- [x] `vitest.config.ts` — Vitest configuration with path aliases
- [x] Vitest installed (`npm test` / `npm run test:watch`)
- [x] `components/composed/SpendProgress.tsx` — bonus spend progress with update/mark-complete, compact mode for hub
- [x] `app/(tabs)/intelligence/portfolio.tsx` — Points Portfolio screen with hero total, per-program rows, add/edit bottom sheets
- [x] `lib/notifications.ts` — push notification scaffold (30-day + 7-day spend reminders, expo-notifications)
- [x] Updated `app/(tabs)/intelligence/[id].tsx` — bonus progress now uses SpendProgress component with update/mark-complete actions
- [x] Updated `app/(tabs)/intelligence/index.tsx` — Active Bonuses section (top 3 urgent) + portfolio total StatCard
- [x] `supabase/seed-retention-scripts.sql` — 30 curated retention call scripts (7 issuers)
- [x] `supabase/seed-downgrade-paths.sql` — 22 static downgrade paths
- [x] `supabase/seed-card-categories.sql` — 60+ category multipliers for 20 cards
- [x] `hooks/useRetention.ts` — retention scripts, downgrade paths, outcome CRUD hooks
- [x] `hooks/useCardCategories.ts` — card categories hook + rankCards() optimizer + SPEND_CATEGORIES
- [x] `components/composed/RetentionCard.tsx` — expandable retention script with copy-to-clipboard
- [x] `app/(tabs)/intelligence/fee-advisor.tsx` — Annual Fee Advisor (timeline, recommendations, scripts, downgrades, outcome logging)
- [x] `app/(tabs)/intelligence/spend.tsx` — Spend Optimizer (category → ranked cards by dollar value)
- [x] Updated `lib/notifications.ts` — added `scheduleFeeReminder()` (30-day + 7-day fee alerts)
- [x] `expo-clipboard` installed

---

## Current Phase: Phase 9-12 — COMPLETE (Agent B8) — ALL BUILD AGENTS DONE

### Phase 0 Tasks (all done)
- [x] Replace Concierge tab → deleted entirely, 4 tabs: Discover, Vault, Intelligence, Settings
- [x] Concierge files deleted from disk
- [x] Expand card catalog — 5 cards added (Ink Cash, Ink Unlimited, Cap1 Savor, Bilt, Altitude Reserve), 20 priority cards verified
- [x] Stripe end-to-end: $8/mo pricing, checkout Edge Function, webhook (5 event types), React Query entitlement
- [x] Social login: Apple Sign-In + Google Sign-In + magic link fallback
- [x] Onboarding: 3 screens, AsyncStorage persistence, root layout routing
- [x] Sentry: `@sentry/react-native`, Expo plugin, `Sentry.wrap()`, source maps in EAS
- [x] PostHog: exactly 10 events wired (3 webhook events server-side via PostHog HTTP API)
- [x] Web platform verified (HTTP 200, no bundle errors)
- [x] EAS config verified (blocked on user: `eas init`, `appleTeamId`, `ascAppId`)

### Pre-existing (done before B1)
- [x] Build `contexts/ThemeContext.tsx` — light/dark architecture
- [x] Update `lib/theme.ts` — complete dark token set

### Phase 1a — Ledger Data Layer (Agent B2) — COMPLETE (2026-04-19)
- [x] Migration `002_extra_tables.sql` — 7 new tables + indexes + RLS + read policies
- [x] `lib/applicationTypes.ts` updated — 7 new interfaces, card_name_override on Application, household constants
- [x] `hooks/useApplications.ts` — CRUD with React Query, optimistic delete, Supabase client
- [x] `hooks/useHousehold.ts` — CRUD, cap at 4 enforced, AsyncStorage setup-complete flag
- [x] `hooks/usePointsBalances.ts` — balances + upsert + portfolio total (server CPP with local fallback)
- [x] `lib/csvParser.ts` — CSV import parser (5 date formats, fuzzy person match, issuer/currency detection, dupe detection)
- [x] `supabase/seed-points-valuations.sql` — 15 programs

**Notes for B3:**
- All hooks use `@tanstack/react-query` with `@/lib/supabase` client — consistent with useCards/useSubscription pattern
- `detectIssuer()` is exported from `hooks/useApplications.ts` (also used by csvParser)
- `usePointsBalances` resolves CPP from `points_valuations` table first, falls back to `CURRENCY_CPP` constants
- `useHousehold` sorts by role then created_at — primary member always first
- CSV parser takes pre-parsed `Record<string, string>[]` rows (use papaparse to parse raw CSV first, then pass rows to `parseChurningCSV`)
- Migration has RLS enabled on all 6 new tables with read-only policies for reference data; data_proposals has no public read (admin/service role only)
- TypeScript compiles clean — zero new errors from B2 files

### Phase 1b — Ledger UI + Core Primitives (Agent B3) — COMPLETE (2026-04-19)

**Primitives (5):**
- [x] `components/primitives/Text.tsx` — 9 variants (display, heading1-3, body, bodySmall, caption, mono, label), 7 colors, theme-aware
- [x] `components/primitives/Button.tsx` — 4 variants (primary, secondary, tertiary, destructive), 3 sizes, loading/disabled, left/right icon
- [x] `components/primitives/Input.tsx` — 5 variants (text, email, number, search, multiline), label, error, helperText, prefix
- [x] `components/primitives/Surface.tsx` — 3 variants (canvas, card, inset), padding/radius/border props, platform-aware shadow
- [x] `components/primitives/Badge.tsx` — 6 variants (neutral, success, warning, danger, info, pro), 2 sizes, optional dot

**Composed (6):**
- [x] `components/composed/ListItem.tsx` — left icon, title/subtitle, right element, default/compact variants
- [x] `components/composed/StatCard.tsx` — big number + label + trend + optional progress bar
- [x] `components/composed/ProgressBar.tsx` — auto-color by %, showLabel, configurable height
- [x] `components/composed/EmptyState.tsx` — icon, title, description, action button
- [x] `components/composed/FilterChip.tsx` — tappable pill for filters with selected state
- [x] `components/composed/HouseholdSetupModal.tsx` — first-run modal (just me / me + partner), Schitt's Creek defaults

**Screens (5):**
- [x] `app/(tabs)/intelligence/index.tsx` — Hub screen rebuilt with live data, summary stats, feature nav with PRO badges, empty state, household setup modal trigger
- [x] `app/(tabs)/intelligence/ledger.tsx` — Application list with member/status filters, FAB, issuer dot, bonus progress, sort newest first
- [x] `app/(tabs)/intelligence/add.tsx` — Smart form with catalog search + prefill, household selector, month/year picker, status/bureau/cardType chips, bonus fields
- [x] `app/(tabs)/intelligence/[id].tsx` — Detail view with card hero, status badge, bonus progress bar, detail rows, edit mode (status/spend/notes), delete with confirm
- [x] `app/(tabs)/intelligence/csv-import.tsx` — File picker, auto column mapping, preview with error/warning display, batch import, success view

**Infrastructure:**
- [x] `app/(tabs)/intelligence/_layout.tsx` — Stack navigator for sub-screens
- [x] `expo-document-picker` installed (for CSV import)

**Notes for B4:**
- All screens use primitives/composed components — no raw `<View style={{...}}>` with colors
- Intelligence hub shows live application count + pending bonuses from `useApplications()`
- Household setup modal appears on first Intelligence tab visit if `householdSetupComplete` flag not set
- CSV import uses `papaparse` (already a dep) for parsing + `lib/csvParser.ts` for field mapping
- Web bundle exports clean — all new routes compile and render
- TypeScript compiles clean — zero new errors from B3 files

### Phase 2 — Velocity Engine (Agent B4) — COMPLETE (2026-04-19)

**Issuer Rules (`lib/issuerRules.ts`):**
- [x] Rule 1: Chase 5/24 — personal cards from all issuers, biz exemptions per issuer
- [x] Rule 2: Chase Sapphire 48-Month — cross-product CSP/CSR, bonus_achieved gate
- [x] Rule 3: Amex 1-in-90 (credit cards) — charge card exempt, biz credit counts
- [x] Rule 4: Amex 2-in-90 (hard limit) — same exemptions
- [x] Rule 5: Amex 4/5 Credit Card Limit — only open active non-charge cards
- [x] Rule 6: Amex Once-Per-Lifetime — family grouping (Gold = Rose Gold, biz ≠ personal)
- [x] Rule 7: Citi 8-Day — personal only, biz exempt
- [x] Rule 8: Citi 65-Day — 2 personal max
- [x] Rule 9: Citi 24-Month Bonus — max(bonus_date, closed_date) + 24
- [x] Rule 10: Capital One 6-Month — soft warning
- [x] Rule 11: BofA 2/3/4 — business cards count
- [x] Rule 12: Discover Once-Per-Lifetime — IT ≠ Miles
- [x] Rule 13: Barclays 6/24 — all issuers, biz included
- [x] Rule 14: US Bank 2/30
- [x] 6 helper functions: getMonthDiff, addMonthsToMonthString, countInLastNMonths, isBusinessCardCounted, isChargeCard, getCardFamily
- [x] Pattern matching sorted by specificity (longest match first)

**Velocity Engine (`lib/velocityEngine.ts`):**
- [x] `computeVelocity()` — runs all 14 rules, filters by household member, aggregates results
- [x] `VelocityReport` type with per-issuer rule results + overall status
- [x] `optimal_next` recommendation (prioritizes Chase under 5/24)
- [x] `countByStatus()`, `getPrimaryRule()`, `getIssuerRules()`, `worstStatus()` helpers
- [x] Performance: 46ms for 120 tests including 50-app scenario (under 50ms target)

**Dashboard Screen (`velocity.tsx`):**
- [x] Household member filter chips (auto-selects first member)
- [x] Summary stats row: clear/warning/blocked issuer counts
- [x] Overall status badge
- [x] Per-issuer IssuerVelocityCard components (8 issuers)
- [x] Chase: 5/24 counter with progress bar, Sapphire eligibility
- [x] Amex: open credit card count, velocity status, lifetime burns
- [x] Optimal next recommendation section
- [x] Pro gate overlay (blurred content + "Unlock Pro" CTA → PaywallModal)
- [x] Empty state when no applications

**IssuerVelocityCard Component:**
- [x] Issuer-branded dot color (Chase blue, Amex blue, Citi red, etc.)
- [x] Primary metric display (e.g., "3/5")
- [x] Status badge (CLEAR/CAUTION/BLOCKED)
- [x] Expandable detail section with per-rule messages + clear dates
- [x] Progress bar for count-based rules

**Tests (120 passing):**
- [x] Chase 5/24: 15 tests (biz exemptions, closed counts, drop-off, denied excluded)
- [x] Sapphire 48-Month: 8 tests (cross-product, denied eligible, no-bonus eligible)
- [x] Amex velocity: 12 tests (charge exempt, biz credit counts, 2-in-90 hard limit, credit limit)
- [x] Amex lifetime: 10 tests (Gold=Rose Gold, biz≠personal, denied eligible, Hilton family separation)
- [x] Citi: 8 tests (8-day, 65-day, biz exempt, 24-month bonus with closure date)
- [x] Other issuers: 12 tests (Cap One 6mo, BofA 2/3/4, Discover lifetime, Barclays 6/24, US Bank 2/30)
- [x] Integration: 5 tests (empty=clear, complex churner, household separation, 20-app history, <50ms perf)
- [x] Helpers: 10 tests (getMonthDiff, addMonths, countInLastNMonths, isBusinessCardCounted, isChargeCard, getCardFamily, monthToDate)
- [x] Edge cases: 6 tests (shutdown excluded, pending counts, optimal_next, drop-off math, month wraps)
- [x] Additional coverage: 14 tests (biz credit velocity, Green charge, multiple Citi products)

**Notes for B5/B6:**
- `lib/issuerRules.ts` exports all rule functions individually — import what you need
- `lib/velocityEngine.ts` exports `computeVelocity()` + helper functions — dashboard already wired
- All rule functions accept optional `referenceMonth` for testability (defaults to current month)
- `RuleResult.applications_considered` contains app IDs for drill-down features
- Amex lifetime returns `RuleResult[]` (one per burned family) — handle as array
- Citi 24-month bonus also returns `RuleResult[]` — one per blocked product
- `vitest` is a dev dependency; `npm test` runs the full suite, `npm run test:watch` for dev
- `vitest.config.ts` maps `@/` alias to project root
- TypeScript compiles clean — zero new errors from B4 files

### Phase 3+4 — Spend Tracker + Portfolio (Agent B5) — COMPLETE (2026-04-19)

**SpendProgress Component (`components/composed/SpendProgress.tsx`):**
- [x] Full mode: progress bar, dollar amounts, deadline countdown, daily spend needed, status badge
- [x] Status logic: On pace / Behind pace / Behind / Final stretch / Achieved / Expired
- [x] "Update Spend" button → bottom sheet modal with number input
- [x] "Mark Bonus Received" button when spend target met
- [x] Compact mode: one-line card name + mini progress bar + % + days left (for hub)

**Application Detail Update (`[id].tsx`):**
- [x] Replaced inline bonus progress with SpendProgress component
- [x] Update spend → mutates `bonus_spend_progress` via `useUpdateApplication`
- [x] Mark complete → sets `bonus_achieved: true` + `bonus_achieved_at`

**Points Portfolio Screen (`portfolio.tsx`):**
- [x] Hero total: large dollar value with TPG attribution
- [x] Per-program rows: program name, point count, dollar value, CPP rate, % of total
- [x] Progress bars showing portfolio allocation
- [x] Tap row → edit balance (bottom sheet)
- [x] "Add Program" → program selector + balance input (bottom sheet)
- [x] Household member filter chips
- [x] Empty state with add action

**Notifications Scaffold (`lib/notifications.ts`):**
- [x] `scheduleSpendReminders()` — 30-day + 7-day before deadline
- [x] `cancelSpendReminders()` + `cancelRemindersForApplication()`
- [x] `requestNotificationPermission()` — asks on first schedule
- [x] Uses expo-notifications local scheduling (device testing deferred)

**Intelligence Hub Updates (`index.tsx`):**
- [x] Portfolio total StatCard (only if balances exist)
- [x] Active Bonuses section: top 3 most urgent by deadline
- [x] Each bonus: compact SpendProgress (card name + progress bar + days left)
- [x] Tap bonus → navigates to application detail

**Notes for B6:**
- `SpendProgress` accepts `compact` prop for hub list vs full detail view
- Portfolio uses `usePointsBalances()` and `usePortfolioTotal()` from B2 hooks
- `useUpdateBalance()` does upsert (insert or update) keyed on user+member+currency
- Notification IDs are returned from `scheduleSpendReminders()` for later cancellation
- 120 B4 tests still passing — no regressions
- TypeScript compiles clean for all B5 files

### Phase 5+6 — Fee Advisor + Spend Optimizer (Agent B6) — COMPLETE (2026-04-19)

**Seed Data (3 files):**
- [x] `supabase/seed-retention-scripts.sql` — 30 curated retention scripts (7 issuers × multiple situations + generic)
- [x] `supabase/seed-downgrade-paths.sql` — 22 downgrade paths (Chase, Amex, Capital One, Citi, BofA, US Bank, Wells Fargo)
- [x] `supabase/seed-card-categories.sql` — 60+ category multipliers for 20 priority cards (dining, travel, grocery, flights, hotels, etc.)

**Hooks (2 files):**
- [x] `hooks/useRetention.ts` — useRetentionScripts (by issuer), useDowngradePaths (by issuer), useRetentionOutcomes (by app), useCreateRetentionOutcome (CRUD), DowngradePathWithNames type, local fallback data
- [x] `hooks/useCardCategories.ts` — useCardCategories(), rankCards() optimizer logic, SPEND_CATEGORIES constant, CardCategoryWithCard type, RankedCard type, local fallback data

**Components (1 file):**
- [x] `components/composed/RetentionCard.tsx` — expandable script card, situation badges, "BEST MATCH" auto-highlight, copy-to-clipboard via expo-clipboard, haptic feedback

**Screens (2 files):**
- [x] `app/(tabs)/intelligence/fee-advisor.tsx` — Annual Fee Advisor:
  - Cards sorted by fee due date, urgent (≤30 days) highlighted
  - Tiered recommendation logic: keep / call_retention / consider_downgrade
  - <12 month override: always "call retention" (closing hurts credit)
  - Benefit ratio progress bar (captured / annual fee)
  - Expandable: retention scripts + downgrade paths per card
  - Retention outcome logging bottom sheet (6 outcome types, amount input, accepted toggle, notes)
  - 30-day warning banner for upcoming fees
  - Household member filter
  - Pro gate overlay (blurred content + "Unlock Pro" CTA)
  - Empty state for no annual fee cards

- [x] `app/(tabs)/intelligence/spend.tsx` — Spend Optimizer:
  - Category selection chips (17 spend categories)
  - Optional dollar amount input
  - Ranked results: medal icons, multiplier, CPP, dollar value
  - Rankings by dollar value (multiplier × cpp), not raw earn rate
  - Cap/quarterly warnings displayed per card
  - Methodology note (TPG valuations)
  - Household member filter
  - Fully locked for free users (not blurred, fully gated)

**Notifications (updated):**
- [x] `lib/notifications.ts` — added `scheduleFeeReminder()` for 30-day + 7-day annual fee advance alerts

**Dependencies:**
- [x] `expo-clipboard` installed (for retention script copy feature)
- [x] `supabase/functions/ingest-doc/index.ts` — DoC scraper (weekly cron, GPT-4o-mini, fuzzy match, confidence scoring, dedupe)
- [x] `supabase/functions/ingest-reddit/index.ts` — Reddit scraper (daily, r/CreditCards + r/churning, GPT classification, confidence 0.65)
- [x] `supabase/functions/auto-apply/index.ts` — Auto-apply cron (hourly, never retention data)
- [x] `supabase/functions/ingest-email/index.ts` — Email webhook (SendGrid Inbound Parse, issuer whitelist, 20/hr rate limit, GPT classification)
- [x] `supabase/functions/weekly-summary/index.ts` — Weekly admin email (Sunday 9pm PT, Resend, proposal stats)
- [x] `supabase/migrations/003_email_aliases.sql` — user_email_aliases table + user_id on data_proposals + RLS
- [x] `hooks/useDataProposals.ts` — admin proposals CRUD (approve/reject/edit/bulk), counts, labels
- [x] `hooks/useDealPassport.ts` — deals query, personalization engine, currency matching, fallback data
- [x] `hooks/useEmailAlias.ts` — alias CRUD, regenerate, stats, 8-char hex generation
- [x] `app/admin/proposals.tsx` — Admin review queue (admin gate, Tinder-style cards, diff table, edit mode, bulk approve)
- [x] `app/(tabs)/intelligence/deals.tsx` — Deal Passport (personalized feed, "for your wallet" vs "other", expiry countdown)
- [x] `app/(tabs)/settings/email-import.tsx` — Email forwarding setup (alias generation, Gmail filter, stats)
- [x] Updated `lib/applicationTypes.ts` — UserEmailAlias, user_id on DataProposal
- [x] Updated `app/(tabs)/settings/index.tsx` — added DATA IMPORT section
- [x] `app/admin/_layout.tsx` + `app/(tabs)/settings/_layout.tsx` — Stack navigators
- [x] Updated `app/_layout.tsx` — admin route in root Stack
- [x] `app/onboarding/index.tsx` — v2: 5-screen value-first flow (card select → value reveal → auth → notifications → Pro upsell)
- [x] `components/composed/DesktopContainer.tsx` — 1200px max-width wrapper
- [x] `components/composed/TwoColumn.tsx` — two-column desktop layout
- [x] `components/composed/CardArt.tsx` — issuer gradient card art (3 sizes)
- [x] `hooks/useKeyboardShortcuts.ts` — web keyboard shortcuts (?/n/1-4)
- [x] Updated `components/PaywallModal.tsx` — centered dialog on desktop
- [x] Updated `components/primitives/Button.tsx` — hover state + accessibility
- [x] Updated `components/composed/ListItem.tsx` — hover state + accessibility
- [x] Updated `components/composed/ProgressBar.tsx` — Reanimated spring animation + a11y
- [x] Updated `components/composed/StatCard.tsx` — fade-in animation + a11y
- [x] Updated `components/primitives/Input.tsx` — accessibility roles
- [x] Updated `app/(tabs)/settings/index.tsx` — dark mode toggle + 600px centered desktop
- [x] Updated `lib/theme.ts` — motion tokens
- [x] Updated `USER_ACTION_ITEMS.md` — Edge Function deploy, cron schedules, SendGrid, App Store metadata

**Notes for B7:**
- Fee advisor uses `annual_fee_next_due` from Application type — user should set this in the add/edit form
- Benefit capture estimation is approximate (uses bonus progress as proxy) — full benefit tracking deferred
- Retention scripts are static from DB per Hard Rule #1 — never AI-generated at runtime
- Spend optimizer ranks by dollar value (multiplier × cpp) per Hard Rule #3
- Downgrade paths use the `notes` field with "From → To|Description" format for name parsing (card_id refs are NULL placeholders for local dev)
- Card categories also use `notes` field for card name parsing (same NULL card_id pattern)
- Both hooks have local fallback data when Supabase is unreachable
- 133 B4 tests still passing — zero regressions
- TypeScript compiles clean for all B6 files (zero new errors)

### Phase 7+8 — Automation + Deals (Agent B7) — COMPLETE (2026-04-19)

**Edge Functions (5):**
- [x] `supabase/functions/ingest-doc/index.ts` — DoC scraper (weekly): fetches best-bonuses page, GPT-4o-mini extracts card data, fuzzy-matches against catalog, writes to data_proposals with confidence scoring (0.75 new, 0.95 bonus, 0.92 fee)
- [x] `supabase/functions/ingest-reddit/index.ts` — Reddit scraper (daily): r/CreditCards + r/churning, flair/upvote filtering, GPT classification (6 categories), confidence 0.65 (always manual)
- [x] `supabase/functions/auto-apply/index.ts` — Auto-apply cron (hourly): applies auto_apply_pending proposals where auto_apply_after < now(), NEVER auto-applies retention data, handles inserts + updates
- [x] `supabase/functions/ingest-email/index.ts` — Email webhook (SendGrid Inbound Parse): resolves user from alias, whitelists 9 issuer domains, GPT-4o-mini classifies 8 email types, 20/hr rate limit per alias, user-scoped proposals
- [x] `supabase/functions/weekly-summary/index.ts` — Weekly admin email (Sunday 9pm PT via Resend): pending/auto-applied/rejected counts, breakdown by source, top 10 proposals preview, direct link to admin UI

**Migration (1):**
- [x] `supabase/migrations/003_email_aliases.sql` — user_email_aliases (id, user_id, alias, created_at) + user_id column on data_proposals + RLS (own-row read/insert/delete) + indexes

**Hooks (3):**
- [x] `hooks/useDataProposals.ts` — useDataProposals (filtered query), useProposalCounts (badges), useApproveProposal (fetch+apply+mark), useRejectProposal, useEditAndApproveProposal, useBulkApprove, SOURCE_TYPE_LABELS, PROPOSAL_TYPE_LABELS
- [x] `hooks/useDealPassport.ts` — useDeals (active deals), usePersonalizedDeals (currency matching, balance-based relevance, value-added calc), DEAL_TYPE_LABELS, fallback demo deals
- [x] `hooks/useEmailAlias.ts` — useEmailAlias (current), useEmailImportStats (total/applied/pending/last), useCreateEmailAlias (8-char hex), useRegenerateAlias (delete+create), EMAIL_DOMAIN, GMAIL_FILTER_RULE

**Screens (3):**
- [x] `app/admin/proposals.tsx` — Admin review queue: admin gate (ADMIN_USER_ID), summary stat badges (pending/auto_apply_pending/auto_applied/rejected), source+status filters, Tinder-style card navigation (prev/next), changes diff table, edit mode with inline text inputs, approve/reject/edit actions, bulk approve high-confidence, source link, auto-apply countdown
- [x] `app/(tabs)/intelligence/deals.tsx` — Deal Passport: personalized "FOR YOUR WALLET" (transfer bonuses for held currencies, elevated signups for unheld cards) vs "OTHER DEALS" (collapsible), deal type filter chips, household member filter, urgency badges (days left), value-added display for transfer bonuses, source links, fallback demo data
- [x] `app/(tabs)/settings/email-import.tsx` — Email Import setup: generate unique alias (u_8hex@in.cardscout.app), copy-to-clipboard with checkmark feedback, Gmail filter rule display + copy, 4-step setup instructions, import stats (received/applied/pending/last), regenerate with confirmation

**Infrastructure:**
- [x] `app/admin/_layout.tsx` — Stack navigator for admin screens
- [x] `app/(tabs)/settings/_layout.tsx` — Stack navigator for settings sub-screens
- [x] Updated `app/_layout.tsx` — added admin route to root Stack
- [x] Updated `app/(tabs)/settings/index.tsx` — added DATA IMPORT section with "Email Forwarding" link
- [x] Updated `lib/applicationTypes.ts` — added UserEmailAlias interface, added user_id to DataProposal

**Notes for B8:**
- Admin screen is gated by `EXPO_PUBLIC_ADMIN_USER_ID` env var — set this in `.env.local`. If empty, all users can access admin (dev mode).
- SendGrid Inbound Parse needs MX record setup + webhook URL pointing to the `ingest-email` Edge Function. Document in USER_ACTION_ITEMS.md.
- Deal passport has 5 fallback demo deals when Supabase is unreachable — covers transfer bonus, elevated signup, limited offer, community report types.
- `usePersonalizedDeals` uses `useDeals()` internally — personalization runs client-side against user's balances + applications.
- Pipeline cron schedules (DoC: Mon 6am PT, Reddit: daily 7am PT, auto-apply: hourly, summary: Sun 9pm PT) are configured in Supabase Dashboard → Edge Functions → Schedules. Not in code.
- Rate limiting in `ingest-email` is in-memory (Map) — resets on cold start. Sufficient for V1.
- Retention data proposals are NEVER auto-applied (enforced in both `auto-apply` and `ingest-email`).
- Reddit proposals always get confidence 0.65 (always manual review per spec).
- All new hooks have local fallback data for offline/demo usage.
- Settings now has a `_layout.tsx` Stack navigator — future settings sub-screens auto-register.
- 133 tests passing — zero regressions from B7.
- TypeScript compiles clean for all B7 files (zero new errors, Deno Edge Function errors expected and pre-existing).
- Web bundle exports clean — all 3 new routes compile and are included.

### Phase 9-12 — Polish + Launch (Agent B8) — COMPLETE (2026-04-19)

**Onboarding v2 (Chunk 1):**
- [x] `app/onboarding/index.tsx` — replaced 3-slide carousel with 5-screen value-first flow:
  - Screen 1: Card selection grid (top 20 cards, search, multi-select, mini card art, haptics)
  - Screen 2: WealthRing value reveal (per-card breakdown, estimated annual value, category segments)
  - Screen 3: Auth (Apple Sign-In, Google Sign-In, magic link — reuses existing auth logic)
  - Screen 4: Notification permission request
  - Screen 5: Pro upsell (conditional — only shows if 3+ cards selected, annual/monthly toggle)
  - Smart flow: skips value reveal if no cards selected, skips Pro upsell if < 3 cards

**Desktop Layouts (Chunk 2):**
- [x] `components/composed/DesktopContainer.tsx` — 1200px max-width centered wrapper (no-op on mobile)
- [x] `components/composed/TwoColumn.tsx` — fixed sidebar + flex content (stacks vertically on mobile)
- [x] PaywallModal: centered dialog with backdrop dismiss on desktop, bottom sheet on mobile
- [x] Button hover: opacity 0.85 via Pressable hovered callback
- [x] ListItem hover: sidebar background highlight
- [x] `hooks/useKeyboardShortcuts.ts` — web-only: ? help, / focus search, n new app, 1-4 tab switch
- [x] Keyboard shortcuts wired into `app/(tabs)/_layout.tsx`
- [x] Settings: 600px max-width centered on desktop

**Visual Polish (Chunk 3):**
- [x] `components/composed/CardArt.tsx` — issuer gradient background (from theme), EMV chip, network badge (Visa/MC/Amex/Discover), 3 sizes (sm/md/lg), standard card ratio
- [x] `components/composed/ProgressBar.tsx` — Reanimated spring animation on fill (damping: 15, stiffness: 120)
- [x] `components/composed/StatCard.tsx` — fade-in animation on value change (600ms ease-out)
- [x] `lib/theme.ts` — motion tokens: tabSwitch, screenPush, modalSpring, progressBar, countUp, cardTilt
- [x] Dark mode toggle in Settings: Light / Dark / System radio buttons, wired to ThemeContext.setMode()
- [x] Accessibility: Button (role+label+state), ListItem (role+label), ProgressBar (progressbar role+value), StatCard (summary role+label), Input (role), CardArt (label)

**Launch Prep (Chunk 4):**
- [x] DevToggle verified DEV-only (`if (!__DEV__) return null`)
- [x] `USER_ACTION_ITEMS.md` updated with: all 9 Edge Function deploy commands, cron schedule configs, SendGrid Inbound Parse setup, App Store metadata, pre-launch checklist
- [x] All trackers updated

**Notes for QA5:**
- Onboarding uses `useCards()` which falls back to CSV — works offline/demo
- Value estimation is approximate (uses `estimated_bonus_value_usd`, `cashback_rate_effective`, lounge/GE credits)
- CardArt uses `expo-linear-gradient` for issuer gradients
- Keyboard shortcuts only fire on web (Platform.OS !== 'web' → early return), ignore input fields
- Dark mode toggle updates in-memory only for now (no AsyncStorage persistence yet)
- Reanimated animations work on web via `react-native-reanimated` web support
- All 133 tests passing — zero regressions
- TypeScript compiles clean for all B8 files
- Web bundle exports clean — all routes compile

### QA5 — Pre-Launch Regression — COMPLETE (2026-04-19)

- Zero regressions from B1-B7
- 133/133 unit tests passing
- 5 Sev 2 issues found and fixed in `6efe67a`:
  1. Desktop layouts added to ledger, results, portfolio (useBreakpoint + max-width)
  2. Dark mode persisted to AsyncStorage (ThemeContext loads on mount)
  3. Privacy Policy + Terms of Service now clickable links in login + settings
- 1 Sev 1 (user action only): `YOUR_EAS_PROJECT_ID` placeholder in app.json — run `eas init`
- 4 Sev 3 (ship as-is): cosmetic only
- **Verdict: READY FOR APP STORE SUBMISSION** (after user action items in `USER_ACTION_ITEMS.md`)

### All Agents Complete
B1 → B2 → B3 → B4 → B5+B6 → B7 → B8 → QA5 → Fixes applied.
Code is complete. Only user action items remain (see `USER_ACTION_ITEMS.md`).

---

## Voice & Copy Rules (non-negotiable)

Florid concierge voice everywhere.

| Context | Copy |
|---|---|
| Primary CTAs | "ADD TO VAULT" / "EXECUTE STRATEGY" / "SECURE TO WALLET" |
| Dashboard hero | "Good afternoon, [Name]. $1,847 captured this year." |
| Empty states | "Your vault awaits. Begin with a card." |
| Paywall | "Unlock the full intelligence of your portfolio." |
| Quiz entry | "Let us find your perfect card." |
| Error states | "Something interrupted your session. Return when ready." |
| Intelligence empty | "Your intelligence suite awaits. Add your first application." |

---

## Known Issues / Gotchas

1. **`npm install` requires `--legacy-peer-deps`** — lucide-react-native declares React 18 peer dep, project uses React 19.
2. **Supabase client throws if URL is empty string** — `.env.local` must have a valid URL format even for placeholder.
3. **`public/cards.csv` must stay in sync with `data/cards.csv`** — run `cp data/cards.csv public/cards.csv` before committing.
4. **Tools/Insights are hidden from tab bar** — use `options={{ href: null }}` in `_layout.tsx`. Navigate via `router.push()` only. Settings is now a visible tab.
5. **Calendar tab is a redirect stub** — `app/(tabs)/calendar/index.tsx` just re-exports portfolio/calendar. Hidden from tab bar. Full calendar build is later.
6. **Concierge directory deleted** — B1 removed `app/(tabs)/concierge/` entirely.
7. **Sentry version warning** — `@sentry/react-native@8.8.0` vs expected `~7.2.0`. Works fine, just a compatibility notice.
8. **Bilt Mastercard has no signup bonus** — intentionally set to 0. This is accurate; Bilt doesn't offer a standard SUB.
9. **PostHog webhook events need `POSTHOG_API_KEY`** — set as Supabase Edge Function secret for `trial_started`, `subscription_created`, `churn` events.
10. **Apple/Google Sign-In need credentials** — Apple: Team ID + Service ID in Supabase. Google: OAuth client IDs in `.env.local`. Code is ready.

---

## Agent Architecture

All build and QA work is organized into agents. See `agents/AGENT_MASTER_PLAN.md` for the full orchestration plan.

| Agent | Phase | What |
|---|---|---|
| B1 | 0 | Foundation: Stripe, 20 cards, cleanup, onboarding, auth, Sentry, PostHog |
| B2 | 1a | Ledger data layer: schema, hooks, types, CSV parser |
| B3 | 1b | Ledger UI: screens, forms, household, core primitives |
| B4 | 2 | Velocity engine: 14 rules, computation, dashboard, ~120 unit tests |
| B5 | 3+4 | Bonus spend tracker + points portfolio |
| B6 | 5+6 | Annual fee advisor + spend optimizer (can parallel with B5) |
| B7 | 7+8 | Automation pipeline + email forwarding + deal passport |
| B8 | 9-12 | Onboarding v2, desktop layouts, dark mode, App Store |
| QA1-5 | Gates | Post-phase testing agents |

Execution: B1 → B2 → B3 → B4 → B5+B6 (parallel) → B7 → B8

---

## Future PostHog Event Ideas (add in later phases)

- `search_performed` — NL search submitted (was in Phase 9 analytics, removed for B1's 10-event spec)
- `apply_tapped` — user taps apply link on CardTile
- `card_removed` — user removes card from vault
- `benefit_marked_used` / `benefit_snoozed` — benefit tracking interactions
- `onboarding_completed` / `onboarding_skipped` — onboarding flow analytics
- `ledger_entry_added` — application added to ledger (Phase 1)
- `velocity_viewed` — velocity dashboard opened (Phase 2)
- `fee_advisor_viewed` — fee advisor opened (Phase 5)

---

## Git State

Repo: https://github.com/boozinix/UltimateCardScout
Branch: `main`
Last commit: `93179dc` — Update GIT_TRACKER with save 2

No new commits since session start — all changes are local, uncommitted.
