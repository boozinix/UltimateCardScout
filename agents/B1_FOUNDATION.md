# Build Agent B1 — Foundation & Ship
**Phase:** 0
**Duration:** 2 weeks
**Depends on:** Nothing (first agent)
**Blocks:** B2, QA1

---

## Read These First

1. `agents/AGENT_MASTER_PLAN.md` — orchestration
2. `AGENT_HANDOFF.md` — current project state, file map, known gotchas
3. `DECISIONS_NEEDED.md` — all locked decisions
4. `PROGRESS_TRACKER.md` — what's already built

---

## What You're Building

The app exists but has gaps. Your job: make the existing app shippable to TestFlight with real payment flow. **No new features.** Resist scope creep.

**Acceptance test:** A TestFlight build where a user can complete onboarding, take the quiz, see results, tap "Start free trial," pay via Stripe, and return with paid features unlocked.

---

## Locked Decisions That Affect You

| Decision | Value |
|---|---|
| Pricing | **$8/mo**, annual TBD. 14-day free trial. |
| Theme | Light (current). Do NOT switch to dark. |
| Tabs | Discover, Vault, Intelligence, Settings. Concierge REMOVED. |
| Auth | Apple Sign In + Google Sign In + email magic link |
| Tab 3 name | "Intelligence" (not Tracker, not Concierge) |
| No affiliate links | Raw issuer URLs |

---

## Tasks (execute in order)

### Task 1 — Remove Concierge Tab Cleanly (30 min)

- Delete `app/(tabs)/concierge/` directory entirely
- Remove concierge entry from `app/(tabs)/_layout.tsx`
- Grep for any remaining `concierge` imports and remove
- Verify 4 tabs visible: Discover, Vault, Intelligence, Settings
- Verify app starts: `npx expo start --web`

**Done when:** No console errors, no broken imports, 4 tabs only.

### Task 2 — Expand Card Catalog to 20 Cards (2-3 hours)

Current `data/cards.csv` has ~110 cards but only 3 are seeded to Supabase. Ensure these 20 are fully populated with accurate data:

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

For each card: `name`, `issuer`, `card_type` (personal/business), `annual_fee`, `signup_bonus`, `bonus_type`, `points_currency`, `network`, `apply_url` (raw issuer URL, no affiliates).

Update `data/cards.csv` and copy to `public/cards.csv`.

**Done when:** Card browser shows 20 cards. Quiz results pull from these.

**Stop and ask if:** Any card's bonus data is uncertain. Do NOT invent bonus amounts.

### Task 3 — Wire Stripe End-to-End (2-3 days)

#### 3a — Update pricing constants
- `lib/subscription.ts`: `MONTHLY_PRICE = 8.00` (was 7.99). Add `ANNUAL_PRICE` placeholder.
- `components/PaywallModal.tsx`: Update displayed price to `$8/mo`.
- Add env vars to `.env.example`: `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`

#### 3b — Checkout session Edge Function
Update `supabase/functions/create-checkout/index.ts`:
- Accept `{ plan: 'monthly' | 'annual' }` + user JWT
- Create Stripe customer if needed, store `stripe_customer_id`
- Create Checkout Session with `subscription_data.trial_period_days = 14`
- Return `{ url: checkoutUrl }`

#### 3c — Stripe webhook handler
Update `supabase/functions/stripe-webhook/index.ts`:
- Verify webhook signature
- Handle: `customer.subscription.created`, `.updated`, `.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Upsert to `subscriptions` table

#### 3d — Entitlement check
Update `hooks/useSubscription.ts`:
- Read from `subscriptions` table via React Query
- Return `{ isPro, status, trialEndsAt, plan, isLoading }`
- Treat `trialing` and `active` as pro
- 5 minute stale time, refetch on focus

**Done when:** Test card `4242 4242 4242 4242` completes checkout, webhook fires, `isPro` returns true.

### Task 4 — Social Login: Apple + Google (1 day)

- Install `expo-apple-authentication` and `@react-native-google-signin/google-signin`
- Add buttons to `app/(auth)/login.tsx`: Apple (primary), Google (secondary), magic link (fallback)
- Apple required for iOS if any social login offered

**Done when:** Apple works on iOS. Google works on iOS + web. Magic link still works.

**Stop and ask if:** Apple team ID / service ID config is unclear. Zubair has the Apple Developer account.

### Task 5 — Simple Onboarding (1 day)

Three screens + skip. Phase 9 refines this later.

- Screen 1: "Find the right card" + illustration + one line
- Screen 2: "Track what you earn" + illustration + one line
- Screen 3: "Optimize every swipe" + illustration + one line
- "Skip" top-right on all three
- "Get started" on Screen 3 → routes to auth
- Persists `hasSeenOnboarding` in AsyncStorage
- Root layout checks flag and routes

**Done when:** Fresh install shows onboarding. Second launch skips. Skip works on all three.

### Task 6 — Sentry Error Monitoring (2 hours)

- Install `@sentry/react-native` + Expo config plugin
- Add `SENTRY_DSN` to `.env.example`
- Wrap root component in Sentry error boundary
- Source map upload in EAS Build config

**Done when:** Test error appears in Sentry within 30 seconds.

### Task 7 — PostHog Analytics (3 hours)

Install `posthog-react-native`. Wire **exactly these 10 events:**

| Event | When | Properties |
|---|---|---|
| `app_open` | App foreground (1x/session) | `platform`, `is_pro` |
| `quiz_start` | Q1 renders | `entry_point` |
| `quiz_complete` | Results render | `num_answers`, `top_card_id` |
| `calculator_used` | Calculator submit | `calculator_name` |
| `signup` | Account created | `auth_method` |
| `card_added` | Card saved to vault | `card_id`, `source` |
| `paywall_viewed` | Paywall opens | `trigger` |
| `trial_started` | Webhook confirms trial | `plan` |
| `subscription_created` | Webhook confirms payment | `plan` |
| `churn` | Webhook confirms cancel | `plan`, `days_active` |

**Do not add other events.** Write future event ideas to AGENT_HANDOFF.md for later.

### Task 8 — Verify All Platforms (2 hours)

- [ ] `npx expo start --web` — no console errors, 4 tabs
- [ ] `npx expo start --ios` (simulator) — same
- [ ] `npx expo start --android` (emulator) — same
- [ ] DevToggle still works on web
- [ ] Full flow: Quiz → Results → Add Card → Paywall → Checkout (test) → Return → Vault unlocked

### Task 9 — EAS Build + TestFlight (1 day)

- [ ] `eas.json` with profiles: development, preview, production
- [ ] `eas build --platform ios --profile preview`
- [ ] `eas submit --platform ios --latest` → TestFlight
- [ ] Add Zubair as internal tester
- [ ] `eas build --platform android --profile preview` → APK

**Done when:** Zubair has TestFlight build installed. Full acceptance test passes on device.

---

## Hard Rules

1. Do NOT build any Phase 1+ feature
2. Do NOT touch `lib/theme.ts` unless fixing a bug
3. Do NOT add packages beyond what's listed
4. Do NOT commit secrets
5. Do NOT ship if web or simulator is broken
6. Do NOT invent card data
7. Do NOT run migrations without user approval
8. One task at a time — finish Task 1 before Task 2

---

## When Done

1. Update `AGENT_HANDOFF.md`: what shipped, what's flaky, what B2 should know
2. Update `PROGRESS_TRACKER.md` Phase 0 checkboxes
3. Trigger QA1 agent
