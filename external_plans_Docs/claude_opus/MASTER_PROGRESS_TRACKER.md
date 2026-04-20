# CardScout UnifiedApp — Master Progress Tracker

> **Version:** 2.0 (supersedes PROGRESS_TRACKER.md v1.x)
> **Last updated:** 2026-04-19
> **Status:** Authoritative. All prior phase plans are deprecated.

This file is the single source of truth for what's being built, in what order, and with what acceptance criteria. Every Claude Code session starts by reading this file. Every phase closes by updating it.

---

## Product Vision (Pinned — Do Not Drift)

A credit card operating system for churners. Free tier is discovery (quiz, card search, calculators, guides) funded by affiliate revenue. Paid tier at $9.99/mo or $99/yr is the intelligence layer: Application Ledger, velocity dashboard, bonus spend tracking, points portfolio, annual fee advisor, retention tracking, deal passport, household support. No bank integrations, ever. Data in via email forwarding, manual entry with smart prefill, and CSV import. Automated ingestion pipeline pulls Doctor of Credit, Reddit, and issuer pages weekly into a review queue that you approve in 5 minutes. The competitive wedge is the intelligence layer — AwardWallet/MaxRewards/Travel Freely all grew tracking-outward; we grow intelligence-outward.

---

## Locked Decisions (Do Not Revisit Without Explicit User Approval)

| Decision | Value | Rationale |
|---|---|---|
| **Pricing** | $9.99/mo or $99/yr | Churners pay $695 annual fees; price is a credibility signal |
| **Free trial** | 14 days | Industry standard for subscription apps |
| **Theme** | Light editorial (keep current) | Differentiates from dark-mode competitors; don't rebuild |
| **Tab structure** | Discover, Vault, Tracker, Settings | Four tabs; Calendar is not top-level |
| **Household setup** | First-run inside Tracker tab | Not onboarding — adds friction for solo users |
| **Spreadsheet import** | Build in Phase 1 | Day-one conversion for existing churners |
| **Bank integrations** | Never | Manual-first is a feature, not a limitation |
| **Data-in strategy** | Email forwarding + manual + CSV | GPT-4o-mini parses forwarded emails |
| **Concierge tab** | Removed | Cut from product scope |
| **cardscout.app** | Stays live | Free discovery tool, SEO funnel |
| **Affiliate links** | Added to free tier | Reverse prior decision; fund free tier |
| **Dark mode** | Deferred to Phase 10+ | Use existing tokens in `theme.ts` |
| **App Store submission** | After Phase 1 + onboarding | Current app not ready |
| **Target user** | Casual → churner funnel | Both served, conversion path intentional |
| **Household support** | 2+ members, not capped at 2 | Surpass Travel Freely |
| **Retention crowdsourcing** | Own users first, public scrapes later | Signal quality matters |
| **Chrome extension** | Phase 10+ | Not V1, banked for later |

---

## Tech Stack (Non-Negotiable)

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54, Expo Router v3 |
| Styling | NativeWind v4, Reanimated 3, Moti |
| Backend | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| AI | OpenAI gpt-4o (extraction), gpt-4o-mini (ingestion) |
| Billing | Stripe (Checkout + webhooks) |
| Email | Resend (transactional) + SendGrid Inbound Parse (forwarding) |
| Analytics | PostHog (10 key events) |
| Error monitoring | Sentry |
| Build | EAS Build (iOS/Android), Vercel (web) |
| Types | TypeScript strict, Zod, React Query |
| Testing | Vitest (unit), Playwright (E2E), QA Agent protocol (phase gate) |

---

## File Map (Cross-References)

| File | Purpose |
|---|---|
| `MASTER_PROGRESS_TRACKER.md` | **This file.** Phase plan + locked decisions |
| `PHASE_0_KICKOFF.md` | Claude Code brief for Phase 0 |
| `AUTOMATION_STRATEGY.md` | Data ingestion pipeline spec (Phase 0.5) |
| `QA_AGENT.md` | Phase-gate QA protocol |
| `QA_LAYER_1_UNIT_TESTS.md` | Vitest spec for velocity engine |
| `QA_LAYER_2_E2E_TESTS.md` | Playwright flows for CI |
| `UI_DESIGN_SYSTEM_PROMPT.md` | Storybook + component library brief |
| `UI_SCREENS_PROMPT.md` | Screen builds from primitives (post-system) |

---

## Phase 0 — Ship What Exists (2 weeks, must finish before any new features)

**Goal:** Current app on TestFlight with real payment flow. Kill all half-built surfaces.

