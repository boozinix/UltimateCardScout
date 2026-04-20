# Phase 0 Kickoff — Claude Code Brief

> **Target:** Ship the existing UnifiedApp to TestFlight with working Stripe billing.
> **Duration:** 2 weeks.
> **This brief is executed by Claude Code.** It assumes `/Users/zubairnizami/Projects/Ultimate Card Scout/UnifiedApp/` as the working directory.

---

## Start Every Session With This

Read these files in order before writing any code:

1. `MASTER_PROGRESS_TRACKER.md` — phase plan + locked decisions
2. `AGENT_HANDOFF.md` — where the last session left off
3. The most recent `CONVERSATION_LOG_YYYY-MM-DD.md` — context from recent discussions
4. This file (`PHASE_0_KICKOFF.md`)

End every session by updating `AGENT_HANDOFF.md` with: what was built, what's blocked, what the next session should start on.

---

## What You're Building in Phase 0

The app already exists. It has a scaffold, auth, a card catalog with 3 seeded cards, a broken Concierge tab, no payment flow, no onboarding, and a dev toggle for mobile/desktop. **Phase 0 ships what's there, it doesn't add new features.** Resist scope creep — any new feature request should be deferred to Phase 1+.

The acceptance test for Phase 0 is simple: a TestFlight build where a user can complete onboarding, take the quiz, see results, tap "Start free trial," pay via Stripe, and return to the app with their paid features unlocked.

---

## Locked Decisions That Affect Phase 0

These are non-negotiable. If you find yourself wanting to change one, stop and ask the user.

| Decision | Value |
|---|---|
| Pricing | $9.99/mo or $99/yr with 14-day free trial |
| Theme | Light editorial (current) — do not switch to dark |
| Tabs | Discover, Vault, Tracker, Settings — Concierge is removed |
| Concierge tab | Delete cleanly — files, nav entry, imports |
| Auth | Apple Sign In + Google Sign In + email magic link |
| Error monitoring | Sentry |
| Analytics | PostHog with exactly 10 events (listed below) |
| Target platforms | iOS (primary), Android, web — Phase 0 ships iOS TestFlight first |
| App Store submission | Not yet — that's Phase 10 |

---

## Task 1 — Remove Concierge Tab Cleanly (30 min)

Start here because it's trivial and clears noise for everything else.

- Delete `app/(tabs)/concierge/` directory entirely
- Remove concierge entry from `app/(tabs)/_layout.tsx`
- Grep for any remaining `concierge` imports across codebase and remove
- Verify app still starts: `npx expo start --web`

**Done when:** Four tabs visible (Discover, Vault, Tracker, Settings), no console errors, no broken imports.

---

## Task 2 — Expand Card Catalog to 20 Seeded Cards (2-3 hours)

Current `data/cards.csv` has 3 cards. Expand to exactly these 20:

1. Chase Sapphire Preferred
2. Chase Sapphire Reserve
3. Chase Freedom Flex
4. Chase Freedom Unlimited
5. Chase Ink Business Preferred
6. Chase Ink Business Cash
7. Chase Ink Business Unlimited
8. Amex Platinum (personal)
9. Amex Gold
10. Amex Green
11. Amex Business Platinum
12. Amex Business Gold
13. Capital One Venture X
14. Capital One Venture
15. Capital One Savor
16. Citi Strata Premier
17. Bilt Mastercard
18. US Bank Altitude Reserve
19. Wells Fargo Autograph
20. BoA Premium Rewards

For each card, populate: `name`, `issuer`, `card_type`, `annual_fee`, `signup_bonus`, `bonus_type`, `bonus_value_usd`, `category_rates` (JSON), `benefits_preview` (array of 3-5 headline benefits), `gradient_key`, `image_path`, `application_link`.

Use **raw issuer URLs** for `application_link` — no affiliate tracking in Phase 0. Affiliate layer is a separate Phase 1+ decision.

Run `npx ts-node scripts/ingest-cards.ts` to upsert to Supabase. Idempotent — safe to re-run.

**Done when:** Card Database Browser shows 20 cards. Quiz results pull from these 20. Filter by issuer works.

**Stop and ask if:** Any card's detail data is genuinely uncertain. Don't invent signup bonuses. Ask the user or mark with `needs_review: true` in the CSV.

---

## Task 3 — Stripe Billing End-to-End (2-3 days)

This is the longest task. Split into four subtasks:

### 3a — Stripe product setup (user does this in Stripe dashboard, not code)

Zubair creates:
- Product: "CardScout Pro Monthly" — $9.99/mo with 14-day free trial
- Product: "CardScout Pro Annual" — $99/yr with 14-day free trial
- Copies both `price_id` values into env vars: `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`

