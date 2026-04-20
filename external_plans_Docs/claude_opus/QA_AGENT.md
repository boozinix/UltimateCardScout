# QA Agent Protocol

> **Purpose:** The human-language test script that a Claude Code session executes at the end of every phase.
> **When to run:** Phase close checklist item. No phase is "done" until the QA Agent has run and Sev 1/Sev 2 issues are resolved.
> **What this is NOT:** This is not a replacement for Vitest (unit tests, see `QA_LAYER_1_UNIT_TESTS.md`) or Playwright in CI (E2E tests, see `QA_LAYER_2_E2E_TESTS.md`). Those run on every commit. This runs at phase boundaries and catches things the other two miss.

---

## How This Works

At the end of a phase, you start a fresh Claude Code session with this exact prompt:

```
Read QA_AGENT.md. Run through every flow in the "Active Flows" section using Playwright MCP 
against the local dev environment (http://localhost:8081). For each flow, report pass/fail 
with severity. For failures, capture a screenshot and paste the error. Do not fix anything — 
just report. I'll triage and assign fixes.
```

The agent reports back in the format specified in "Report Format" at the bottom of this file. You triage Sev 1 and Sev 2. Sev 3 goes in the backlog. Phase closes when no Sev 1 or Sev 2 remain.

---

## Severity Classification

| Sev | Definition | Action |
|---|---|---|
| **Sev 1** | App crashes, data loss, payment fails, security issue | Fix before phase closes. Blocker. |
| **Sev 2** | Core flow broken but app doesn't crash (e.g., paywall doesn't appear, form doesn't save) | Fix before phase closes. |
| **Sev 3** | Visual glitch, minor UX issue, edge case (e.g., long card name overflows) | Log to backlog, fix when convenient. |
| **Observation** | Not a bug but something worth noting (e.g., "loading spinner is slow") | Log, discuss in planning. |

---

## Test Environment Setup

Before running the QA Agent:

1. **Reset local dev state:** `supabase db reset` (wipes and reseeds)
2. **Seed known test users:**
   - `test-new@cardscout.app` — fresh user, no onboarding completed
   - `test-free@cardscout.app` — completed onboarding, no subscription
   - `test-trialing@cardscout.app` — in 14-day trial
   - `test-pro@cardscout.app` — active paid subscription
   - `test-churned@cardscout.app` — cancelled subscription
3. **Seed test data:** 20 cards in catalog (Phase 0 seed set)
4. **Seed household data** (Phase 1+): `test-pro` has 2 household members (Alex, Jordan)
5. **Start dev server:** `npx expo start --web`
6. **Verify:** http://localhost:8081 loads the app

Credentials for test accounts stored in `.env.qa` (gitignored). Claude Code session needs access.

---

## Active Flows

### Flow 1 — Fresh Install, Onboarding Skip

**Active from:** Phase 0

**Preconditions:** Logged out, no AsyncStorage data (use incognito).

**Steps:**
1. Open app
2. See Onboarding Screen 1
3. Tap "Skip" top-right
4. Lands on Discover tab

**Expected:**
- Onboarding does not re-appear on refresh
- Four tabs visible: Discover, Vault, Tracker, Settings (no Concierge)
- Discover tab renders the quiz entry point or card browser

**Common failures:**
- Skip button does nothing (Sev 2)
- Onboarding re-appears on refresh (Sev 2 — AsyncStorage write failed)
- Concierge tab still visible (Sev 2 — Phase 0 cleanup incomplete)

---

### Flow 2 — Fresh Install, Complete Onboarding → Sign Up

**Active from:** Phase 0

**Preconditions:** Logged out, no AsyncStorage data.

**Steps:**
1. Open app
2. Advance through all 3 onboarding screens
3. Tap "Get started"
4. Auth screen renders with Apple / Google / Magic Link options
5. Tap magic link, enter `test-new@cardscout.app`
6. (In dev, inspect Supabase logs to get magic link)
7. Confirm magic link
8. Lands on Discover tab
9. Account exists in `auth.users`

