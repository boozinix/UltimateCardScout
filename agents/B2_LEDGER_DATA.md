# Build Agent B2 — Ledger Data Layer
**Phase:** 1a
**Duration:** 3-4 days
**Depends on:** B1 (Foundation complete)
**Blocks:** B3

---

## Read These First

1. `agents/AGENT_MASTER_PLAN.md`
2. `AGENT_HANDOFF.md`
3. `DECISIONS_NEEDED.md` — all locked decisions
4. `supabase/migrations/001_applications_ledger.sql` — existing schema
5. `lib/applicationTypes.ts` — existing types

---

## What You're Building

The data layer for the Application Ledger. Schema migrations, TypeScript types, CRUD hooks, and CSV parsing logic. **No UI screens** — that's B3's job.

---

## Locked Decisions That Affect You

| Decision | Value |
|---|---|
| Date precision | Month `'YYYY-MM'` |
| Household limit | Cap at 4 members |
| Issuer rules | TypeScript constants (not DB table) |
| Import | Both CSV + NL chatbot |
| All 7 extra tables | Build them all |

---

## Tasks

### Task 1 — Migration: Add 7 New Tables (2-3 hours)

Create `supabase/migrations/002_extra_tables.sql`:

```sql
-- 1. Add card_name_override to applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS card_name_override text;

-- 2. points_valuations (CPP values, updatable without deploy)
CREATE TABLE IF NOT EXISTS points_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program text UNIQUE NOT NULL,
  cpp numeric(6,4) NOT NULL,
  source text,
  updated_at timestamptz DEFAULT now()
);

-- 3. card_categories (bonus multipliers for Spend Optimizer)
CREATE TABLE IF NOT EXISTS card_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES cards(id),
  category text NOT NULL,
  multiplier numeric(4,2) NOT NULL,
  cap_amount numeric(10,2),
  cap_period text,
  expires_date date,
  notes text,
  UNIQUE(card_id, category)
);

-- 4. downgrade_paths (static data for Fee Advisor)
CREATE TABLE IF NOT EXISTS downgrade_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_card_id uuid REFERENCES cards(id),
  to_card_id uuid REFERENCES cards(id),
  issuer text NOT NULL,
  notes text
);

-- 5. retention_scripts (curated library, never AI-generated)
CREATE TABLE IF NOT EXISTS retention_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer text NOT NULL,
  situation text NOT NULL,
  script_text text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- 6. deal_passport (deal feed)
CREATE TABLE IF NOT EXISTS deal_passport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_type text NOT NULL CHECK (deal_type IN (
    'transfer_bonus', 'elevated_signup', 'limited_offer', 'community_report'
  )),
  title text NOT NULL,
  description text,
  program_from text,
  program_to text,
  bonus_pct integer,
  card_id uuid REFERENCES cards(id),
  expiry_date date,
  source_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 7. data_proposals (automation staging)
CREATE TABLE IF NOT EXISTS data_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN (
    'doc_scraper', 'reddit_scraper', 'issuer_rescrape',
    'email_forward', 'user_submission', 'manual'
  )),
  source_url text,
  source_fingerprint text,
  proposal_type text NOT NULL,
  target_table text,
  target_row_id uuid,
  proposed_change jsonb NOT NULL,
  current_value jsonb,
  confidence_score numeric(3,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'auto_applied', 'auto_apply_pending'
  )),
  reviewer_notes text,
  reviewed_at timestamptz,
  auto_apply_after timestamptz,
  applied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_card_categories_card ON card_categories(card_id);
CREATE INDEX IF NOT EXISTS idx_deal_passport_active ON deal_passport(active, expiry_date);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON data_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_fingerprint ON data_proposals(source_fingerprint);

-- RLS on all new tables
ALTER TABLE points_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE downgrade_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_passport ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_proposals ENABLE ROW LEVEL SECURITY;
```

**Note:** Do NOT run this migration. Write the file only. Zubair runs it manually against Supabase.

### Task 2 — Update TypeScript Types (2-3 hours)

Update `lib/applicationTypes.ts`:

