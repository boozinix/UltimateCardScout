# Decisions — ALL LOCKED
**Created:** 2026-04-19
**Status:** All decisions answered. Ready to merge into master plan.

---

## All Locked Decisions

| # | Decision | Answer | Source |
|---|---|---|---|
| 1 | Theme | **Light.** Dark is V2. | User |
| 2 | Navigation | **4 tabs: Discover, Vault, Intelligence, Settings** | User |
| 3 | Pricing | **$8/mo.** Annual TBD. Can change anytime. | User |
| 4 | Date precision | **Month ('YYYY-MM')** | User |
| 5 | Guardrails | All 5 adopted (see below) | User |
| 6 | Issuer rules storage | **TypeScript constants.** Adopt Opus's expanded rule set. | Claude recommendation |
| 7 | Home dashboard | **No dedicated tab.** Intelligence hub serves as dashboard. Demo both layouts during build so user can compare. | User + Claude |
| 8 | Extra DB tables | **All 7 tables.** Create them now, populate as features ship. | Claude recommendation |
| 9 | QA infrastructure | **Not now.** Unit tests at Phase 2 (velocity engine). E2E + QA Agent closer to App Store. | Claude recommendation |
| 10 | Design system phase | **No dedicated phase.** Build 5-6 core primitives alongside Phase 1 screens. | Claude recommendation |
| 11 | Automation pipeline | **Later.** Not Phase 0.5. Build after Phase 1. | User |
| 12 | Email forwarding | **Yes, build it.** After Phase 1 (since automation is later). | User |
| 13 | Spreadsheet import | **Both CSV + NL chatbot.** CSV for bulk import. NL chatbot for ongoing single entries. Overrides prior "NL only" lock. | User + Claude |
| 14 | Tab 3 name | **"Intelligence"** (not Tracker) | User |
| 15 | Affiliate links | **No.** Raw issuer URLs. Add affiliate layer later. | User |
| 16 | Household member limit | **Cap at 4.** Default names from Schitt's Creek: Johnny, Moira, David, Alexis. | User |

---

## Detail: Guardrails (Decision #5)

1. **No Plaid / no bank logins.** All data manual. Market as privacy feature.
2. **AI advice must be quality-controlled.** Not "no AI" — it's "no regurgitated bullshit." Retention scripts are a curated static library. AI can parse/extract, but user-facing advice must be vetted.
3. **No sponsored rankings.** Cards ranked by fit only.
4. **Automated ingestion, human-approved writes.** Pipeline pulls weekly, you review and approve. Execute on approval.
5. **Separate test database.** Never test against production.

---

## Detail: Issuer Rules (Decision #6)

TypeScript constants in `lib/issuerRules.ts`. Adopt the expanded rule set from Claude Opus:

| Rule | Issuer | Notes |
|---|---|---|
| 5/24 | Chase | Personal cards only (any issuer). Citi/US Bank biz cards DO count. |
| 48-month Sapphire | Chase | Cross-product (CSR bonus blocks CSP and vice versa) |
| 1-in-90 (credit) | Amex | Credit cards only. Charge cards exempt. |
| 2-in-90 (credit) | Amex | Hard limit on credit cards |
| 4/5 credit card limit | Amex | Open credit cards cap. Charge cards don't count. |
| Once-per-lifetime | Amex | Per card family. Biz/Personal separate. |
| 8-day rule | Citi | Personal only |
| 65-day rule | Citi | Personal only |
| 24-month bonus rule | Citi | max(bonus_date, closed_date) + 24 months |
| 6-month rule | Capital One | Personal only, soft rule |
| 2/3/4 rule | BofA | 2 in 2 months, 3 in 12, 4 in 24. Biz counts. |
| Once-per-lifetime | Discover | Discover IT specifically |
| 6/24 | Barclays | Total cards (includes biz) |
| 2/30 | US Bank | 2 cards in 30-day window |

---

## Detail: Extra DB Tables (Decision #8)

All 7 approved. Create in new migration files:

