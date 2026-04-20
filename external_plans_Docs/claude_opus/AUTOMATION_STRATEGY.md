# Automation Strategy — The Operating Model

> **Target:** Phase 0.5 — runs after Phase 0 ships, before Phase 1 starts.
> **Duration:** 1.5 weeks.
> **Why this matters:** This is the single most important architectural decision in the project. CardScout is a solo side project. Every competitor (AwardWallet, MaxRewards, Travel Freely) has humans maintaining data. You cannot. Automation isn't a nice-to-have — it's your entire operating model.

---

## Philosophy

A 5-person team at MaxRewards hires people to research card changes, verify bonuses, update benefit lists. You're one person with Claude, GPT-4o-mini, and scheduled edge functions. The math works *only if* the pipeline is disciplined.

Three principles that govern every decision below:

**Review queue, never direct-to-production.** No scraper writes directly to the live `cards` or `benefits` tables. Everything lands in `data_proposals` first, with a confidence score and source URL. You approve 10-30 proposals a week. Takes 5 minutes. The queue is the control plane.

**High-confidence auto-apply, low-confidence stays pending.** If a proposal scores >0.9 confidence and you don't reject it within 24 hours, it auto-applies. Below 0.9, it waits. This means routine DoC updates flow through without you, but edge cases get human judgment.

**Source provenance on every change.** Every row in `cards`, `benefits`, or `deal_passport` has a `source_url` and `last_verified_at`. If you ever need to know why the data says what it says, you have the receipt.

---

## Architecture

```
Data Sources                   Pipeline                          Review                     Production
────────────                   ────────                          ──────                     ──────────
Doctor of Credit       ──┐
Reddit (r/churning,      │
  r/CreditCards)         │ ──▶  Edge Functions         ──▶  data_proposals       ──▶  cards
Issuer pages             │       (ingest-doc,                   table                    benefits
  (direct re-scrape)     │        ingest-reddit,                                          deal_passport
User-forwarded emails    │        ingest-issuer-pages,                                    points_valuations
  (SendGrid Inbound)     │        ingest-email)               Admin review UI
                         │                                    at /admin/proposals
                         └──▶  All write with:
                                - source_url
                                - proposed_change (JSONB)
                                - confidence_score (0-1)
                                - status (pending/approved/rejected/auto_applied)
```

---

## Database Schema (Migration `002_data_proposals.sql`)

```sql
CREATE TABLE data_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN (
    'doc_scraper', 'reddit_scraper', 'issuer_rescrape', 
    'email_forward', 'user_submission', 'manual'
  )),
  source_url text,
  source_fingerprint text,  -- dedupe key (URL + post ID, etc.)
  proposal_type text NOT NULL CHECK (proposal_type IN (
    'new_card', 'update_card', 'new_benefit', 'update_benefit',
    'new_deal', 'retention_datapoint', 'bonus_change', 'fee_change',
    'balance_update', 'application_detected'
  )),
  target_table text,         -- e.g. 'cards', 'benefits', 'deal_passport'
  target_row_id uuid,        -- existing row being updated (NULL for new)
  proposed_change jsonb NOT NULL,
  current_value jsonb,       -- what's in the DB now (for diff display)
  confidence_score numeric(3,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'auto_applied', 'auto_apply_pending', 'duplicate'
  )),
  reviewer_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  auto_apply_after timestamptz,  -- if status = auto_apply_pending, this is the cutoff
  applied_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_proposals_status ON data_proposals(status);
CREATE INDEX idx_proposals_source ON data_proposals(source_type, created_at DESC);
CREATE INDEX idx_proposals_fingerprint ON data_proposals(source_fingerprint);

-- RLS: only admin user (Zubair) can read/write
ALTER TABLE data_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only" ON data_proposals FOR ALL 
  USING (auth.uid() = 'YOUR_ADMIN_UUID'::uuid);
```

Source provenance fields on every production table:

```sql
ALTER TABLE cards ADD COLUMN source_url text;
ALTER TABLE cards ADD COLUMN last_verified_at timestamptz;
ALTER TABLE cards ADD COLUMN last_proposal_id uuid REFERENCES data_proposals(id);

ALTER TABLE benefits ADD COLUMN source_url text;
ALTER TABLE benefits ADD COLUMN last_verified_at timestamptz;

-- Apply same pattern to deal_passport, points_valuations when those tables exist
```