**Expected:**
- PostHog receives `signup` event with `auth_method: magic_link`
- No Sentry errors
- User row created in `auth.users` and `public.users` (if separate table)

**Common failures:**
- Magic link email not sent (Sev 1 — Resend/Supabase email config broken)
- Post-auth redirect to wrong tab (Sev 2)
- Duplicate signup event fired (Sev 3)

---

### Flow 3 — Quiz → Results → Card Detail

**Active from:** Phase 0

**Preconditions:** Logged in as `test-free@cardscout.app`.

**Steps:**
1. Tap Discover tab
2. Tap "Find my card" (quiz entry)
3. Answer question 1 (tap an option)
4. Answer question 2
5. Answer question 3
6. Results render with ranked cards
7. Tap top-ranked card
8. Card detail sheet opens
9. Tap "Apply" — opens external URL in browser
10. Return to app
11. Tap "Add to Vault"

**Expected:**
- PostHog: `quiz_start`, `quiz_complete`, `card_added`, `paywall_viewed` (since user is free)
- Paywall modal appears after "Add to Vault"
- Results show 3-5 ranked cards, not 0 or 20
- Score breakdown visible per card
- Apply URL is the card's `application_link`

**Common failures:**
- Results show 0 cards (Sev 1 — scoring logic broken or catalog empty)
- Results show all 20 cards identical (Sev 1 — ranking logic broken)
- Card detail sheet missing benefit list (Sev 2)
- Apply URL opens in same webview, traps user (Sev 2)
- Paywall doesn't trigger (Sev 2 — free/pro gate misconfigured)

---

### Flow 4 — Paywall → Stripe Checkout → Return

**Active from:** Phase 0

**Preconditions:** Logged in as `test-free@cardscout.app`, paywall modal visible (from Flow 3).

**Steps:**
1. Paywall modal shows monthly + annual options
2. Tap "Start 14-day free trial" (monthly selected)
3. In-app browser opens Stripe Checkout
4. Enter test card `4242 4242 4242 4242`, any future expiry, any CVC, any zip
5. Complete checkout
6. Returns to app via deep link
7. Lands on Vault with card visible
8. Refresh — still Pro

**Expected:**
- Stripe webhook fires in logs
- `subscriptions` table row exists with `status: trialing`, `plan: monthly`, `trial_end` 14 days out
- `useSubscription().isPro` returns true
- PostHog: `trial_started` event with `plan: monthly`
- Paywall does not re-trigger for 14 days
- Can re-enter Stripe billing portal from Settings

**Common failures:**
- Deep link doesn't return to app (Sev 1 — post-checkout flow broken)
- Webhook fires but `subscriptions` row not created (Sev 1 — webhook handler broken)
- `isPro` returns false despite active trial (Sev 1 — entitlement check broken)
- Stripe checkout URL 404s (Sev 1 — Edge Function `create-checkout` broken)
- Double-submit creates two subscriptions (Sev 1)

---

### Flow 5 — Tab Navigation, All Four Tabs

**Active from:** Phase 0

**Preconditions:** Logged in as any user.

**Steps:**
1. Tap Discover → renders
2. Tap Vault → renders
3. Tap Tracker → renders
4. Tap Settings → renders
5. Tap Discover again → renders
6. Repeat 2x

**Expected:**
- Each tab renders within 500ms
- No console errors on tab switch
- No memory leak (dev tools — heap snapshot stable after 10 switches)
- Tab state preserved when returning (scroll position, form data)

**Common failures:**
- Tracker tab shows "Concierge" content (Sev 1 — stub file not deleted)
- Tab flicker or blank render (Sev 2)
- Scroll position resets on return (Sev 3)

---

### Flow 6 — Sign Out, Sign Back In

**Active from:** Phase 0

**Preconditions:** Logged in as `test-pro@cardscout.app`.

**Steps:**
1. Settings → Sign out
2. Lands on auth screen
3. Sign back in (magic link)
4. Lands on Discover (or last tab — depends on design)
5. Vault still shows Pro features
6. Tracker still shows existing ledger entries