Document this in the README under "Environment setup." Don't assume it's done.

### 3b — Checkout session Edge Function

Create `supabase/functions/create-checkout/index.ts`:
- Accepts `{ plan: 'monthly' | 'annual' }` + user's Supabase JWT
- Creates Stripe customer if user doesn't have one yet, stores `stripe_customer_id` on `subscriptions` table
- Creates Checkout Session with `subscription_data.trial_period_days = 14`
- Returns `{ url: checkoutUrl }`
- Uses `SUCCESS_URL` and `CANCEL_URL` env vars for post-checkout redirect

### 3c — Stripe webhook handler

Create `supabase/functions/stripe-webhook/index.ts`:
- Verifies webhook signature with `STRIPE_WEBHOOK_SECRET`
- Handles events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Upserts to `subscriptions` table with: `stripe_subscription_id`, `plan`, `status`, `trial_end`, `current_period_end`, `cancel_at_period_end`

### 3d — Entitlement check hook

Update `hooks/useSubscription.ts`:
- Reads from `subscriptions` table via React Query
- Returns `{ isPro, status, trialEndsAt, plan, isLoading }`
- Treats `trialing` and `active` statuses as pro
- Cache: 5 minute stale time, refetch on window focus
- Single source of truth — all paywall gates use this hook

### Paywall trigger

Update the "Add to Vault" flow so that after adding a card, if `!isPro`, show paywall modal with:
- Trial-first messaging ("Start your 14-day free trial")
- Monthly vs annual toggle
- "Continue free" dismiss option that returns user to Vault
- On CTA tap: call `create-checkout`, open returned URL in in-app browser, handle return via deep link

**Done when:** Test card (`4242 4242 4242 4242`) completes checkout, webhook fires in Supabase logs, `subscriptions` row exists, `useSubscription().isPro` returns true, paid Vault features render.

**Stop and ask if:** Deep link handling for post-checkout return feels flaky. This is a real pain point and worth pair-solving.

---

## Task 4 — Social Login (Apple + Google) (1 day)

Current auth is email magic link only. Add Apple and Google.

- Install `expo-apple-authentication` and `@react-native-google-signin/google-signin`
- Configure both providers in Supabase dashboard (Auth → Providers)
- Add buttons to `app/(auth)/login.tsx`
- Apple: required for iOS App Store approval if any other social login is offered
- Google: web + native

**Done when:** Apple Sign In works on iOS TestFlight build. Google works on iOS and web. Magic link still works as fallback.

**Stop and ask if:** Apple team ID / service ID configuration is unclear. Zubair has the Apple Developer account and needs to generate these.

---

## Task 5 — Onboarding Flow (1.5 days)

Three screens + skip. Simple for now — Phase 8 refines this with the "show value first" flow.

- Screen 1: "Find the right card" with illustration + one-line copy
- Screen 2: "Track what you earn" with illustration + one-line copy
- Screen 3: "Optimize every swipe" with illustration + one-line copy
- "Skip" button top-right on all three
- "Get started" CTA on Screen 3 → routes to `(auth)/login`
- Persists `hasSeenOnboarding` flag in AsyncStorage
- Root layout checks flag and routes appropriately

**Done when:** Fresh app install shows onboarding → auth → Discover. Second launch skips onboarding. Skip button works on all three.

---

## Task 6 — Sentry Error Monitoring (2 hours)

- Install `@sentry/react-native` and Expo config plugin
- Add `SENTRY_DSN` to env
- Wrap root component in Sentry error boundary
- Add source map upload to EAS Build config
- Test by throwing a test error in dev build

**Done when:** Test error appears in Sentry dashboard within 30 seconds. Source maps work (stack trace shows readable code, not minified).

---

## Task 7 — PostHog Analytics (3 hours)

Install `posthog-react-native`. Add `EXPO_PUBLIC_POSTHOG_KEY` to env.

Wire **exactly these 10 events** — no more, no less. Event bloat is a real problem.

| Event | When fired | Properties |
|---|---|---|
| `app_open` | App foreground (debounced to 1x per session) | `platform`, `is_pro` |
| `quiz_start` | Quiz question 1 renders | `entry_point` |
| `quiz_complete` | Results screen renders after quiz | `num_answers`, `top_recommendation_card_id` |
| `calculator_used` | Any calculator submit | `calculator_name` |
| `signup` | New user account created | `auth_method` (apple/google/magic_link) |
| `card_added` | User saves card to vault | `card_id`, `source` (quiz/browse/manual) |
| `paywall_viewed` | Paywall modal opens | `trigger` (card_added/feature_gate/manual) |
| `trial_started` | Stripe webhook confirms trial start | `plan` (monthly/annual) |
| `subscription_created` | Stripe webhook confirms first payment | `plan` |
| `churn` | Stripe webhook confirms cancellation | `plan`, `days_active` |