---

## Scraper 1 — Doctor of Credit (`ingest-doc`)

**Source:** https://www.doctorofcredit.com/best-current-credit-card-sign-up-bonuses/

**Schedule:** Weekly cron, Mondays at 6am PT.

**Why this source:** DoC maintains the single most comprehensive current-bonus list on the internet. Updated by humans who catch things 24-48 hours after they change. Free.

**Implementation:**

```ts
// supabase/functions/ingest-doc/index.ts (pseudocode)

export async function handler() {
  const html = await fetch('https://www.doctorofcredit.com/best-current-credit-card-sign-up-bonuses/').then(r => r.text());
  
  // Extract the main bonus table — DoC has consistent structure
  const rows = parseHtmlTable(html, 'best-bonuses-table');
  
  // Fetch current catalog for diff
  const currentCards = await supabase.from('cards').select('*');
  
  for (const row of rows) {
    const extracted = await gptExtract(row, {
      schema: {
        card_name: 'string',
        issuer: 'string',
        bonus_amount: 'number',
        bonus_currency: 'string',
        min_spend: 'number',
        spend_window_months: 'number',
        annual_fee: 'number',
        offer_url: 'string',
        notes: 'string'
      },
      model: 'gpt-4o-mini',
      temperature: 0
    });
    
    // Match against current catalog by name + issuer
    const match = fuzzyMatch(extracted, currentCards);
    
    if (!match) {
      // New card not in catalog
      await createProposal({
        source_type: 'doc_scraper',
        source_url: 'https://www.doctorofcredit.com/...',
        source_fingerprint: `doc-${extracted.card_name}-${extracted.bonus_amount}`,
        proposal_type: 'new_card',
        target_table: 'cards',
        proposed_change: extracted,
        confidence_score: 0.75  // new cards always manual-review
      });
    } else {
      // Existing card — diff it
      const diff = computeDiff(match, extracted);
      if (diff.hasChanges) {
        const confidence = calculateConfidence(diff);
        await createProposal({
          source_type: 'doc_scraper',
          source_url: 'https://...',
          source_fingerprint: `doc-${match.id}-${hashOf(extracted)}`,
          proposal_type: diff.changedFields.includes('annual_fee') ? 'fee_change' : 'bonus_change',
          target_table: 'cards',
          target_row_id: match.id,
          proposed_change: diff.newValues,
          current_value: diff.oldValues,
          confidence_score: confidence,
          status: confidence > 0.9 ? 'auto_apply_pending' : 'pending',
          auto_apply_after: confidence > 0.9 ? new Date(Date.now() + 24*60*60*1000) : null
        });
      }
    }
  }
  
  // Dedup: if source_fingerprint already exists with same proposed_change, skip
}
```

**Confidence scoring heuristics:**
- Small bonus amount change on existing card: 0.95 (auto-apply)
- Annual fee change on existing card: 0.92 (auto-apply)
- Minimum spend change: 0.9 (auto-apply)
- New card never seen before: 0.75 (manual review)
- Benefit text change: 0.7 (manual review)
- Issuer name changed: 0.4 (almost certainly a match failure, manual)

**Stop-and-ask triggers (for Claude Code building this):**
- DoC page structure changed and parser breaks — don't guess, raise
- Rate limiting from DoC — back off, don't retry aggressively
- GPT extraction returns low-confidence structured output repeatedly on same row — flag row for manual-only review

---

## Scraper 2 — Reddit (`ingest-reddit`)

**Sources:** 
- `r/CreditCards` — filter: flair = "Data Point" or "News", upvotes > 20, posted in last 7 days
- `r/churning` — filter: flair = "Data Point" or "Discussion", upvotes > 15, last 7 days

**Schedule:** Daily at 7am PT.

**Why this source:** Real-time signal on new offers, retention data, shutdown reports. Higher noise than DoC, so stricter filters + lower default confidence.

**Implementation:**

