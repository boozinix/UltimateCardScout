# Agent Master Plan — CardScout UnifiedApp
**Created:** 2026-04-19
**Status:** Ready for execution

This document orchestrates all build and QA agents. Each agent has its own handoff file in this directory. Agents execute sequentially unless marked as parallelizable.

---

## Agent Roster

### Build Agents

| Agent | File | Phase | What It Builds | Duration |
|---|---|---|---|---|
| **B1** | `B1_FOUNDATION.md` | Phase 0 | Stripe, 20 cards, cleanup, onboarding, auth, Sentry, PostHog, TestFlight | 2 weeks |
| **B2** | `B2_LEDGER_DATA.md` | Phase 1a | Schema migrations (7 new tables), hooks, types, CSV parser | 3-4 days |
| **B3** | `B3_LEDGER_UI.md` | Phase 1b | Intelligence hub, ledger screens, add form, household setup, core primitives | 1-1.5 weeks |
| **B4** | `B4_VELOCITY.md` | Phase 2 | 14 issuer rules, velocity engine, dashboard screen, ~120 unit tests | 1.5-2 weeks |
| **B5** | `B5_SPEND_PORTFOLIO.md` | Phase 3+4 | Bonus spend tracker, points portfolio, push notifications | 1.5 weeks |
| **B6** | `B6_ADVISOR_OPTIMIZER.md` | Phase 5+6 | Annual fee advisor, retention scripts, downgrade paths, spend optimizer | 2 weeks |
| **B7** | `B7_AUTOMATION_DEALS.md` | Phase 7+8 | Automation pipeline, email forwarding, admin review, deal passport | 2-2.5 weeks |
| **B8** | `B8_POLISH_LAUNCH.md` | Phase 9-12 | Onboarding v2, desktop layouts, dark mode, card art, App Store | 3-4 weeks |

### QA Agents

| Agent | File | Runs After | What It Tests |
|---|---|---|---|
| **QA1** | `QA1_FOUNDATION.md` | B1 | Smoke tests, auth, Stripe checkout, tab navigation, paywall gates |
| **QA2** | `QA2_LEDGER.md` | B2 + B3 | Ledger CRUD, CSV import, household setup, empty states |
| **QA3** | `QA3_VELOCITY.md` | B4 | All 14 issuer rules, ~120 unit test verification, cross-rule scenarios |
| **QA4** | `QA4_FEATURES.md` | B5 + B6 | Spend tracker, portfolio math, fee advisor logic, spend optimizer ranking |
| **QA5** | `QA5_PRELAUNCH.md` | B7 + B8 | Full regression, accessibility, performance, App Store readiness |

---

## Execution Order & Dependencies

```
B1 (Foundation)
 │
 ├──▶ QA1
 │
 ▼
B2 (Ledger Data Layer)
 │
 ▼
B3 (Ledger UI) ──▶ QA2
 │
 ▼
B4 (Velocity Engine) ──▶ QA3
 │
 ├──▶ B5 (Spend + Portfolio) ─┐
 │                              ├──▶ QA4
 └──▶ B6 (Advisor + Optimizer) ┘
      │
      ▼
      B7 (Automation + Deals)
      │
      ▼
      B8 (Polish + Launch) ──▶ QA5
```

### Parallelization Opportunities

| Can run in parallel | Why |
|---|---|
| B5 + B6 | Zero file overlap. B5 touches spend/portfolio screens. B6 touches fee/optimizer screens. Both depend on B4 completing. |
| QA1 runs while B2 starts | QA1 tests Phase 0 output. B2 starts new schema work. No overlap. |
| QA3 runs while B5/B6 start | QA3 tests velocity engine. B5/B6 build on top of it. If QA3 finds bugs, B5/B6 pause. |

### Sequential (must not parallelize)

| Sequence | Why |
|---|---|
| B1 → B2 → B3 | Each depends on prior work. B2 needs Stripe + catalog from B1. B3 needs hooks from B2. |
| B3 → B4 | Velocity engine needs ledger data and application types. |
| B6 → B7 | Automation pipeline populates tables that B6 creates. |
| B7 → B8 | Launch requires automation to be working. |

---

## How to Run an Agent

### Starting a build agent:

```
Read agents/AGENT_MASTER_PLAN.md first.
Then read agents/B[N]_[NAME].md for the specific agent.
Then read AGENT_HANDOFF.md for current project state.
Execute all tasks in the agent's handoff file.
When done, update AGENT_HANDOFF.md with what was built.
```

### Starting a QA agent:

```
Read agents/AGENT_MASTER_PLAN.md first.
Then read agents/QA[N]_[NAME].md for the specific QA agent.
Run through every test flow.
Report results in the format specified.
Do NOT fix anything — report only.
```

---

## Agent Rules (apply to ALL agents)

1. **Read your handoff file completely before writing any code.**
2. **One agent, one scope.** Do not build features from another agent's scope.
3. **Do not invent decisions.** If something isn't in `DECISIONS_NEEDED.md` or `AGENT_HANDOFF.md`, stop and ask.
4. **Do not commit to git unless explicitly told.**
5. **Do not deploy unless explicitly told.**
6. **Update `AGENT_HANDOFF.md` at session end** with: what was built, what's blocked, what the next agent should know.
7. **Theme tokens from `lib/theme.ts` only.** Never hardcode colors.
8. **`npm install --legacy-peer-deps`** always (lucide-react-native peer conflict).
9. **API keys in `.env.local` only.** Never in code, never committed.
10. **Keep `GIT_TRACKER.csv` updated** when commits happen.

