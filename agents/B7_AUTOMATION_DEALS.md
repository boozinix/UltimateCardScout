# Build Agent B7 — Automation Pipeline + Deal Passport
**Phase:** 7 + 8
**Duration:** 2-2.5 weeks
**Depends on:** B6 (advisor + optimizer complete)
**Blocks:** B8, QA5

---

## Read These First

1. `agents/AGENT_MASTER_PLAN.md`
2. `AGENT_HANDOFF.md`
3. `DECISIONS_NEEDED.md` — guardrails (automated ingestion, human-approved writes)
4. `supabase/migrations/002_extra_tables.sql` — data_proposals, deal_passport tables
5. `external_plans_Docs/claude_opus/AUTOMATION_STRATEGY.md` — detailed pipeline spec (reference only, adapt to our decisions)

---

## What You're Building

The operating model that makes a solo side-project viable:
1. **Automation pipeline** — scrapers that pull data weekly, stage it for review
2. **Admin review screen** — Zubair approves/rejects proposals in <5 minutes weekly
3. **Email forwarding** — users forward card emails, GPT parses them
4. **Deal Passport** — personalized deal feed from approved pipeline data

---

## Locked Decisions

| Decision | Value |
|---|---|
| Guardrail | Automated ingestion, human-approved writes |
| Review cadence | Weekly |
| Auto-apply | High confidence (>0.9) auto-applies after 24 hours if not rejected |
| AI for parsing | GPT-4o-mini for extraction, never for advice |
| Email forwarding | Yes, build it |

---

## Part 1: Data Proposals Pipeline (4-5 days)

### Edge Function: `ingest-doc` (Doctor of Credit)

Create `supabase/functions/ingest-doc/index.ts`:
- **Schedule:** Weekly cron, Mondays 6am PT
- Fetches DoC best-bonuses page
- GPT-4o-mini extracts card bonus data
- Diffs against current `cards` catalog
- Writes to `data_proposals` with confidence score
- New cards: confidence 0.75 (always manual review)
- Bonus amount changes: confidence 0.95 (auto-apply pending)
- Fee changes: confidence 0.92 (auto-apply pending)
- Dedupe via `source_fingerprint`

### Edge Function: `ingest-reddit`

Create `supabase/functions/ingest-reddit/index.ts`:
- **Schedule:** Daily 7am PT
- Reddit public JSON API (no auth needed)
- Sources: r/CreditCards (flair: Data Point/News, >20 upvotes), r/churning (flair: Data Point/Discussion, >15 upvotes)
- GPT-4o-mini classifies: transfer bonus, elevated signup, rule change, new card, retention data point, or irrelevant
- Irrelevant posts → skip
- Relevant → write to `data_proposals` with confidence 0.65 (always manual review)
- Reddit is signal, not source of truth
- User-Agent: `CardScout/1.0`

### Auto-Apply Cron

Create `supabase/functions/auto-apply/index.ts`:
- **Schedule:** Hourly
- Queries `data_proposals WHERE status = 'auto_apply_pending' AND auto_apply_after < now()`
- Applies proposed changes to target table
- Updates `status = 'auto_applied'`, sets `applied_at`
- Retention data → NEVER auto-apply regardless of confidence

### Weekly Summary Email

Create `supabase/functions/weekly-summary/index.ts`:
- **Schedule:** Sunday 9pm PT
- Sends via Resend to `ADMIN_EMAIL`
- Subject: "CardScout: N proposals need review"
- Body: summary table + direct link to admin UI
- Breakdown: X auto-applied this week, Y pending review

---

## Part 2: Admin Review Screen (2-3 days)

Create `app/admin/proposals.tsx`:

**Gated to admin user only.** Server-side check: `if (user.id !== ADMIN_USER_ID) return 403`.

UI: Stack of proposal cards (Tinder-style, one at a time):

```
┌─────────────────────────────────┐
│ Proposal #14 of 23              │
│ Source: Doctor of Credit         │
│ Type: Bonus change               │
│ Card: Chase Sapphire Preferred   │
│ Confidence: 0.95                 │
│ Auto-applies in 8h               │
│                                  │
│ Changes:                         │
│ ┌──────────┬────────┬────────┐  │
│ │ Field    │Current │Proposed│  │
│ │ bonus    │ 60,000 │ 75,000 │  │
│ │ min_spend│ $4,000 │ $5,000 │  │
│ └──────────┴────────┴────────┘  │
│                                  │
│ View source → (opens DoC page)   │
│                                  │
│ [Reject]  [Edit]  [Approve]      │
└─────────────────────────────────┘
```

