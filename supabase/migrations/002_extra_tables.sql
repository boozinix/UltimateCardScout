-- ============================================================
-- CardScout — Extra Tables Migration (Phase 1a / Agent B2)
-- Run AFTER 001_applications_ledger.sql.
-- Adds tables for: points valuations, card categories,
-- downgrade paths, retention scripts, deal passport,
-- data proposals (automation staging).
-- ============================================================

-- ============================================================
-- 1. Add card_name_override to applications
-- Allows user to override the catalog name (e.g. "Amex Plat Biz — Zandango")
-- ============================================================
ALTER TABLE applications ADD COLUMN IF NOT EXISTS card_name_override text;

-- ============================================================
-- 2. POINTS_VALUATIONS
-- Cents-per-point (CPP) values, updatable without app deploy.
-- Seeded from TPG/community consensus. Admin can update anytime.
-- ============================================================
CREATE TABLE IF NOT EXISTS points_valuations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program    text UNIQUE NOT NULL,
  cpp        numeric(6,4) NOT NULL,
  source     text,
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. CARD_CATEGORIES
-- Bonus multipliers per card per spend category.
-- Powers the Spend Optimizer ("which card for groceries?").
-- ============================================================
CREATE TABLE IF NOT EXISTS card_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     uuid REFERENCES cards(id),
  category    text NOT NULL,
  multiplier  numeric(4,2) NOT NULL,
  cap_amount  numeric(10,2),
  cap_period  text,
  expires_date date,
  notes       text,
  UNIQUE(card_id, category)
);

-- ============================================================
-- 4. DOWNGRADE_PATHS
-- Static data for Fee Advisor: which card can downgrade to what.
-- e.g. Amex Gold → Amex Green, CSP → CF/CFF
-- ============================================================
CREATE TABLE IF NOT EXISTS downgrade_paths (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_card_id uuid REFERENCES cards(id),
  to_card_id   uuid REFERENCES cards(id),
  issuer       text NOT NULL,
  notes        text
);

-- ============================================================
-- 5. RETENTION_SCRIPTS
-- Curated library of retention call scripts. Never AI-generated.
-- 30 scripts seeded separately (seed-retention-scripts.sql).
-- ============================================================
CREATE TABLE IF NOT EXISTS retention_scripts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer      text NOT NULL,
  situation   text NOT NULL,
  script_text text NOT NULL,
  updated_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 6. DEAL_PASSPORT
-- Deal feed: transfer bonuses, elevated signups, limited offers,
-- community reports. Populated by automation pipeline (B7).
-- ============================================================
CREATE TABLE IF NOT EXISTS deal_passport (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_type    text NOT NULL CHECK (deal_type IN (
    'transfer_bonus', 'elevated_signup', 'limited_offer', 'community_report'
  )),
  title        text NOT NULL,
  description  text,
  program_from text,
  program_to   text,
  bonus_pct    integer,
  card_id      uuid REFERENCES cards(id),
  expiry_date  date,
  source_url   text,
  active       boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- 7. DATA_PROPOSALS
-- Automation staging table. Scrapers/ingestors write proposals
-- here; admin reviews weekly. High-confidence auto-applies.
-- ============================================================
CREATE TABLE IF NOT EXISTS data_proposals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type         text NOT NULL CHECK (source_type IN (
    'doc_scraper', 'reddit_scraper', 'issuer_rescrape',
    'email_forward', 'user_submission', 'manual'
  )),
  source_url          text,
  source_fingerprint  text,
  proposal_type       text NOT NULL,
  target_table        text,
  target_row_id       uuid,
  proposed_change     jsonb NOT NULL,
  current_value       jsonb,
  confidence_score    numeric(3,2) NOT NULL,
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'auto_applied', 'auto_apply_pending'
  )),
  reviewer_notes      text,
  reviewed_at         timestamptz,
  auto_apply_after    timestamptz,
  applied_at          timestamptz,
  created_at          timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_card_categories_card ON card_categories(card_id);
CREATE INDEX IF NOT EXISTS idx_deal_passport_active ON deal_passport(active, expiry_date);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON data_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_fingerprint ON data_proposals(source_fingerprint);

-- ============================================================
-- ROW LEVEL SECURITY
-- These are reference/admin tables — read-only for authenticated users.
-- Write access controlled by service role (Edge Functions / admin).
-- ============================================================
ALTER TABLE points_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE downgrade_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_passport ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_proposals ENABLE ROW LEVEL SECURITY;

-- Read-only policies for authenticated users (reference data)
CREATE POLICY "pv_read" ON points_valuations
  FOR SELECT USING (true);

CREATE POLICY "cc_read" ON card_categories
  FOR SELECT USING (true);

CREATE POLICY "dp_read" ON downgrade_paths
  FOR SELECT USING (true);

CREATE POLICY "rs_read" ON retention_scripts
  FOR SELECT USING (true);

CREATE POLICY "deal_read" ON deal_passport
  FOR SELECT USING (active = true);

-- data_proposals: no public read — admin only via service role
