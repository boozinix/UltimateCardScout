# Progress Tracker
Last updated: 2026-04-19 (B8 complete — all build agents done)

## Phase 0 — Design System
- [x] Lock all design decisions (name, voice, accent, canvas, nav, components)
- [x] Merge CardScout + PerksVault token system into `lib/theme.ts`
- [x] Write phase1 design system HTML reference (`ux/phase1/design-system.html`)

## Phase 1 — App Scaffold
- [x] Expo SDK 54 + Expo Router v3 project initialized (`UnifiedApp/`)
- [x] `lib/theme.ts` — blue `#1B4FD8` primary, gold `#92400E` semantic-only, `#FAFAF9` canvas
- [x] `app/(tabs)/_layout.tsx` — responsive: desktop sidebar (≥1024px) + mobile 4-tab bottom nav
- [x] Root `app/index.tsx` → redirect to `/(tabs)/discover`
- [x] `.env.local` created (gitignored), `.env.example` committed with placeholders
- [x] `GIT_TRACKER.csv` created and maintained

## Phase 2 — Card Database & Discovery
- [x] `data/cards.csv` — master card database (110 cards)
- [x] `public/cards.csv` — static copy served for web offline/demo fallback
- [x] `hooks/useCards.ts` — Supabase primary, CSV fallback via papaparse
- [x] `lib/cardTypes.ts` — Card type definition
- [x] `lib/scoring.ts` — quiz answer → card scoring engine
- [x] `lib/quiz.ts` — wizard question definitions
- [x] `lib/nlp.ts` — natural language prompt → quiz answers

## Phase 3 — Discover Tab
- [x] `app/(tabs)/discover/index.tsx` — NL search, quick pills, tools section (no emoji → Lucide)
- [x] `app/(tabs)/discover/quiz.tsx` — step-by-step wizard with ranked + single-select questions
- [x] `app/(tabs)/discover/results.tsx` — scored results with CardTile list
- [x] `components/CardTile.tsx` — expandable card tile, gradient header, apply link

## Phase 4 — Vault (Portfolio) Tab
- [x] `app/(tabs)/portfolio/index.tsx` — VaultScreen with add/remove cards, insights shortcut
- [x] `app/(tabs)/portfolio/add-card.tsx` — Search mode + By URL mode (Pro, calls scrape-card Edge Function)
- [x] `app/(tabs)/portfolio/benefits.tsx` — per-card benefit list
- [x] `app/(tabs)/portfolio/benefit-detail/` — individual benefit detail screen
- [x] `app/(tabs)/portfolio/card-benefits/` — card-level benefits overview
- [x] `app/(tabs)/portfolio/calendar.tsx` — benefit reminder calendar view

## Phase 5 — Calendar Tab
- [x] `app/(tabs)/calendar/index.tsx` — re-exports portfolio/calendar

## Phase 6 — Concierge Tab
- [x] `app/(tabs)/concierge/index.tsx` — AI chat UI (suggestion pills, message bubbles, Pro tier aware)
- [ ] Wire concierge to real Edge Function (ask-concierge) — **PENDING**

## Phase 7 — Tools Tab
- [x] `app/(tabs)/tools/index.tsx` — tools hub
- [x] `app/(tabs)/tools/value-calculator.tsx` — point value calculator
- [x] `app/(tabs)/tools/ur-calculator.tsx` — Chase UR calculator
- [x] `app/(tabs)/tools/mr-calculator.tsx` — Amex MR calculator
- [x] `app/(tabs)/tools/portfolio-expander.tsx` — gap analysis tool
- [x] `app/(tabs)/tools/bonus-sequencer.tsx` — signup bonus timeline planner
- [x] `app/(tabs)/tools/browser.tsx` — card browser with filters
- [x] `app/(tabs)/tools/guides/` — strategy guides

## Phase 8 — Insights Tab (Pro)
- [x] `app/(tabs)/insights/index.tsx` — insights hub (Pro-gated)
- [x] `app/(tabs)/insights/breakeven.tsx` — per-card fee vs captured value, progress bars, status badges

## Phase 9 — Analytics
- [x] `lib/analytics.ts` — PostHog wrapper (no-op if key not set)
- [x] `quiz.tsx` — `QUIZ_STARTED` on mount, `QUIZ_COMPLETED` on navigate
- [x] `discover/index.tsx` — `SEARCH_PERFORMED` with query
- [x] `CardTile.tsx` — `APPLY_TAPPED` with card_name + issuer
- [x] `PaywallModal.tsx` — `PAYWALL_SHOWN` on visible, `UPGRADE_TAPPED` with plan
- [x] `portfolio/index.tsx` — `CARD_REMOVED` on mutation success

