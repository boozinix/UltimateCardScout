# Progress Tracker
Last updated: 2026-04-17 (Phases 0–10 complete)

## Phase 0 — Scaffold + Database
- [x] Expo SDK 54 project scaffold (package.json, app.json, tsconfig, babel, metro, tailwind)
- [x] NativeWind v4, Reanimated 3, Moti dependencies added
- [x] Directory structure created
- [x] Supabase schema (cards, benefits, user_cards, reminders, user_benefit_prefs, subscriptions + RLS)
- [x] CSV ingest script (scripts/ingest-cards.ts)
- [x] cards.csv copied from cc-recommender (110 cards)
- [x] Card images/logos copied (123 images + bank logos + brand logos)
- [x] .env.example, .gitignore, .claude/CLAUDE.md

## Phase 1 — Auth + Shell
- [x] lib/supabase.ts
- [x] lib/theme.ts
- [x] lib/subscription.ts + hooks/useSubscription.ts
- [x] hooks/useBreakpoint.ts
- [x] app/_layout.tsx (root)
- [x] app/(auth)/_layout.tsx + login.tsx + check-email.tsx
- [x] app/onboarding/index.tsx
- [x] app/(tabs)/_layout.tsx (5-tab navigator)
- [x] components/Button.tsx
- [x] components/Typography.tsx

## Phase 2 — Free: Quiz + Results
- [x] lib/cardTypes.ts
- [x] lib/cardDisplay.ts
- [x] lib/scoring.ts (port of resultsScoring.ts)
- [x] lib/quiz.ts (port of wizardQuestions.ts)
- [x] lib/nlp.ts (port of promptToAnswers.ts)
- [x] app/(tabs)/discover/index.tsx (quiz entry)
- [x] app/(tabs)/discover/quiz.tsx
- [x] app/(tabs)/discover/results.tsx
- [x] components/CardTile.tsx

## Phase 3 — Free: Tools + Browser
- [x] lib/pointValues.ts
- [x] lib/strategy.ts (port of advancedStrategy.ts)
- [x] lib/calculators/spendAllocation.ts
- [x] hooks/useCards.ts
- [x] app/(tabs)/tools/index.tsx
- [x] app/(tabs)/tools/browser.tsx
- [x] app/(tabs)/tools/value-calculator.tsx
- [x] app/(tabs)/tools/ur-calculator.tsx
- [x] app/(tabs)/tools/mr-calculator.tsx
- [x] app/(tabs)/tools/portfolio-expander.tsx
- [x] app/(tabs)/tools/bonus-sequencer.tsx
- [x] app/(tabs)/tools/guides/index.tsx

## Phase 4 — Free Portfolio View
- [x] app/(tabs)/portfolio/index.tsx (3-card limit, Benefits nav for pro)
- [x] app/(tabs)/portfolio/add-card.tsx (generates reminders on add for pro)
- [x] components/PaywallModal.tsx
- [x] utils/formatters.ts
- [x] utils/haptics.ts

## Phase 5 — Stripe Billing
- [x] supabase/functions/create-checkout/index.ts (Deno, 14-day trial)
- [x] supabase/functions/stripe-webhook/index.ts (Deno, handles completed/updated/deleted)
- [x] PaywallModal wired to createCheckoutSession (Phase 4)
- [ ] Stripe products + prices — manual setup in Stripe dashboard

## Phase 6 — Paid Wallet + Reminders
- [x] utils/generateReminders.ts (date-fns, skips past periods, all frequencies)
- [x] utils/notifications.ts (expo-notifications, 'cardscout_notif_ids' key)
- [x] utils/icsExport.ts (web blob + native share, CardScout PRODID)
- [x] app/(tabs)/portfolio/card-benefits/[userCardId].tsx (per-benefit prefs + reminder days)
- [x] app/(tabs)/portfolio/benefit-detail/[reminderId].tsx (mark used, snooze 3/7d, undo)
- [x] app/(tabs)/portfolio/benefits.tsx (full list, pending/used/all filter)
- [x] app/(tabs)/portfolio/calendar.tsx (multi-dot calendar, paywall gated)

## Phase 7 — AI Pipeline
- [x] supabase/functions/scrape-card/index.ts (GPT-4o, pro-gated, HTML strip → JSON)
- [ ] Wire add-by-URL flow in add-card screen (UI not yet built)

## Phase 8 — Paid Dashboards
- [x] components/WealthRing.tsx (SVG donut, animated, legend)
- [x] app/(tabs)/insights/index.tsx (WealthRing, ROI card, expiring list, card breakdown)
- [ ] Breakeven tracker (data needs benefit reminders populated first)

## Phase 9 — Analytics + Email
- [x] lib/analytics.ts (PostHog wrapper, 10 named events)
- [x] supabase/functions/send-email/index.ts (Resend: welcome, trial_expiring, renewal_failed)
- [ ] Wire capture() calls at key user actions (quiz, card add, paywall show, etc.)

## Phase 10 — Build + Deploy
- [x] eas.json (development, preview, production profiles)
- [x] vercel.json (web export + SPA rewrite)
- [x] app/(tabs)/settings/index.tsx (full: account, subscription status, notif toggle, ICS export)
- [ ] Run: eas build --platform ios --profile production
- [ ] Run: vercel deploy
- [ ] README.md