- [ ] Wire Stripe end-to-end: Checkout session creation (Edge Function), webhook → `subscriptions` table, entitlement check in `useSubscription.ts`
- [ ] Create Stripe products: $9.99/mo and $99/yr with 14-day trial
- [ ] Expand `cards` catalog: 3 seeded → 20 most popular (Sapphire Preferred/Reserve, Amex Plat/Gold/Green, Venture X/Venture, Ink Preferred/Cash/Unlimited, Freedom Flex/Unlimited, Citi Strata Premier, Capital One Savor, Bilt, US Bank Altitude Reserve, Wells Fargo Autograph, BoA Premium Rewards, Chase Marriott Bonvoy Boundless, Amex Hilton Aspire, Chase United Explorer)
- [ ] Remove Concierge tab cleanly (delete files, remove nav entry, clean imports)
- [ ] Add Sentry for error monitoring
- [ ] Add PostHog with 10 events wired: `app_open`, `quiz_start`, `quiz_complete`, `calculator_used`, `signup`, `card_added`, `paywall_viewed`, `trial_started`, `subscription_created`, `churn`
- [ ] Onboarding flow: 3 screens (Find / Track / Optimize) with skip-to-Discover option
- [ ] Apple Sign In + Google Sign In alongside magic link
- [ ] Confirm app runs clean on `npx expo start --web`, iOS simulator, Android emulator
- [ ] EAS Build: iOS TestFlight submission
- [ ] EAS Build: Android internal track

**Acceptance criteria:** A TestFlight build where a user can complete onboarding → take the quiz → see results → tap "Start free trial" → Stripe checkout → return to app with active subscription → see Vault unlock. Sentry captures any errors. PostHog receives events.

**Phase gate:** Run QA Agent protocol (`QA_AGENT.md`). Fix all Sev 1 and Sev 2 issues before proceeding.

---

## Phase 0.5 — Automated Data Ingestion Pipeline (1.5 weeks)

**Goal:** The operating model that makes this side-project viable. See `AUTOMATION_STRATEGY.md` for full spec.

- [ ] New table: `data_proposals` (source, proposed_change JSONB, confidence_score, status, created_at, reviewed_at)
- [ ] Edge Function `ingest-doc`: weekly cron, scrapes Doctor of Credit best-bonuses page, GPT-4o-mini diffs against current catalog, writes proposals
- [ ] Edge Function `ingest-reddit`: daily cron, pulls r/CreditCards + r/churning new posts with Data Point/News flair, extracts structured data
- [ ] Edge Function `ingest-issuer-pages`: weekly cron, re-scrapes active cards in catalog, diffs benefits
- [ ] Edge Function `ingest-email`: SendGrid Inbound Parse webhook, receives user-forwarded emails (approval, bonus posted, fee reminder), routes to GPT-4o-mini for extraction
- [ ] Admin review screen at `/admin/proposals` (gated to user_id = Zubair): stack of proposal cards with approve/reject/edit
- [ ] Auto-apply rule: high-confidence proposals (>0.9) auto-apply after 24 hours if not rejected
- [ ] Weekly email summary: "N proposals pending review" sent Sunday night via Resend

**Acceptance criteria:** Monday morning, admin inbox shows 10-30 real proposals from DoC + Reddit from the past week. Approval takes <5 min. At least one auto-applied change visible in the catalog.

**Phase gate:** Run ingestion for one week on real data. Confirm signal-to-noise is acceptable. Tune confidence thresholds before proceeding.

---

## Phase 1 — Application Ledger UI + Household + CSV Import (2-3 weeks)

**Goal:** The spreadsheet, replaced. Primary screen for churners.

- [ ] `app/(tabs)/tracker/_layout.tsx` — sub-tabs: Ledger / Velocity / Portfolio / Fees
- [ ] `app/(tabs)/tracker/index.tsx` — ledger list view (the spreadsheet)
- [ ] `app/(tabs)/tracker/add.tsx` — add application form with smart prefill from catalog
- [ ] `app/(tabs)/tracker/[id].tsx` — view/edit single application
- [ ] Household first-run prompt: "Track a partner's cards too?" → name input or skip
- [ ] `hooks/useApplications.ts` — CRUD hooks
- [ ] `hooks/useHousehold.ts` — household member CRUD
- [ ] CSV import screen: upload → column mapping UI → preview → confirm
- [ ] Email forwarding setup screen: shows unique address + Gmail filter instructions
- [ ] Email-parsed applications land in ledger with "Auto-imported, review" badge

**Acceptance criteria:** Zubair imports his own spreadsheet via CSV. Halima is set up as household member. All 20+ historical applications visible. Ledger list is fast (<300ms render on 50 rows).

**Phase gate:** QA Agent runs full Ledger flow. Unit tests pass for CSV parse edge cases.

---

## Phase 2 — Velocity Dashboard (1-2 weeks)

**Goal:** Auto-calculated issuer rules. The headline paid feature.

