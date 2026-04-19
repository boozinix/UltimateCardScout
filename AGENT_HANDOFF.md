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
- [x] Concierge tab removed (files deleted, not just hidden)
- [x] Card catalog: 115 cards in CSV, 20 priority cards verified
- [x] Stripe wired end-to-end: checkout ($8/mo, $59/yr), webhook (5 events), entitlement via React Query (5min stale, refetch on focus)
- [x] Onboarding: 3 screens + skip, persists `hasSeenOnboarding` in AsyncStorage, root layout routes accordingly
- [x] Sentry error monitoring: `@sentry/react-native`, Expo config plugin, root wrapped in `Sentry.wrap()`, disabled in dev
- [x] EAS config: development, preview, production profiles ready (blocked on user credentials)

---

## Current Phase: Phase 0 — COMPLETE (Agent B1)

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

### Next Phase: Phase 1a — Ledger Data Layer (Agent B2)
See `agents/B2_LEDGER_DATA.md` for full task list.

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