## Phase 10 — Auth & Settings
- [x] `app/(auth)/login.tsx` — magic link login + guest bypass button
- [x] `app/(tabs)/settings/index.tsx` — account, billing, subscription management
- [ ] `app/(auth)/callback.tsx` — magic link callback handler — **verify works end-to-end**

## Phase 11 — Supabase Backend (requires real project)
- [ ] Create Supabase project, run `supabase/schema.sql`
- [ ] Seed card catalog: `npm run ingest` with real service role key
- [ ] Deploy Edge Functions: `scrape-card`, `create-checkout`, `stripe-webhook`, `send-email`
- [ ] Wire `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`

## Phase 12 — Payments (requires Stripe)
- [ ] Create Stripe products: $6.99/mo + $49/yr with 14-day trial
- [ ] Set `STRIPE_SECRET_KEY` + `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Test checkout flow end-to-end
- [ ] Verify `stripe-webhook` Edge Function processes subscription events

## Phase 13 — AI Features (requires OpenAI)
- [ ] Set `OPENAI_API_KEY` in Supabase Edge Function secrets
- [ ] Test `scrape-card` benefit extraction with real card URLs
- [x] Concierge tab — CANCELLED. Removed from product scope (2026-04-19).

## Phase 14 — Production
- [ ] EAS Build — iOS TestFlight, Android internal track
- [ ] Vercel deployment for web
- [ ] PostHog project key → `EXPO_PUBLIC_POSTHOG_KEY`
- [ ] Resend API key → `RESEND_API_KEY`
- [ ] App Store / Play Store submission

---

## REVISED BUILD PLAN (2026-04-19) — Agent-Based

> Prior phase numbering (15a, 15b, etc.) is superseded. See `agents/AGENT_MASTER_PLAN.md` for full plan.
> Each phase maps to a build agent (B1-B8) with its own handoff file.

### Pre-Phase Work ✅ COMPLETE (2026-04-19)
- [x] Concierge tab removed from navigation, replaced with Intelligence tab
- [x] Intelligence hub placeholder screen
- [x] ThemeContext (light/dark switching, system preference aware)
- [x] Dark token set in `lib/theme.ts`
- [x] PaywallModal updated
- [x] `supabase/migrations/001_applications_ledger.sql` — 4 tables
- [x] `lib/applicationTypes.ts` — full type system
- [x] BreakpointContext + DevToggle
- [x] All product decisions locked (see `DECISIONS_NEEDED.md`)
- [x] Agent master plan created with 8 build agents + 5 QA agents

### Phase 0 — Foundation (Agent B1) ✅ COMPLETE (2026-04-19)
- [x] Wire Stripe end-to-end ($8/mo, 14-day trial)
- [x] Expand card catalog to 20 cards (115 total, 20 priority verified)
- [x] Remove Concierge tab cleanly (files deleted)
- [x] Simple onboarding (3 screens + skip + AsyncStorage persistence)
- [x] Apple + Google Sign In (code ready, credentials needed)
- [x] Sentry error monitoring (@sentry/react-native + Expo plugin)
- [x] PostHog analytics (10 events wired, 3 server-side via webhook)
- [x] Verify all platforms — web verified (iOS/Android need manual test)
- [x] EAS Build config ready (blocked on user: eas init, Apple credentials)

### Phase 1a — Ledger Data Layer (Agent B2) ✅ COMPLETE (2026-04-19)
- [x] Migration `002_extra_tables.sql` — 7 new tables + indexes + RLS
- [x] Update `lib/applicationTypes.ts` with new types (7 interfaces, constants)
- [x] `hooks/useApplications.ts` — CRUD + optimistic delete + detectIssuer
- [x] `hooks/useHousehold.ts` — household CRUD (cap at 4) + setup-complete flag
- [x] `hooks/usePointsBalances.ts` — portfolio CRUD + server CPP resolution
- [x] `lib/csvParser.ts` — CSV import logic (5 date formats, fuzzy match, dupe detection)
- [x] Seed: `seed-points-valuations.sql` (15 programs)

### Phase 1b — Ledger UI + Core Primitives (Agent B3) ✅ COMPLETE (2026-04-19)
- [x] Core primitives: Text (9 variants), Button (4 variants), Input (5 variants), Surface (3 variants), Badge (6 variants)
- [x] Composed components: ListItem, StatCard, ProgressBar, EmptyState, FilterChip, HouseholdSetupModal
- [x] Intelligence hub screen (live data, summary stats, feature nav, PRO badges)
- [x] Ledger list screen (member/status filters, FAB, bonus progress)
- [x] Add application form (catalog search + prefill, month/year picker, all fields)
- [x] Application detail/edit screen (view/edit toggle, delete with confirm, bonus progress)
- [x] CSV import screen (file picker, auto column mapping, preview, batch import)
- [x] Household setup first-run modal (just me / me + partner, Schitt's Creek defaults)
- [x] Intelligence _layout.tsx (Stack navigator for sub-screens)
- [x] `expo-document-picker` installed

### Phase 2 — Velocity Engine (Agent B4) ✅ COMPLETE (2026-04-19)
- [x] `lib/issuerRules.ts` — 14 issuer rules + 6 helpers, RuleResult type, pattern matching by specificity
- [x] `lib/velocityEngine.ts` — computeVelocity() engine, VelocityReport, optimal_next, summary helpers
- [x] `app/(tabs)/intelligence/velocity.tsx` — Velocity dashboard with household filter, per-issuer cards, pro gate
- [x] `components/composed/IssuerVelocityCard.tsx` — expandable card with issuer dot, status badge, progress bar, rule detail
- [x] `__tests__/velocityEngine.test.ts` — 120 unit tests (all 14 rules, helpers, integration, performance)
- [x] `__tests__/helpers/fixtures.ts` — test fixture factory
- [x] `vitest.config.ts` + `vitest` dev dep — `npm test` / `npm run test:watch`
- [x] Household-separated velocity (member A apps don't affect member B)

### Phase 3+4 — Spend Tracker + Portfolio (Agent B5) ✅ COMPLETE (2026-04-19)
- [x] `components/composed/SpendProgress.tsx` — full + compact modes, deadline countdown, daily spend, status badge
- [x] Updated `app/(tabs)/intelligence/[id].tsx` — SpendProgress with update spend + mark complete actions
- [x] `lib/notifications.ts` — push notification scaffold (30-day + 7-day reminders, expo-notifications)
- [x] `app/(tabs)/intelligence/portfolio.tsx` — Points Portfolio with hero total, per-program rows, add/edit sheets
- [x] Updated `app/(tabs)/intelligence/index.tsx` — Active Bonuses (top 3 urgent) + portfolio total StatCard
- [x] Household filter on portfolio screen

### Phase 5+6 — Fee Advisor + Optimizer (Agent B6) ✅ COMPLETE (2026-04-19)
- [x] Annual fee timeline screen (`fee-advisor.tsx`) — sorted by due date, 30-day warning, expandable cards
- [x] Fee advisor recommendation logic (keep/call_retention/consider_downgrade with <12 month override)
- [x] Retention scripts table seeded (30 curated scripts across 7 issuers)
- [x] Downgrade paths seeded (22 paths: Chase, Amex, Cap One, Citi, BofA, US Bank, Wells Fargo)
- [x] Retention outcome logging flow (bottom sheet: 6 outcome types, amount, accepted, notes)
- [x] RetentionCard component (expandable, copy-to-clipboard, auto "BEST MATCH" highlighting)
- [x] Spend optimizer screen (`spend.tsx`) — category chips, dollar ranking, cap/expiry warnings
- [x] Card categories seeded (60+ multipliers for 20 cards × 17 categories)
- [x] `hooks/useRetention.ts` — scripts, downgrades, outcomes (CRUD) with local fallback
- [x] `hooks/useCardCategories.ts` — categories, rankCards(), SPEND_CATEGORIES with local fallback
- [x] Fee notification scaffold (`scheduleFeeReminder()` — 30-day + 7-day alerts)
- [x] `expo-clipboard` installed for copy feature
- [x] Pro gate: fee advisor = blurred overlay, spend optimizer = fully locked
- [x] 133 tests passing — zero regressions

### Phase 7+8 — Automation + Deals (Agent B7) ✅ COMPLETE (2026-04-19)
- [x] Edge Function: `ingest-doc` (weekly DoC scraper — GPT-4o-mini extraction, fuzzy match, confidence scoring)
- [x] Edge Function: `ingest-reddit` (daily — r/CreditCards + r/churning, GPT classification, always manual review)
- [x] Edge Function: `ingest-email` (SendGrid webhook, issuer domain whitelist, 20/hr rate limit, GPT classification)
- [x] Edge Function: `auto-apply` (hourly cron, applies auto_apply_pending proposals, never auto-applies retention)
- [x] Edge Function: `weekly-summary` (Sunday 9pm PT, Resend admin email with proposal stats)
- [x] Admin review screen (`/admin/proposals` — Tinder-style, approve/reject/edit, bulk approve, source filters)
- [x] Deal passport screen (personalized "for your wallet" vs "other", expiry countdown, transfer bonus value calc)
- [x] Email import setup screen (`/(tabs)/settings/email-import` — alias generation, copy button, Gmail filter instructions, stats)
- [x] Migration `003_email_aliases.sql` (user_email_aliases table + user_id on data_proposals)
- [x] `hooks/useDataProposals.ts` — CRUD, approve/reject/edit/bulk, counts, source labels
- [x] `hooks/useDealPassport.ts` — deals query, personalization engine, currency matching, fallback data
- [x] `hooks/useEmailAlias.ts` — alias CRUD, regenerate, import stats
- [x] Updated `lib/applicationTypes.ts` — UserEmailAlias type, user_id on DataProposal
- [x] Settings screen updated with "Email Forwarding" link under DATA IMPORT section
- [x] Admin route added to root _layout.tsx Stack
- [x] Settings _layout.tsx Stack navigator for sub-screen routing
- [x] 133 tests passing — zero regressions

### Phase 9-12 — Polish + Launch (Agent B8) ✅ COMPLETE (2026-04-19)
- [x] Onboarding v2 (5-screen value-first: card selection grid → WealthRing value reveal → auth → notifications → conditional Pro upsell)
- [x] Desktop layout components (DesktopContainer 1200px max-width, TwoColumn sidebar+content)
- [x] PaywallModal → centered dialog with backdrop dismiss on desktop
- [x] Hover states (Button opacity, ListItem background highlight via Pressable hovered callback)
- [x] Keyboard shortcuts (web: ? help, / search, n new app, 1-4 tabs)
- [x] Settings narrow centered (600px max on desktop)
- [x] CardArt component (issuer gradients, chip, network badge, 3 sizes: sm/md/lg)
- [x] Reanimated spring ProgressBar fill animation
- [x] StatCard fade-in animation on value change
- [x] Motion tokens in lib/theme.ts (tabSwitch, screenPush, modalSpring, progressBar, countUp, cardTilt)
- [x] Dark mode toggle in Settings (Light / Dark / System — radio buttons)
- [x] Accessibility: Button role+label+state, ListItem role+label, ProgressBar progressbar role+value, StatCard summary role+label, Input role
- [x] DevToggle verified DEV-only (`__DEV__` gated)
- [x] USER_ACTION_ITEMS.md updated with: Edge Function deployment, cron schedules, SendGrid Inbound Parse, App Store metadata, pre-launch checklist
- [x] App Store submission = user action item (EAS build + submit commands documented)
- [x] 133 tests passing — zero regressions

### QA5 — Pre-Launch Regression ✅ COMPLETE (2026-04-19)
- [x] QA5 report filed (`agents/QA5_REPORT.md`)
- [x] Zero regressions from B1-B7
- [x] 133/133 unit tests passing
- [x] 5 Sev 2 issues found and fixed (`6efe67a`):
  - Desktop layouts added to ledger, results, portfolio
  - Dark mode preference persisted to AsyncStorage
  - Privacy Policy + Terms links made clickable (login + settings)
- [x] 1 Sev 1 (user action): EAS project ID placeholder — run `eas init`
- [x] 4 Sev 3 (ship as-is): hardcoded white on dark buttons, version string static, stale comment
- [x] **Verdict: READY FOR APP STORE SUBMISSION** (after user action items)

---

## Product Decisions Locked (2026-04-19)
- See `DECISIONS_NEEDED.md` for complete list (all 16 decisions answered)
- Key: Light theme, 4 tabs (Intelligence), $8/mo, month precision, all guardrails adopted
- Agent plan: `agents/AGENT_MASTER_PLAN.md`