- [ ] `lib/issuerRules.ts` — all rules as code constants: Chase 5/24 + 48-month Sapphire, Amex 1-in-90 + 2-in-90 + 4/5-credit-card rule + once-per-lifetime bonuses, Citi 8-day/65-day + 24-month bonus rule, Capital One 6-month, BofA 2/3/4, Discover once-per-lifetime, Barclays 6/24, US Bank 2/30
- [ ] `lib/velocityEngine.ts` — computes warnings from applications + rules
- [ ] `app/(tabs)/tracker/velocity.tsx` — per-issuer velocity cards
- [ ] Household view: see both members' velocity side-by-side
- [ ] Warnings UI: green (clear), amber (<30 days to clear), red (blocked)
- [ ] "Optimal next application" suggestion per household member

**Acceptance criteria:** Unit tests in `QA_LAYER_1_UNIT_TESTS.md` all pass. Zubair's real ledger produces velocity output he validates against his own mental model.

**Phase gate:** 80+ Vitest cases green. QA Agent runs velocity flow.

---

## Phase 3 — Bonus Spend Tracker (1 week)

**Goal:** Every active signup bonus gets a progress bar and a deadline.

- [ ] Spend progress UI on application detail screen
- [ ] Deadline countdown component
- [ ] Push notification at <30 days remaining
- [ ] Push notification at <7 days remaining
- [ ] "On pace? Need $X/day" calculation
- [ ] Mark bonus received flow (updates `bonus_achieved`, `bonus_achieved_at`)

**Acceptance criteria:** An active application with a bonus deadline shows a live progress bar. Notification fires at the right threshold in testing.

---

## Phase 4 — Points Portfolio (1 week)

**Goal:** "Your portfolio: $7,553." Emotional hook.

- [ ] `lib/pointValuations` — move CPP rates from TS constants to `points_valuations` DB table (source, updated_at, cpp_cents)
- [ ] `app/(tabs)/tracker/portfolio.tsx` — balances per currency + total $ value
- [ ] `hooks/usePointsBalances.ts` — CRUD
- [ ] Manual balance entry with last-updated timestamp
- [ ] Household total + per-member breakdown
- [ ] Email-parsed balance updates (when "You earned 50,000 points" emails are forwarded)

**Acceptance criteria:** Zubair enters real balances. Total dollar value renders. Updates propagate when a single balance changes.

---

## Phase 5 — Annual Fee Advisor + Retention Tracking (1.5 weeks)

**Goal:** 30-day advance warning + structured retention outcome logging.

- [ ] Annual fee timeline view: all open cards sorted by next fee due date
- [ ] 30-day advance push notification
- [ ] "Did you call retention?" prompt flow after fee posts
- [ ] Retention outcome logging (outcome type + points/credits offered + accepted)
- [ ] Pre-written retention scripts library (30 scripts, reviewed, tagged by issuer + situation)
- [ ] Downgrade path lookup table seeded (CSR→CSP→CFU, Amex Plat→Green→EveryDay, Venture X→Venture→VentureOne, etc.)
- [ ] Per-card net value calculation: benefits extracted YTD vs fee paid
- [ ] Keep/Call/Downgrade/Cancel recommendation

**Acceptance criteria:** Fee due notification fires 30 days out. Retention log captures real call. Scripts are copyable to clipboard.

---

## Phase 6 — Spend Optimizer (1.5 weeks)

**Goal:** "Which card right now?" MaxRewards' killer feature, tuned for churners.

- [ ] New table: `card_categories` (card_id, category, multiplier, cap, cap_period, expires_at)
- [ ] Seed card_categories for the 20 Phase 0 cards
- [ ] `app/(tabs)/vault/optimize.tsx` — category picker + optional amount → ranked cards by $ value earned
- [ ] Point valuation factored (not just raw earn rate)
- [ ] Cap tracking per card per category (Amex Gold dining $50k cap, etc.)
- [ ] Quarterly rotating categories handled (Freedom Flex, Discover It)

**Acceptance criteria:** At Costco, the app correctly recommends the card with highest $/point value factoring caps. Quarterly cards shown only when active.

---

## Phase 7 — Deal Passport V1 (1 week, piggybacks on Phase 0.5 pipeline)

**Goal:** Community-curated current bonus deals, personalized to user's held currencies.

- [ ] New table: `deal_passport` (title, issuer, card_id, bonus_amount, min_spend, expires_at, source_url, added_at, status)
- [ ] DoC + Reddit ingestion pipeline already populates proposals in Phase 0.5 — extend to write approved deals into this table
- [ ] `app/(tabs)/discover/deals.tsx` — deal feed filtered to user's held currencies
- [ ] Push notification when new deal posts for a currency user holds
- [ ] Free tier: see all deals. Paid tier: personalized filtering + alerts.

**Acceptance criteria:** Monday morning, Deal Passport shows 5+ real current bonuses from the past week's ingestion. Zubair sees only Chase UR + Amex MR deals unless he clears the filter.