```ts
// Use Reddit's public JSON API - no auth needed for read
const posts = await fetch(
  'https://www.reddit.com/r/CreditCards/new.json?limit=100',
  { headers: { 'User-Agent': 'CardScout/1.0' } }
).then(r => r.json());

const relevant = posts.data.children
  .map(p => p.data)
  .filter(p => 
    ['Data Point', 'News'].includes(p.link_flair_text) &&
    p.ups > 20 &&
    p.created_utc > (Date.now()/1000 - 7*24*60*60)
  );

for (const post of relevant) {
  const extracted = await gptExtract({
    title: post.title,
    body: post.selftext,
    url: `https://reddit.com${post.permalink}`
  }, {
    schema: {
      is_relevant: 'boolean',
      category: 'enum(new_bonus, retention_offer, shutdown, fee_change, benefit_change, other)',
      card_name: 'string or null',
      issuer: 'string or null',
      structured_data: 'object'
    },
    prompt: 'Is this Reddit post reporting a credit card data point we should track? If yes, extract structured info. If not, return is_relevant: false.',
    model: 'gpt-4o-mini'
  });
  
  if (!extracted.is_relevant) continue;
  
  await createProposal({
    source_type: 'reddit_scraper',
    source_url: `https://reddit.com${post.permalink}`,
    source_fingerprint: `reddit-${post.id}`,
    proposal_type: mapCategoryToProposalType(extracted.category),
    proposed_change: extracted.structured_data,
    confidence_score: 0.65,  // always manual-review for Reddit
    status: 'pending'
  });
}
```

**Reddit confidence default is 0.65** — always manual-review. Reddit is signal, not source of truth. Good for surfacing things you'd otherwise miss; not trusted to auto-apply.

**Dedupe:** `source_fingerprint = 'reddit-' + post_id`. Never create duplicate proposals from the same post.

---

## Scraper 3 — Issuer Page Re-scrape (`ingest-issuer-pages`)

**Sources:** Every card in the catalog with an `application_link` that points to an issuer product page.

**Schedule:** Weekly, Wednesdays at 3am PT.

**Why this source:** Catches benefit changes announced on issuer pages before DoC or Reddit report them. Amex updated Platinum's airline credit rules mid-year once — this pipeline would have caught it day-of.

**Implementation:**

```ts
const cards = await supabase.from('cards').select('*').eq('is_active', true);

for (const card of cards) {
  if (!card.application_link) continue;
  
  // Rate limit: 1 request per 10 seconds
  await sleep(10_000);
  
  const html = await fetch(card.application_link, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CardScoutBot/1.0)' }
  }).then(r => r.text());
  
  const extracted = await gptExtract(html, {
    schema: {
      annual_fee: 'number',
      signup_bonus_amount: 'number',
      signup_bonus_min_spend: 'number',
      signup_bonus_spend_window_months: 'number',
      benefits: 'array of {title, value_usd, frequency}'
    },
    model: 'gpt-4o',  // use full 4o here — issuer pages are denser
    prompt: 'Extract current offer terms from this card product page HTML.'
  });
  
  const diff = computeDiff(card, extracted);
  if (diff.hasChanges) {
    await createProposal({
      source_type: 'issuer_rescrape',
      source_url: card.application_link,
      source_fingerprint: `issuer-${card.id}-${hashOf(extracted)}`,
      proposal_type: 'update_card',
      target_table: 'cards',
      target_row_id: card.id,
      proposed_change: diff.newValues,
      current_value: diff.oldValues,
      confidence_score: 0.85
    });
  }
  
  // Update last_verified_at even if no changes
  await supabase.from('cards')
    .update({ last_verified_at: new Date() })
    .eq('id', card.id);
}
```

**Rate limits:** 1 request per 10 seconds per issuer. Respect it. Chase and Amex have both blocked aggressive scrapers. If you see 429s, back off exponentially.

**IP strategy:** For 20 cards weekly, this runs fine from Supabase Edge Functions. If catalog grows past 100 cards or issuers start blocking, switch to residential proxy (Bright Data, ~$15/mo).

---

## Scraper 4 — User-Forwarded Emails (`ingest-email`)

**Source:** Users forward card emails to their unique address (`u_abc123@in.cardscout.app`). SendGrid Inbound Parse webhooks the content to your edge function.

**Schedule:** Real-time (webhook).

**Why this source:** This is the killer feature. Application approvals, bonus postings, fee reminders, retention offers all arrive in users' inboxes. Parse them, populate the ledger automatically.

**SendGrid setup (one-time, user task):**
1. Buy domain `in.cardscout.app`
2. Point MX records to SendGrid
3. Configure Inbound Parse webhook → `https://[project].supabase.co/functions/v1/ingest-email`