**Done when:** Events appear in PostHog dashboard within 5 minutes of firing in the app.

**Do not add other events in Phase 0.** If something feels worth tracking, write it in `AGENT_HANDOFF.md` for Phase 1+ discussion.

---

## Task 8 — Verify Clean Run on All Three Platforms (2 hours)

Before TestFlight, confirm:

- [ ] `npx expo start --web` — works, no console errors, all 4 tabs render
- [ ] `npx expo start --ios` (simulator) — same
- [ ] `npx expo start --android` (emulator) — same
- [ ] DevToggle still functional on web
- [ ] Quiz → Results → Add Card → Paywall → Checkout (test mode) → return to app → Vault unlocked

If any platform fails, fix before proceeding. **Do not ship iOS if web is broken.** They share code; a web bug is a time bomb.

---

## Task 9 — EAS Build + TestFlight Submission (1 day)

- [ ] `eas.json` configured with profiles: `development`, `preview`, `production`
- [ ] `eas build --platform ios --profile preview` — produces `.ipa`
- [ ] `eas submit --platform ios --latest` — uploads to TestFlight
- [ ] Add Zubair as internal tester
- [ ] `eas build --platform android --profile preview` — produces `.apk`
- [ ] Distribute Android APK via EAS internal distribution

**Done when:** Zubair has the TestFlight build installed on his phone. The acceptance test (onboarding → quiz → paywall → checkout → Vault unlocked) passes end-to-end on his device.

**Stop and ask if:** TestFlight review bounces for any reason (Apple requires certain entitlements for in-app purchases — but we're using Stripe web checkout, which is allowed for subscription apps that also offer the service outside the app).

---

## Phase 0 Close Checklist

Before declaring Phase 0 done:

- [ ] Every task checkbox above is ticked
- [ ] `MASTER_PROGRESS_TRACKER.md` Phase 0 section checkboxes updated
- [ ] `AGENT_HANDOFF.md` written with: what shipped, what's flaky, what Phase 0.5 should start with
- [ ] New `CONVERSATION_LOG_YYYY-MM-DD.md` written covering the phase
- [ ] QA Agent protocol run (`QA_AGENT.md`) — all Sev 1 and Sev 2 issues fixed
- [ ] Sentry shows zero unresolved issues from TestFlight tester session
- [ ] PostHog shows events firing correctly
- [ ] Commit + push to git (but do not merge to main or deploy prod unless user explicitly instructs)

---

## Hard Rules for This Phase

1. **Do not build any Phase 1+ feature.** No Application Ledger, no velocity rules, no email forwarding, no automation pipeline. That's a different session.
2. **Do not touch `lib/theme.ts`** unless fixing a bug. Theme is locked.
3. **Do not add packages beyond what's listed.** If you think a new dep is needed, stop and ask.
4. **Do not commit secrets.** All API keys go in `.env.local` and env vars — never hardcoded.
5. **Do not ship if web or simulator is broken.** Parity matters.
6. **Do not invent card data.** If unsure about a signup bonus or fee, flag it.
7. **Do not run migrations unless explicitly told.** Supabase schema changes get reviewed by Zubair first.
8. **One feature at a time.** Finish Task 1 before starting Task 2.

---

## When to Stop and Ask

Stop and ask Zubair if any of these happen:

- A task is ambiguous after re-reading the brief
- A decision would contradict the locked decisions table in `MASTER_PROGRESS_TRACKER.md`
- You're about to add a new dependency
- Stripe webhook configuration requires access to the dashboard you don't have
- A card in the 20-card list has data you're not sure about
- TestFlight submission bounces for any reason
- Any test fails and you can't diagnose within 15 minutes

The cost of asking is 10 minutes. The cost of guessing wrong is a rebuild.

---

## Success Definition

At the end of Phase 0:

1. Zubair installs CardScout from TestFlight
2. Goes through onboarding
3. Takes the quiz
4. Sees results
5. Taps "Add to Vault"
6. Sees paywall, taps "Start free trial"
7. Completes Stripe checkout with trial
8. Returns to app
9. Vault shows his added card as a paid member

If all 9 steps work, Phase 0 is done. Move to Phase 0.5.

If any step is broken, Phase 0 is not done. No exceptions.
