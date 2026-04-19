# QA Agent QA1 — Foundation Smoke Tests
**Runs after:** B1 (Phase 0)
**Severity gate:** Fix all Sev 1 and Sev 2 before B2 starts.

---

## Read These First

1. `agents/AGENT_MASTER_PLAN.md`
2. `AGENT_HANDOFF.md` — current state after B1
3. `DECISIONS_NEEDED.md` — locked decisions

---

## What You're Testing

Everything B1 built: app loads, 4 tabs work, auth flows, Stripe checkout, onboarding, PostHog events, Sentry error capture.

**You do NOT fix bugs. You report them.**

---

## Test Environment Setup

1. Start dev server: `npx expo start --web`
2. Open http://localhost:8081
3. Have Stripe test mode credentials ready
4. Have test email accounts ready for magic link

---

## Flows

### Flow 1 — App Smoke Test
1. Open app at root URL
2. Verify no console errors
3. Verify no unhandled promise rejections (wait 5 seconds)

**Expected:** App loads. Title contains "CardScout" or similar.
**Sev 1 if:** App crashes on load, white screen, JS error.

### Flow 2 — Four Tabs Navigation
1. Tap Discover → renders
2. Tap Vault → renders
3. Tap Intelligence → renders
4. Tap Settings → renders
5. Repeat 3x
6. Verify NO "Concierge" tab exists anywhere

**Expected:** Each tab renders in <500ms. No crashes on rapid switching.
**Sev 1 if:** Concierge tab still visible. Any tab crashes.
**Sev 2 if:** Tab takes >2 seconds. Content flickers.
**Sev 3 if:** Scroll position resets on tab return.

### Flow 3 — Onboarding (Fresh Install)
1. Clear all cookies/storage (incognito)
2. Open app
3. Verify onboarding Screen 1 appears
4. Tap "Skip"
5. Verify lands on Discover tab
6. Refresh page
7. Verify onboarding does NOT re-appear

**Expected:** Skip works. Persistence works.
**Sev 2 if:** Skip doesn't work. Onboarding re-appears.

### Flow 4 — Onboarding Complete + Auth
1. Fresh state (incognito)
2. Advance through all 3 onboarding screens
3. Tap "Get started"
4. Auth screen renders
5. Verify Apple, Google, and magic link options visible
6. Test magic link: enter email, verify "check your email" message

**Expected:** All auth options visible. Magic link sends.
**Sev 1 if:** Auth screen crashes. Magic link fails to send.
**Sev 2 if:** Apple/Google buttons missing (may need native build).

### Flow 5 — Quiz → Results
1. Sign in (any method)
2. Tap Discover tab
3. Start quiz
4. Answer all questions
5. Results render with ranked cards

**Expected:** 3-5 ranked cards appear. Scores visible.
**Sev 1 if:** 0 cards shown (scoring broken or catalog empty).
**Sev 1 if:** All 20 cards shown with identical scores (ranking broken).
**Sev 2 if:** Card detail missing benefits list.

### Flow 6 — Card Catalog (20 Cards)
1. Navigate to card browser
2. Count cards visible

**Expected:** At least 20 cards. Each has name, issuer, fee, bonus.
**Sev 2 if:** <20 cards. Missing data on any card.

### Flow 7 — Paywall Trigger
1. Sign in as free user
2. Try to add a card to Vault
3. Paywall modal should appear
4. Verify pricing shows "$8/mo"
5. Verify "Maybe later" button works
6. Tap "Maybe later" — returns to previous screen

**Expected:** Paywall appears. Pricing correct. Dismiss works.
**Sev 1 if:** Paywall doesn't appear (gating broken).
**Sev 1 if:** "Maybe later" traps user (no way to dismiss).
**Sev 2 if:** Wrong pricing shown.

### Flow 8 — Stripe Checkout
1. Free user triggers paywall
2. Tap "Start 14-day free trial"
3. Stripe checkout page loads
4. Enter test card: `4242 4242 4242 4242`, future expiry, any CVC
5. Complete checkout
6. Return to app
7. Verify Pro features unlocked

**Expected:** Checkout completes. Webhook fires. `isPro` = true.
**Sev 1 if:** Checkout URL 404s (Edge Function broken).
**Sev 1 if:** Return to app fails (deep link broken).
**Sev 1 if:** Pro features still locked after checkout (entitlement broken).

### Flow 9 — Sign Out + Sign Back In
1. Sign in as any user
2. Settings → Sign out
3. Verify lands on auth screen
4. Sign back in
5. Verify data persists (vault cards, subscription status)

**Expected:** Clean sign out. No data leak between sessions.
**Sev 1 if:** Previous user's data visible after sign out (security).
**Sev 2 if:** `isPro` stale after re-signin.

### Flow 10 — DevToggle
1. Verify floating pill button visible (bottom-right)
2. Tap → cycles AUTO → MOB → DSK
3. Mobile mode: bottom tab bar, single column
4. Desktop mode: sidebar, wider layout
5. **In production build:** verify pill button NOT visible

**Expected:** Mode switching works.
**Sev 1 if:** DevToggle visible in production.
**Sev 2 if:** Mode switching doesn't work.

### Flow 11 — PostHog Events
1. Open browser dev tools → Network tab
2. Complete quiz flow
3. Verify `quiz_start` and `quiz_complete` events in network requests to PostHog

**Expected:** Events fire with correct properties.
**Sev 2 if:** Events don't fire.
**Sev 3 if:** Events fire with wrong properties.

---

## Report Format

```markdown
# QA1 Report — [Date]

## Summary
- Flows run: 11
- Pass: X
- Sev 1: X
- Sev 2: X
- Sev 3: X

## Sev 1 Issues (Block B2)
### [Flow name]
**Step failed:** Step X
**What happened:** [description]
**Expected:** [what should happen]
**Screenshot:** [if applicable]
**Likely cause:** [diagnosis]

## Sev 2 Issues (Block B2)
[same format]

## Sev 3 Issues (Backlog)
[same format]

## Observations
[anything notable but not a bug]
```

---

## Rules

1. Do NOT fix any bugs. Report only.
2. Do NOT modify any application code.
3. Test each flow independently.
4. Include screenshots for visual bugs.
5. If a flow depends on a prior flow's state, note that.