**User setup flow (in-app):**
1. User goes to Settings → Email Import
2. App generates unique address (e.g. `u_9f8a7b6c@in.cardscout.app`), stores in `user_email_aliases` table
3. App shows setup instructions: "Add this filter to Gmail: `from:(chase.com OR americanexpress.com OR citi.com OR capitalone.com OR discover.com) → forward to u_9f8a7b6c@in.cardscout.app`"
4. Copy button for the filter rule
5. Test button: "Forward any card email now to verify"

**Implementation:**

```ts
// supabase/functions/ingest-email/index.ts
export async function handler(req: Request) {
  const formData = await req.formData();
  const toAddress = formData.get('to');           // u_9f8a7b6c@in.cardscout.app
  const fromAddress = formData.get('from');
  const subject = formData.get('subject');
  const body = formData.get('text') || formData.get('html');
  
  // Resolve user from alias
  const alias = extractAlias(toAddress); // 'u_9f8a7b6c'
  const user = await supabase.from('user_email_aliases')
    .select('user_id').eq('alias', alias).single();
  
  if (!user) return new Response('Unknown alias', { status: 404 });
  
  // Classify email type
  const classification = await gptClassify(body, {
    categories: [
      'application_approved',
      'application_denied',
      'bonus_achieved',
      'fee_reminder',
      'retention_offer',
      'balance_update',
      'statement',
      'other'
    ],
    model: 'gpt-4o-mini'
  });
  
  if (classification.category === 'other' || classification.confidence < 0.7) {
    // Log and drop
    await logEvent('email_dropped', { alias, reason: classification.category });
    return new Response('OK');
  }
  
  // Extract structured data based on category
  const extracted = await gptExtract(body, {
    schema: classificationToSchema[classification.category],
    model: 'gpt-4o-mini'
  });
  
  // Create proposal scoped to this user (not global)
  await createProposal({
    source_type: 'email_forward',
    source_url: null,  // email isn't linkable
    source_fingerprint: `email-${user.user_id}-${hashOf(body)}`,
    proposal_type: classificationToProposalType[classification.category],
    target_table: classificationToTable[classification.category],
    proposed_change: { ...extracted, user_id: user.user_id },
    confidence_score: classification.confidence * 0.9,
    status: classification.confidence > 0.85 ? 'auto_apply_pending' : 'pending'
  });
  
  return new Response('OK');
}
```

**Security:** Anyone can send email to a user's unique address. Mitigations:
- Only process emails from known card issuer domains (whitelist in env var)
- Rate limit: max 20 emails per alias per hour
- All email content stored encrypted at rest, deleted after 30 days
- User can regenerate alias at any time

**Cost estimate:** SendGrid Inbound Parse free up to 40k emails/month. GPT-4o-mini ~$0.0001 per email parsed. For 1000 paid users at 5 emails/week = 20k/month = $2/month.

---

## Admin Review Screen

**Route:** `/admin/proposals` (gated to admin user only, server-side check on every request).

**UI pattern:** Stack of proposal cards, like Tinder for data. One action per card.

```
┌─────────────────────────────────────────┐
│  Proposal #14 of 23                     │
│  Source: Doctor of Credit               │
│  Type: Bonus change                     │
│  Card: Chase Sapphire Preferred         │
│  Confidence: 0.95 · Auto-applies in 8h  │
│                                         │
│  Changes:                               │
│  ┌────────────┬──────────┬──────────┐  │
│  │ Field      │ Current  │ Proposed │  │
│  ├────────────┼──────────┼──────────┤  │
│  │ bonus      │ 60,000   │ 75,000   │  │
│  │ min_spend  │ $4,000   │ $5,000   │  │
│  └────────────┴──────────┴──────────┘  │
│                                         │
│  View source →  (opens DoC page)        │
│                                         │
│  [Reject]  [Edit]  [Approve Now]        │
└─────────────────────────────────────────┘
```

**Keyboard shortcuts (desktop):**
- `a` — approve
- `r` — reject
- `e` — edit (opens form with proposed values prefilled)
- `→` — next proposal
- `←` — previous
- `s` — view source URL

**Bulk actions:** "Approve all high-confidence DoC proposals" button. One click, 10 proposals cleared.

**Filtering:** By source type, proposal type, confidence range, status, date range.

---

## Operational Rhythm

**Sunday 9pm PT:** Automated email from Resend to Zubair:
- Subject: "CardScout: 14 proposals need review"
- Body: Summary table + direct link to admin UI
- Breakdown: 9 auto-applied this week, 5 pending your review