1. `card_name_override text` field on `applications` — for cards not in catalog
2. `points_valuations` table — CPP values in DB (program, cpp, source, updated_at)
3. `card_categories` table — bonus multipliers (card_id, category, multiplier, cap, expires)
4. `downgrade_paths` table — static data (from_card_id, to_card_id, notes, issuer)
5. `retention_scripts` table — curated scripts (issuer, situation, script_text)
6. `deal_passport` table — deal feed (title, type, program, bonus_pct, expiry, source_url)
7. `data_proposals` table — automation staging (source, proposed_change jsonb, confidence, status)

---

## Detail: Household (Decision #16)

Cap at 4 members. Default placeholder names (Schitt's Creek):
- **Johnny** (primary)
- **Moira** (partner)
- **David** (member 3)
- **Alexis** (member 4)

Users replace with their own names. For Zubair's household: Zubair (primary) + Halima (partner).

---

## Revised Phase Order

Based on all decisions:

```
Phase 0 — Ship What Exists
  Wire Stripe ($8/mo + annual TBD, 14-day trial)
  Expand catalog to 20 cards
  Remove Concierge cleanly
  Simple onboarding (3 screens)
  Apple + Google Sign In
  Sentry + PostHog
  Verify all platforms
  TestFlight submission

Phase 1 — Application Ledger UI + CSV Import
  Intelligence tab hub screen
  Household setup (first-run, cap at 4)
  Add application form (with catalog prefill)
  Ledger list view
  Application detail/edit
  CSV import with column mapping
  NL chatbot for single entries
  hooks/useApplications.ts + hooks/useHousehold.ts
  Build 5-6 core primitives alongside screens

Phase 2 — Velocity Dashboard + Unit Tests
  lib/issuerRules.ts (all 14 rules)
  lib/velocityEngine.ts
  Velocity dashboard screen (per-issuer cards)
  Vitest unit tests (~120 cases)
  Household side-by-side velocity view

Phase 3 — Bonus Spend Tracker
  Spend progress UI on application detail
  Deadline countdown + progress bar
  Push notification at <30 and <7 days

Phase 4 — Points Portfolio
  points_valuations table populated
  Portfolio screen (balances + total $ value)
  hooks/usePointsBalances.ts
  Household total + per-member breakdown

Phase 5 — Annual Fee Advisor + Retention
  Annual fee timeline
  30-day advance notification
  Retention prompt flow
  Retention scripts library (curated, from DB)
  Downgrade paths populated
  Keep/Call/Downgrade/Cancel recommendation

Phase 6 — Spend Optimizer
  card_categories table populated (20 cards)
  "Which card right now?" screen
  Category picker + ranked results

Phase 7 — Automation Pipeline + Email Forwarding
  data_proposals table + admin review screen
  Edge Function: ingest-doc (weekly DoC scraper)
  Edge Function: ingest-reddit (daily)
  Email forwarding (SendGrid Inbound Parse)
  Weekly summary email
  Auto-apply for high-confidence proposals

Phase 8 — Deal Passport V1
  deal_passport table populated from pipeline
  Deal feed screen (personalized to held currencies)
  Push notification for new deals

Phase 9 — Onboarding Refinement
  "What cards do you have?" multi-select
  Instant value calculation
  Auth prompt
  Pro upsell

Phase 10 — Desktop Layout
  Two-column layouts
  PaywallModal → centered dialog
  Hover states

Phase 11 — Polish + App Store
  Card art
  Animations (Reanimated 3)
  Dark mode toggle (V2)
  App Store / Play Store submission

Phase 12 — Crowdsourced Intelligence
  Opt-in retention data sharing
  Aggregate benchmarks
  Public benchmarks on cardscout.app (SEO)
```

---

## Previously Locked (from last session, still valid)

| Decision | Choice |
|---|---|
| Concierge tab | REMOVED |
| cardscout.app | Stays live as free discovery site |
| Freemium model | Free = discovery + basic vault. Paid = Intelligence features |
| App Store timing | After Phase 1 + onboarding |
| AI usage | GPT-4o-mini, server-side, user-triggered, cached |
| Free ledger limit | Unlimited history viewing free. Paid = intelligence + alerts |