Features:
- Approve → applies to target table, advances to next
- Reject → marks rejected, advances
- Edit → opens form with proposed values prefilled, save applies
- View source → opens source_url in browser
- Bulk action: "Approve all high-confidence DoC proposals"
- Filter by: source type, proposal type, confidence range, status
- Empty state: "All clear. Nothing to review."

---

## Part 3: Email Forwarding (3-4 days)

### User Email Alias Setup

Create `app/(tabs)/settings/email-import.tsx`:

1. Generate unique address: `u_[8-char-hex]@in.cardscout.app`
2. Store in new `user_email_aliases` table (add to migration)
3. Display with copy button
4. Gmail filter instructions:
   - From: `chase.com OR americanexpress.com OR citi.com OR capitalone.com OR discover.com`
   - Forward to: `u_abc123@in.cardscout.app`
5. Copy button for filter rule
6. Stats: emails received, auto-applied, pending, last received
7. Regenerate alias button

### Edge Function: `ingest-email`

Create `supabase/functions/ingest-email/index.ts`:

- Webhook receiver (SendGrid Inbound Parse)
- Resolve user from alias
- Whitelist check: only process from known issuer domains
- GPT-4o-mini classifies: application_approved, application_denied, bonus_achieved, fee_reminder, retention_offer, balance_update, statement, other
- `other` or low confidence → drop silently
- Creates `data_proposals` row scoped to user (not global)
- High confidence (>0.85) → auto-apply pending
- Rate limit: 20 emails per alias per hour

### Migration Addition

Add to migration or create `003_email_aliases.sql`:

```sql
CREATE TABLE IF NOT EXISTS user_email_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  alias text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_email_aliases ENABLE ROW LEVEL SECURITY;
```

**Note:** SendGrid Inbound Parse setup (MX records, webhook URL) is a user action item. Document in `USER_ACTION_ITEMS.md`.

---

## Part 4: Deal Passport (3-4 days)

Create `app/(tabs)/intelligence/deals.tsx`:

```
┌─────────────────────────────────┐
│ Deal Passport                    │
│ Relevant to your wallet          │
│                                  │
│ ── FOR YOUR WALLET ──            │
│                                  │
│ 🔥 LIVE · 28 days left           │
│ Chase UR → Hyatt +30%            │
│ You hold 247,000 UR              │
│ Value added: +$1,111             │
│ [Learn More →]                   │
│                                  │
│ 📈 ELEVATED · Ends Sunday        │
│ Chase Sapphire Preferred          │
│ 80,000 UR · normally 60,000      │
│ ✓ You're bonus-eligible           │
│ [View Card →]                    │
│                                  │
│ ── OTHER DEALS ──                │
│ 5 deals for cards you don't hold │
│ [Expand ▾]                       │
└─────────────────────────────────┘
```

Features:
- Personalized: show deals for currencies user holds first
- "For your wallet" vs "Other deals" sections
- Deal types: transfer bonus, elevated signup, limited offer, community report
- Each deal: title, description, expiry countdown, source link
- Velocity check: if user is eligible per velocity engine, show green badge
- Free tier: see all deals. Pro: personalized filtering + alerts
- Data from `deal_passport` table (populated by pipeline + manual admin entry)

### Manual Deal Entry

For V1, Zubair manually inserts deals via admin or direct DB insert. Pipeline (DoC + Reddit) will auto-propose deals later once running.

---

## Hard Rules

1. **NO automated writes to production tables.** Everything goes to `data_proposals` first.
2. Admin screen gated by `ADMIN_USER_ID` — non-admin gets hard 403.
3. Reddit confidence default is 0.65 — always manual review.
4. Retention data proposals → NEVER auto-apply.
5. Email forwarding: only process from whitelisted issuer domains.
6. Rate limit email processing: 20/hour per alias.
7. GPT calls are extraction only, never advice generation.

---

## When Done

1. DoC scraper writes proposals to `data_proposals`
2. Reddit scraper writes proposals
3. Admin review screen works with approve/reject/edit
4. Email forwarding setup screen exists
5. Email processing pipeline creates proposals
6. Deal passport shows deals personalized to user's currencies
7. Weekly summary email sends
8. Update `AGENT_HANDOFF.md` and `PROGRESS_TRACKER.md`
