# Progress Tracker
Last updated: 2026-04-18

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
- [ ] Wire concierge to `ask-concierge` Edge Function (or build it)

## Phase 14 — Production
- [ ] EAS Build — iOS TestFlight, Android internal track
- [ ] Vercel deployment for web
- [ ] PostHog project key → `EXPO_PUBLIC_POSTHOG_KEY`
- [ ] Resend API key → `RESEND_API_KEY`
- [ ] App Store / Play Store submission