**Expected:**
- No data loss
- `useSubscription` correctly re-fetches after auth
- Cached data cleared on sign-out (no leak from prior user)

**Common failures:**
- Previous user's data visible after sign-out (Sev 1 — security issue)
- `isPro` stale after sign-in (Sev 2)
- App hangs on sign-out (Sev 2)

---

### Flow 7 — DevToggle (Dev Builds Only)

**Active from:** Phase 0

**Preconditions:** `__DEV__` true.

**Steps:**
1. Verify floating pill button bottom-right
2. Tap once → Blue "MOB" — layout forces mobile
3. Tap again → Green "DSK" — layout forces desktop
4. Tap again → Grey "AUTO" — respects real screen width
5. Build prod variant, verify pill button NOT visible

**Expected:**
- Desktop forced layout visually distinct (2-column on results, etc. — Phase 9+)
- Mobile forced layout looks native on wide browser
- Production build omits DevToggle entirely

**Common failures:**
- Pill visible in prod (Sev 1 — security/UX)
- Forced mode doesn't persist across nav (Sev 2)
- Layout breaks in forced mode (Sev 3)

---

### Flow 8 — Application Ledger Add/Edit/Delete

**Active from:** Phase 1

**Preconditions:** Logged in as `test-pro@cardscout.app`, no applications in ledger.

**Steps:**
1. Tracker tab → Ledger sub-tab
2. Empty state visible with "Add your first application" CTA
3. Tap CTA
4. Form opens
5. Search "Chase Sapphire Preferred" → picks from catalog → prefills bonus/fee/min spend
6. Select household member (Alex)
7. Select applied month (e.g. Feb 2026)
8. Select credit bureau (TransUnion)
9. Status: Approved
10. Save
11. Returns to ledger — row visible
12. Tap row → detail view
13. Edit — change bonus_spend_progress to $2000
14. Save
15. Returns to ledger — updated
16. Swipe to delete (or tap delete in detail)
17. Confirm deletion
18. Row removed

**Expected:**
- Form validates required fields
- Catalog search returns relevant results fast (<300ms)
- Save persists to Supabase `applications` table
- Edit updates same row (not creates new)
- Delete is reversible via undo toast (5s)

**Common failures:**
- Catalog search returns 0 results for known card (Sev 2)
- Prefill doesn't happen (Sev 2)
- Save silently fails (Sev 1 — data loss)
- Delete is hard, no undo (Sev 2)

---

### Flow 9 — Household Setup (First-Run)

**Active from:** Phase 1

**Preconditions:** Logged in as fresh pro user, no household members set up.

**Steps:**
1. Tap Tracker tab for first time
2. Modal: "Tracking just you, or a partner too?"
3. Option 1: "Just me" — skip, lands on empty ledger
4. (Back, reset state)
5. Option 2: "Me + partner" — name fields appear
6. Enter "Alex" and "Jordan"
7. Save
8. Lands on ledger with member filter chips visible
9. Modal does NOT re-appear on next Tracker tab visit

**Expected:**
- `household_members` table populated
- Name is editable later in Settings
- Modal only appears once

**Common failures:**
- Modal re-appears on app reload (Sev 2 — flag not persisted)
- Can't add 3rd member later (Sev 3 — feature limit)
- Member names don't show in ledger filter chips (Sev 2)

---

### Flow 10 — CSV Import

**Active from:** Phase 1

**Preconditions:** Logged in as `test-pro@cardscout.app`, household set up.

**Steps:**
1. Tracker → Ledger → "Import CSV" menu option
2. Upload `test_data/sample_churning_sheet.csv` (20 rows)
3. Column mapping UI appears
4. Map "Opened" → `applied_month`, "Person" → `household_member`, etc.
5. Preview shows first 5 parsed rows
6. Tap "Import 20 applications"
7. Returns to ledger
8. 20 rows visible

**Expected:**
- Parse errors on malformed rows show inline, allow skip
- Date formats handled (Oct-23 → 2023-10, 10/23 → 2023-10, etc.)
- Duplicate detection: if row matches existing, skip or merge
- Import is atomic (all or none, or partial with summary)

