# CardScout Unified App — Project Rules

> Also follow global rules from `~/.claude/CLAUDE.md`.

## What This App Is
Unified credit card platform merging CardScout (discovery/research tools) and PerksVault (benefits tracking).
Ships to iOS, Android, and web from one Expo SDK 54 codebase.

## Stack (non-negotiable)
- Expo SDK 54, Expo Router v3
- NativeWind v4, Reanimated 3, Moti
- Supabase (PostgreSQL + Auth + RLS + Edge Functions) — NEW project, not PerksVault's
- OpenAI gpt-4o (Edge Functions only)
- Stripe for subscriptions
- Resend for email
- PostHog for analytics
- EAS Build (iOS/Android), Vercel (web)
- TypeScript strict, Zod, React Query

## Free vs Paid Boundary
- FREE: all tools (quiz, calculators, browser, guides), basic portfolio view (3-card limit, no tracking)
- PAID ($6.99/mo or $49/yr, 14-day trial): unlimited wallet, reminders, dashboards, AI extraction
- Free/paid gating: `hooks/useSubscription.ts` — NEVER trust client-side only, Supabase RLS enforces server-side
- Paywall trigger: after 3rd card added, or tapping locked feature — NOT on app open

## Project Structure
```
app/(tabs)/discover/    — Quiz, results, card browser
app/(tabs)/tools/       — Calculators, guides, portfolio expander
app/(tabs)/portfolio/   — Free basic view + paid wallet
app/(tabs)/insights/    — Paid dashboards (Phase 8)
features/free/          — Free-tier logic
features/pro/           — Pro-tier logic (paywall gated)
lib/                    — Scoring, quiz, theme, supabase client
utils/                  — generateReminders, formatters, haptics, ics
supabase/               — Schema, seed, edge functions
scripts/ingest-cards.ts — CSV → Supabase upsert (run weekly)
data/cards.csv          — Card database (copy from cc-recommender weekly)
assets/                 — Card images, bank logos, brand logos
```

## Key Conventions
- Theme tokens from `lib/theme.ts` — NEVER hardcode colors
- Haptics fire on: mark used, snooze, add card, toggle, button press
- Every screen works on iOS, Android, AND web — no platform-only features
- Card mutations: update `data/cards.csv` then run `npm run ingest`
- Application links: raw issuer URLs, never transformed
- TypeScript strict — no `any` without reason

## Git Rules
- Only commit when explicitly instructed
- Never push to remote unless explicitly instructed
- Maintain GIT_TRACKER.csv on commits
- Never commit `.env.local`

## CSV Ingest
```bash
# Copy updated CSV from cc-recommender, then:
npm run ingest
# Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment
```