---

## Phase 8 — Onboarding Refinement (1 week)

**Goal:** Show value before asking for account. Highest-leverage conversion screen.

- [ ] Screen 1: "What cards do you have?" — multi-select from top 30
- [ ] Screen 2: "You have $2,840/year in benefits." — instant value calculation
- [ ] Screen 3: Account creation (Apple + Google + email magic link)
- [ ] Screen 4: Notifications permission
- [ ] Screen 5: Paywall (if 3+ cards selected → show pro features with trial CTA; if <3 → "Start free")

**Acceptance criteria:** PostHog funnel shows >40% completion rate onboarding → account created.

---

## Phase 9 — Desktop Layout (2 weeks)

**Goal:** Two-column layouts on wide browsers. Parity with mobile feature set.

- [ ] Results page: filter sidebar left + card list right
- [ ] Vault: two-column card grid
- [ ] Tracker: ledger table view
- [ ] Insights: dashboard grid
- [ ] PaywallModal: centered dialog on desktop, bottom sheet on mobile
- [ ] Hover states on all interactive elements
- [ ] Keyboard shortcuts (power user feature)

**Acceptance criteria:** DevToggle set to DSK renders correctly. Real desktop browser (>1280px) feels native.

---

## Phase 10 — Polish + Launch (2 weeks)

**Goal:** Ship to App Store / Play Store.

- [ ] Card art (150+ PNGs from cc-recommender assets migrated)
- [ ] Reanimated 3 / Moti spring physics on key transitions
- [ ] iOS home screen widget (5/24 counter)
- [ ] Dark mode toggle (tokens already in theme.ts)
- [ ] Full accessibility pass (VoiceOver, dynamic type)
- [ ] App Store screenshots (6.7" + 6.1" + iPad + Android)
- [ ] App Store / Play Store submission
- [ ] Launch email to waitlist
- [ ] Reddit / Twitter / churning community launch posts

**Acceptance criteria:** Live on both stores. First 50 organic signups.

---

## Phase 11 — Crowdsourced Intelligence (ongoing, starts Phase 5+)

**Goal:** The compounding moat. Aggregate own users' retention data → "people are currently getting 30k MR on Amex Plat retention."

- [ ] Opt-in flag in settings: "Help others by sharing anonymous retention outcomes"
- [ ] Aggregation job: nightly cron, produces `retention_benchmarks` table (issuer, card_id, outcome_type, median_offer, p25, p75, sample_size, window_start, window_end)
- [ ] Minimum sample size gate (10+ reports) before showing benchmark
- [ ] Display in Annual Fee Advisor: "Similar users got a median 25k MR offer in the last 90 days"
- [ ] Deal Passport integration: retention-specific deals surfaced
- [ ] Public benchmarks page on cardscout.app (SEO play)

**Acceptance criteria:** First benchmark hits minimum sample size and renders in app. Public page indexed by Google.

---

## Cross-Phase: QA Protocol

Every phase ends with a QA gate. See `QA_AGENT.md`.

| Layer | Frequency | Tool |
|---|---|---|
| 1 — Unit | Every commit | Vitest in CI |
| 2 — E2E | Every PR | Playwright in GitHub Actions |
| 3 — Agent | Every phase close | Claude Code session with `QA_AGENT.md` |
| Production | Continuous | Sentry + PostHog + LogRocket |

---

## Cross-Phase: Agent Orchestration Rules

1. Every session starts by reading `MASTER_PROGRESS_TRACKER.md` + `AGENT_HANDOFF.md` + most recent conversation log
2. Every session ends by updating `AGENT_HANDOFF.md` with what was built + what's blocked
3. One agent per phase, not per feature
4. Parallel agents only when work is genuinely independent (zero file overlap)
5. No agent invents decisions — if a fork isn't in the locked decisions table, stop and ask
6. Phase checkboxes are the only way to mark progress. No "done" in prose without a box checked.

---

## Deferred / Explicitly Out of Scope (Do Not Build)

- Plaid or any bank account integration
- Offer auto-activation (MaxRewards' moat, not ours)
- Shopping portal / Kudos Boost-style cashback partnerships
- Scraping loyalty account balances (AwardWallet's rot zone)
- AI-generated dynamic retention scripts (use static library)
- Family sharing beyond household tracker
- Browser extension (Phase 10+, not now)
- Android-specific features not on iOS

---

## Revision Log

| Date | Version | Change |
|---|---|---|
| 2026-04-19 | 2.0 | Full rewrite. Locked pricing $9.99/$99, no-integrations, email forwarding, automation pipeline, 4-tab structure, crowdsourced retention, Phase 0.5 added |
| (prior) | 1.x | See `PROGRESS_TRACKER.md` (deprecated) |