**Common failures:**
- Date parse fails on "Oct-23" (Sev 2)
- Household member mapping fails (Sev 2)
- All rows imported as same person (Sev 1 — data corruption)
- Import hangs on 100+ row files (Sev 3 — scale)

---

### Flow 11 — Velocity Dashboard

**Active from:** Phase 2

**Preconditions:** Logged in as `test-pro@cardscout.app`, 8 applications imported from CSV spanning 2022-2025.

**Steps:**
1. Tracker → Velocity sub-tab
2. Per-issuer cards render
3. Chase card shows "4/24" if 4 apps in last 24 months count
4. Amex card shows open cards count and last-app-date
5. Tap Chase card → detail view lists which 4 apps count + drop-off dates

**Expected:**
- 5/24 calculation matches manual count against imported data
- Business cards excluded where rules say so (Chase Ink Business = not 5/24)
- Drop-off dates calculated correctly (applied_month + 24 months)
- Per-household-member separate view

**Common failures:**
- 5/24 count wrong (Sev 1 — trust-destroying, user can't rely)
- Business cards incorrectly counted (Sev 1 — same)
- Velocity warnings miss a rule (Sev 2 — if Amex 1-in-90 warning missing, etc.)

**This flow MUST also pass all Vitest cases in `QA_LAYER_1_UNIT_TESTS.md` before being considered valid.**

---

### Flow 12 — Paywall Trigger Points

**Active from:** Phase 0 (basic), Phase 5+ (expanded)

**Preconditions:** Logged in as `test-free@cardscout.app`.

**Steps:**
1. Try to add a card to Vault → paywall appears
2. Tap Vault tab directly → Vault shows free-tier limit (3 cards) with lock overlay on pro features
3. Try to add 4th card → paywall appears
4. Try to access Velocity Dashboard → paywall appears
5. Try to access Application Ledger beyond free view → paywall appears (Phase 1+)
6. Tap "Maybe later" on each paywall → returns to previous screen without action
7. Tap "Start free trial" on one → Stripe checkout flow (Flow 4)

**Expected:**
- Paywall copy matches trigger context ("Unlock the Ledger" vs "Unlock unlimited cards")
- "Maybe later" always works — never traps user
- PostHog: `paywall_viewed` with correct `trigger` property

**Common failures:**
- Paywall can be dismissed but feature unlocks anyway (Sev 1 — gating broken)
- Paywall traps user (no back button works) (Sev 1 — UX + App Store reject risk)
- Wrong copy shown (Sev 3)

---

### Flow 13 — Admin Review Queue (Phase 0.5)

**Active from:** Phase 0.5

**Preconditions:** Logged in as admin user. Pipeline has run, `data_proposals` has 10+ pending rows.

**Steps:**
1. Navigate to `/admin/proposals`
2. Stack of proposal cards visible
3. First card shows source, type, diff table
4. Press `a` key → approves, advances to next
5. Press `r` → rejects, advances
6. Press `e` → edit form, modify, save → advances
7. "View source" opens DoC URL in new tab
8. Bulk action: "Approve all high-confidence DoC proposals" → clears 5 in one click

**Expected:**
- Admin UI gated (non-admin user gets 403)
- Approved proposals apply to target table within 10s
- `cards.last_verified_at` updates
- `data_proposals.applied_at` set correctly

**Common failures:**
- Non-admin can access (Sev 1 — security)
- Approve doesn't write to target table (Sev 1 — data integrity)
- Keyboard shortcuts don't work (Sev 3)

---

### Flow 14 — Email Forwarding (Phase 0.5)

**Active from:** Phase 0.5

**Preconditions:** Logged in as `test-pro@cardscout.app`. Unique forward address generated.

**Steps:**
1. Settings → Email Import
2. Copy unique address (e.g. `u_abc123@in.cardscout.app`)
3. Send a real Chase approval email to that address (use forwarded copy from your actual inbox)
4. Wait 30 seconds
5. Open Tracker → Ledger
6. New application row visible with "Auto-imported, review" badge

**Expected:**
- Email arrives at SendGrid → webhook fires → `data_proposals` row created
- Auto-apply (if confidence >0.85) creates `applications` row within 60s
- Badge on row for 7 days or until user taps "Confirm"

**Common failures:**
- Email never arrives at handler (Sev 1 — SendGrid config issue)
- GPT extraction fails silently (Sev 2 — need error capture)
- Row created but wrong card matched (Sev 2 — fuzzy matching wrong)
- Unauthorized email processed (Sev 1 — security)

---

## Phase-Specific Flow Additions

As phases complete, add new flows here. Each flow follows the same structure.

- **Phase 3 (Bonus Spend Tracker):** Flow for deadline countdown + notification firing
- **Phase 4 (Points Portfolio):** Flow for balance entry + total calculation + household split
- **Phase 5 (Annual Fee Advisor):** Flow for fee-due prompt + retention logging
- **Phase 6 (Spend Optimizer):** Flow for "which card right now" category picker
- **Phase 7 (Deal Passport):** Flow for personalized deal feed filtering
- **Phase 8 (Onboarding Refinement):** Flow for "show value first" onboarding
- **Phase 9 (Desktop Layout):** Flow for wide-browser 2-column renders
- **Phase 10 (Polish):** Flow for card art loading, animations, widget
- **Phase 11 (Crowdsourced):** Flow for opt-in + aggregation display

Do not add flows prematurely. A flow is added only when its underlying feature is being built or has been built.

---

## Report Format

The Claude Code QA session reports back in this exact structure:

```markdown
# QA Agent Report — [Date] — Phase [N]

## Summary
- Flows run: 14
- Pass: 11
- Sev 1: 1
- Sev 2: 2
- Sev 3: 3
- Total runtime: 12 min

## Sev 1 Issues (Block phase close)

### Flow 4 — Paywall → Stripe Checkout → Return
**Severity:** Sev 1
**Step failed:** Step 6 — "Returns to app via deep link"
**What happened:** After Stripe checkout completed, Safari closed but app did not receive deep link. Stuck on Stripe "Payment complete" page with no way back to app.
**Screenshot:** [path]
**Hypothesis:** `app.json` scheme missing or Stripe return_url misconfigured
**Suggested owner:** Check `supabase/functions/create-checkout/index.ts` return_url + `app.json` scheme

## Sev 2 Issues (Block phase close)

[...]

## Sev 3 Issues (Backlog)

[...]

## Observations

- Loading spinner on Vault tab visible for ~800ms even with cache warm. Consider skeleton UI.
- PostHog `quiz_complete` event fires twice occasionally — hard to reproduce reliably.

## Environment
- Branch: `phase-0-kickoff`
- Commit: `a1b2c3d`
- Dev server: http://localhost:8081
- Test accounts used: test-free, test-pro
- Time: 2026-04-20 14:30 PT
```

---

## When NOT to Run QA Agent

- Mid-phase (it's a phase *gate*, not a continuous check)
- On incomplete code (obvious failures, not useful)
- When only CSS/styling changed (Layer 1 + Layer 2 suffice)
- During dependency upgrades (trust Vitest + Playwright to catch breakage)

---

## Handling QA Agent Findings

1. **Sev 1:** Stop phase close. Fix immediately. Re-run affected flow after fix.
2. **Sev 2:** Fix before phase close unless specifically deferred by Zubair with a written reason.
3. **Sev 3:** Create GitHub issue with `qa-backlog` label. Revisit at next phase planning.
4. **Observation:** Add to `AGENT_HANDOFF.md` "Watchlist" section.

---

## Maintenance

Every new flow added should:
- Have a clear "Active from Phase N" marker
- Include preconditions, steps, expected outcomes, common failures
- Specify severity for the most likely failure modes
- Be independently runnable (doesn't depend on another flow running first, unless noted)

Every quarter: review deprecated flows. If a feature was cut or replaced, archive the flow.