---

## File Map (what each agent creates)

### B1 creates:
```
app/(auth)/login.tsx           — updated (Apple + Google buttons)
app/onboarding/index.tsx       — NEW (3-screen onboarding)
supabase/functions/create-checkout/   — updated (real Stripe)
supabase/functions/stripe-webhook/    — updated (real webhook handling)
hooks/useSubscription.ts              — updated (real entitlement check)
lib/subscription.ts                   — updated ($8/mo pricing)
data/cards.csv                        — updated (20 cards)
public/cards.csv                      — updated (copy of above)
```

### B2 creates:
```
supabase/migrations/002_extra_tables.sql    — 7 new tables
lib/applicationTypes.ts                      — updated with new types
hooks/useApplications.ts                     — NEW (CRUD)
hooks/useHousehold.ts                        — NEW (household CRUD)
hooks/usePointsBalances.ts                   — NEW (portfolio CRUD)
lib/csvParser.ts                             — NEW (CSV import logic)
```

### B3 creates:
```
app/(tabs)/intelligence/index.tsx       — hub screen
app/(tabs)/intelligence/ledger.tsx      — ledger list
app/(tabs)/intelligence/add.tsx         — add application form
app/(tabs)/intelligence/[id].tsx        — application detail/edit
app/(tabs)/intelligence/csv-import.tsx  — CSV import screen
components/primitives/Text.tsx          — NEW
components/primitives/Button.tsx        — NEW
components/primitives/Input.tsx         — NEW
components/primitives/Surface.tsx       — NEW
components/primitives/Badge.tsx         — NEW
components/composed/ListItem.tsx        — NEW
components/composed/StatCard.tsx        — NEW
components/composed/ProgressBar.tsx     — NEW
components/composed/EmptyState.tsx      — NEW
components/composed/FilterChip.tsx      — NEW
```

### B4 creates:
```
lib/issuerRules.ts                          — NEW (14 rules)
lib/velocityEngine.ts                       — NEW (computation engine)
app/(tabs)/intelligence/velocity.tsx        — NEW (dashboard screen)
components/composed/IssuerVelocityCard.tsx   — NEW
__tests__/velocityEngine.test.ts            — NEW (~120 tests)
__tests__/helpers/fixtures.ts               — NEW (test helpers)
```

### B5 creates:
```
app/(tabs)/intelligence/portfolio.tsx   — NEW (points portfolio)
components/composed/SpendProgress.tsx   — NEW (bonus progress bar)
lib/pointValuations.ts                  — NEW (fetches from DB)
```

### B6 creates:
```
app/(tabs)/intelligence/fee-advisor.tsx — NEW
app/(tabs)/intelligence/spend.tsx       — NEW (spend optimizer)
components/composed/RetentionCard.tsx   — NEW
supabase/seed-retention-scripts.sql     — NEW (30 curated scripts)
supabase/seed-downgrade-paths.sql       — NEW (static data)
supabase/seed-card-categories.sql       — NEW (20 cards × categories)
```

### B7 creates:
```
supabase/functions/ingest-doc/          — NEW (DoC scraper)
supabase/functions/ingest-reddit/       — NEW (Reddit scraper)
supabase/functions/ingest-email/        — NEW (email forwarding)
app/admin/proposals.tsx                 — NEW (review queue)
app/(tabs)/intelligence/deals.tsx       — NEW (deal passport)
app/(tabs)/settings/email-import.tsx    — NEW (forwarding setup)
```

### B8 creates:
```
app/onboarding/                         — updated (value-first flow)
app/(tabs)/**                           — updated (desktop layouts)
contexts/ThemeContext.tsx                — updated (dark mode toggle)
components/composed/CardArt.tsx         — NEW
```

---

## Estimated Total Timeline

| Scenario | Duration |
|---|---|
| Sequential (no parallelization) | ~16-20 weeks |
| With B5+B6 parallel | ~14-18 weeks |
| Aggressive (max parallel, no blockers) | ~12-15 weeks |

These are development-time estimates. Doesn't include user setup tasks (Supabase project, Stripe products, Apple Developer config, etc.).

---

## Critical Path

The longest chain determines ship date:

```
B1 (2w) → B2 (4d) → B3 (1.5w) → B4 (2w) → B6 (2w) → B7 (2.5w) → B8 (4w)
= ~14.5 weeks on the critical path
```

B5 runs parallel to B6 and is NOT on the critical path.

---

## Handoff Protocol

When an agent completes:

1. Update `AGENT_HANDOFF.md` "What Is Complete" section
2. Update `PROGRESS_TRACKER.md` checkboxes
3. Note any bugs, gotchas, or warnings for the next agent
4. List any blocked items that need user action
5. Trigger the corresponding QA agent

When a QA agent finds issues:

1. Sev 1/2: Block next build agent until fixed
2. Sev 3: Log to backlog, next agent can proceed
3. QA agent does NOT fix bugs — it reports them
4. A fix agent (the original build agent, re-run) handles fixes