- Add `card_name_override?: string` to `Application` type
- Add `PointsValuation` type (id, program, cpp, source, updated_at)
- Add `CardCategory` type (id, card_id, category, multiplier, cap_amount, cap_period, expires_date)
- Add `DowngradePath` type (id, from_card_id, to_card_id, issuer, notes)
- Add `RetentionScript` type (id, issuer, situation, script_text)
- Add `DealPassportEntry` type (id, deal_type, title, description, program_from, program_to, bonus_pct, card_id, expiry_date, source_url, active)
- Add `DataProposal` type (id, source_type, proposal_type, proposed_change, confidence_score, status, ...)
- Update `HouseholdMember` — add `MAX_HOUSEHOLD_MEMBERS = 4` constant
- Add Schitt's Creek default names: `DEFAULT_MEMBER_NAMES = ['Johnny', 'Moira', 'David', 'Alexis']`

### Task 3 — CRUD Hooks (3-4 hours)

#### `hooks/useApplications.ts`
- `useApplications(memberId?: string)` — list with optional member filter
- `useApplication(id: string)` — single app detail
- `useCreateApplication()` — mutation
- `useUpdateApplication()` — mutation
- `useDeleteApplication()` — mutation with optimistic update
- All use React Query with Supabase client
- Include CSV fallback for offline/demo

#### `hooks/useHousehold.ts`
- `useHousehold()` — list members (max 4)
- `useCreateMember()` — mutation (enforce cap at 4)
- `useUpdateMember()` — mutation
- `useDeleteMember()` — mutation
- `useHouseholdSetupComplete()` — boolean flag from AsyncStorage

#### `hooks/usePointsBalances.ts`
- `usePointsBalances(memberId?: string)` — list
- `useUpdateBalance()` — upsert mutation
- `usePortfolioTotal()` — computed total using `points_valuations` table CPP values

### Task 4 — CSV Parser (3-4 hours)

Create `lib/csvParser.ts`:

- `parseChurningCSV(csvText: string, columnMap: ColumnMap): ParsedApplication[]`
- Handle date formats: `Oct-23` → `2023-10`, `10/23` → `2023-10`, `2023-10` → `2023-10`, `October 2023` → `2023-10`
- Handle person column → household member matching (fuzzy: "Halima" matches "halima", "H", etc.)
- Handle issuer detection from card name if no issuer column
- Return `{ parsed: ParsedApplication[], errors: ParseError[], warnings: string[] }`
- `ParseError` = `{ row: number, column: string, value: string, message: string }`
- Duplicate detection: match by card_name + applied_month + member_name

### Task 5 — Seed Data Files (2 hours)

Create `supabase/seed-points-valuations.sql`:
```sql
INSERT INTO points_valuations (program, cpp, source) VALUES
('Chase Ultimate Rewards', 1.25, 'TPG'),
('Amex Membership Rewards', 1.25, 'TPG'),
('Capital One Miles', 1.25, 'TPG'),
('Citi ThankYou Points', 1.25, 'TPG'),
('Bilt Points', 1.25, 'TPG'),
('World of Hyatt', 1.50, 'TPG'),
('United MileagePlus', 1.30, 'TPG'),
('Delta SkyMiles', 1.10, 'TPG'),
('American Airlines AAdvantage', 1.30, 'TPG'),
('Southwest Rapid Rewards', 1.30, 'TPG'),
('Marriott Bonvoy', 0.70, 'TPG'),
('Hilton Honors', 0.50, 'TPG'),
('IHG One Rewards', 0.50, 'TPG'),
('JetBlue TrueBlue', 1.20, 'TPG'),
('Alaska Mileage Plan', 1.50, 'TPG')
ON CONFLICT (program) DO UPDATE SET cpp = EXCLUDED.cpp, source = EXCLUDED.source, updated_at = now();
```

---

## Hard Rules

1. No UI screens — data layer only
2. All types must be TypeScript strict — no `any`
3. All hooks use React Query — no raw useEffect + fetch
4. CSV parser must handle all date formats from Zubair's actual spreadsheet
5. Migration file is written but NOT executed — user runs it
6. Seed files are written but NOT executed — user runs them

---

## When Done

1. Update `AGENT_HANDOFF.md`: new files created, types added, hooks ready
2. Update `PROGRESS_TRACKER.md` Phase 1a checkboxes
3. B3 can now start building UI on top of these hooks