**Monday morning:** Zubair opens admin UI, clears pending queue. Budget: 5-10 minutes.

**Mid-week:** If something weird happens (spike in rejections, scraper error), Sentry alerts fire. Otherwise no action needed.

**Quarterly:** Review confidence thresholds. If auto-apply is catching things correctly, raise the bar slightly. If it's letting through bad data, lower it.

---

## What NOT to Automate

These are tempting but wrong. Do not build them in Phase 0.5:

**Dynamic GPT-generated retention scripts.** A user is on the phone with Chase. They tap "Get retention script" and GPT generates one. Problem: one hallucinated script ("tell them you'll transfer the balance to BankAmericard" when that product was discontinued) causes real user harm. Instead, build a library of 30 static scripts, review each, tag by issuer + situation. Same user benefit, zero hallucination risk.

**Reddit-based retention benchmarks.** Tempting to scrape r/churning retention threads and show "median retention offer: 40k MR." But public Reddit retention reports are selection-biased toward brags. Wait until own users are logging data (Phase 11), then use Reddit as secondary signal.

**Issuer balance sync.** AwardWallet does this with 2FA duct tape. Do not attempt. Manual entry + email forwarding get you 90% of the value with 0% of the maintenance burden.

**Point valuation auto-update.** CPP rates change when TPG or Frequent Miler publish new valuations. Build this as a scraper later (Phase 6+), but for now keep `points_valuations` as a manual Supabase table. Updates quarterly, not weekly.

**Offer auto-activation (Amex/Chase/BoA Offers).** MaxRewards built custom integrations over years. One person cannot maintain this. Skip entirely.

---

## Phase 0.5 Task Checklist

- [ ] Migration `002_data_proposals.sql` — table + indexes + RLS
- [ ] Migration `003_source_provenance.sql` — add source_url + last_verified_at to cards, benefits
- [ ] Migration `004_user_email_aliases.sql` — email forwarding addresses table
- [ ] Edge Function `ingest-doc` — weekly cron
- [ ] Edge Function `ingest-reddit` — daily cron
- [ ] Edge Function `ingest-issuer-pages` — weekly cron
- [ ] Edge Function `ingest-email` — webhook handler
- [ ] Admin UI at `app/admin/proposals.tsx` (gated by user_id)
- [ ] Weekly summary email via Resend (Sunday 9pm PT cron)
- [ ] Auto-apply cron: runs hourly, applies proposals where `status='auto_apply_pending'` AND `auto_apply_after < now()`
- [ ] Env vars: `SENDGRID_INBOUND_WEBHOOK_SECRET`, `REDDIT_USER_AGENT`, `ADMIN_USER_ID`
- [ ] README section: admin setup + SendGrid configuration
- [ ] Test run: 1 week of real ingestion before declaring Phase 0.5 done

**Phase gate:** Seven days of real operation. Admin queue stays under 30 pending. At least 10 auto-apply decisions. At least one email forward successfully parsed end-to-end. Tune confidence thresholds based on results before Phase 1.

---

## Success Definition

Phase 0.5 is done when:

1. Monday morning, Zubair's inbox has the summary email
2. He clicks the link, sees 15 proposals, clears them in 7 minutes
3. Doctor of Credit's latest bonus changes are already in the catalog
4. A test forwarded email (Chase approval notice) auto-populated the ledger within 30 seconds
5. Admin UI has keyboard shortcuts working and feels fast

If all 5 work, the operating model is validated. Every subsequent feature benefits from this foundation.

---

## Why This Phase Comes Before Phase 1

Three reasons, in order of importance:

1. **The Application Ledger (Phase 1) is way better with email forwarding working.** If a user forwards their Chase approval email and their card appears in the ledger automatically, that's magic. If they have to type 12 fields, it's a chore. Build the magic first.

2. **The catalog stays fresh.** Phase 1 users see 20 cards with accurate current bonuses because DoC is already feeding the pipeline. Without this, you'd ship Phase 1 with stale bonus data and users would lose trust immediately.

3. **If the pipeline doesn't work, you need to know now.** Deferred infrastructure is dead infrastructure. If the scrapers are flaky or GPT extraction is worse than hoped, better to find out in week 3 than week 15.

The temptation to skip Phase 0.5 and go straight to Phase 1 will be strong. Resist.
