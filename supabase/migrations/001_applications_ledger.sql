-- ============================================================
-- CardScout — Applications Ledger Migration
-- Run AFTER schema.sql on your Supabase project.
-- This adds the churning tracker / application ledger features.
-- ============================================================

-- ============================================================
-- HOUSEHOLD_MEMBERS
-- People tracked under one account (e.g. Zubair + Halima).
-- No separate logins — just display names tied to the
-- account owner's user_id.
-- ============================================================
create table if not exists household_members (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,                       -- 'Zubair', 'Halima'
  role        text not null default 'primary',     -- 'primary' | 'partner' | 'other'
  created_at  timestamptz not null default now()
);

create index if not exists hm_user_id_idx on household_members (user_id);

-- Only one primary per account
create unique index if not exists hm_primary_idx
  on household_members (user_id)
  where role = 'primary';

-- ============================================================
-- APPLICATIONS — the core Application Ledger
-- Every card ever applied for: approved, denied, closed,
-- product-changed, or pending. This is the spreadsheet,
-- replaced.
-- ============================================================
create table if not exists applications (
  id                       uuid primary key default uuid_generate_v4(),
  user_id                  uuid not null references auth.users (id) on delete cascade,

  -- Who applied
  household_member_id      uuid references household_members (id) on delete set null,

  -- Card identity
  -- card_catalog_id is optional: if the card is in our 110-card catalog,
  -- we link to it for display info (gradient, issuer colors, etc.).
  -- If not in catalog (e.g. a niche co-brand), card_name is the fallback.
  card_catalog_id          uuid references cards (id) on delete set null,
  card_name                text not null,          -- 'Amex Plat Biz Zandango'
  last_four                char(4),                -- '71002'
  issuer                   text not null,
  -- 'amex' | 'chase' | 'citi' | 'capital_one' | 'bank_of_america' |
  -- 'us_bank' | 'barclays' | 'wells_fargo' | 'discover' | 'other'
  card_type                text not null default 'personal', -- 'personal' | 'business'

  -- 5/24 tracking
  -- Business cards from most issuers do NOT count toward Chase 5/24.
  -- We default to true (personal) and user corrects for business cards.
  counts_toward_5_24       boolean not null default true,

  -- Application timing (month-precision, like your spreadsheet)
  -- Stored as 'YYYY-MM' text. Example: '2023-09' for Sep-23.
  -- Day is not tracked — most people don't remember the exact date.
  applied_month            text not null,          -- 'YYYY-MM'

  -- Approval / denial dates (optional — fill in if you know them)
  approved_at              date,
  denied_at                date,

  -- -------------------------------------------------------
  -- SIGNUP BONUS
  -- -------------------------------------------------------
  bonus_currency           text,
  -- 'chase_ur' | 'amex_mr' | 'citi_typ' | 'capital_one_miles' |
  -- 'united_miles' | 'delta_miles' | 'southwest_points' |
  -- 'jetblue_points' | 'american_miles' | 'alaska_miles' |
  -- 'hyatt_points' | 'marriott_points' | 'hilton_points' |
  -- 'ihg_points' | 'cash' | 'other'

  bonus_amount             integer,                -- raw points/miles/dollars
  bonus_min_spend          integer,                -- dollars required to earn bonus
  bonus_spend_months       integer default 3,      -- months to complete spend (usually 3)
  bonus_spend_deadline     date,                   -- exact deadline (from welcome email)
  bonus_spend_progress     integer default 0,      -- dollars spent toward minimum (manual)
  bonus_achieved           boolean default false,
  bonus_achieved_at        date,                   -- date bonus posted to account

  -- -------------------------------------------------------
  -- ANNUAL FEE
  -- -------------------------------------------------------
  annual_fee               integer not null default 0, -- dollars
  annual_fee_waived_year_one boolean not null default false,
  -- Next fee due date. Year 1: set to null if waived, or to
  -- ~12 months after approval_at. Years 2+: anniversary of approval.
  annual_fee_next_due      date,

  -- -------------------------------------------------------
  -- CREDIT BUREAU
  -- Which bureau the issuer pulled for this application.
  -- Used for hard inquiry management across bureaus.
  -- -------------------------------------------------------
  credit_bureau            text,
  -- 'equifax' | 'transunion' | 'experian' | 'equifax_transunion' | 'unknown'

  -- -------------------------------------------------------
  -- CARD STATUS
  -- -------------------------------------------------------
  status                   text not null default 'active',
  -- 'pending'           — applied, waiting for decision
  -- 'active'            — approved, card in hand and open
  -- 'product_changed'   — converted / upgraded / downgraded to another product
  -- 'closed'            — closed by you
  -- 'denied'            — application was denied
  -- 'shutdown_by_issuer' — issuer closed it (e.g. Amex SUS flag)

  -- Closure / product change details
  closed_at                date,
  product_changed_to       text,                   -- name of new card if PC
  product_changed_at       date,

  -- -------------------------------------------------------
  -- VAULT LINK
  -- When a card is 'active', it also lives in user_cards
  -- (for benefit tracking + reminders). This FK links them.
  -- Null for denied/closed applications — no vault entry.
  -- -------------------------------------------------------
  user_card_id             uuid references user_cards (id) on delete set null,

  -- Free-form notes field (SUS flags, retention notes, anything)
  notes                    text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists apps_user_id_idx        on applications (user_id);
create index if not exists apps_household_idx      on applications (household_member_id);
create index if not exists apps_issuer_idx         on applications (issuer);
create index if not exists apps_status_idx         on applications (status);
create index if not exists apps_applied_month_idx  on applications (applied_month);
create index if not exists apps_fee_due_idx        on applications (annual_fee_next_due);

-- ============================================================
-- RETENTION_OUTCOMES
-- One row per retention call. A card can have multiple rows
-- (one per annual fee cycle). Triggered by the annual fee
-- reminder flow: "Fee is due — did you call retention?"
-- ============================================================
create table if not exists retention_outcomes (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  application_id  uuid not null references applications (id) on delete cascade,

  called_at       date not null,
  fee_amount      integer,        -- the fee amount that prompted the call (dollars)

  outcome         text not null,
  -- 'points_offer'  — they offered bonus points (fill in points_offered)
  -- 'credit_offer'  — they offered a statement credit (fill in credit_offered)
  -- 'fee_waived'    — full annual fee waived
  -- 'no_offer'      — called, nothing offered
  -- 'cancelled'     — cancelled the card on this call
  -- 'downgraded'    — downgraded to a no-fee or lower-fee product

  points_offered  integer,        -- number of points offered (if outcome = 'points_offer')
  credit_offered  integer,        -- statement credit in dollars (if outcome = 'credit_offer')
  accepted        boolean,        -- did you accept the offer?

  notes           text,           -- 'held for 20 min, retention dept was helpful'
  created_at      timestamptz not null default now()
);

create index if not exists retention_app_idx  on retention_outcomes (application_id);
create index if not exists retention_user_idx on retention_outcomes (user_id);

-- ============================================================
-- POINTS_BALANCES
-- Manual points portfolio. One row per person per currency.
-- User updates their balance when they earn or burn.
-- The app calculates dollar value using cpp rates in code.
-- ============================================================
create table if not exists points_balances (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  household_member_id  uuid references household_members (id) on delete cascade,

  currency             text not null,
  -- Same enum as bonus_currency above.
  -- 'chase_ur' | 'amex_mr' | 'citi_typ' | 'capital_one_miles' |
  -- 'united_miles' | 'delta_miles' | 'southwest_points' |
  -- 'jetblue_points' | 'american_miles' | 'alaska_miles' |
  -- 'hyatt_points' | 'marriott_points' | 'hilton_points' |
  -- 'ihg_points' | 'cash'

  balance              integer not null default 0,  -- raw points/miles/dollars
  last_updated_at      date,                        -- when user last updated this

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- One row per person per currency (no duplicates)
create unique index if not exists pb_member_currency_idx
  on points_balances (user_id, household_member_id, currency);

create index if not exists pb_user_id_idx on points_balances (user_id);

-- ============================================================
-- LINK user_cards → applications
-- Adds optional application_id to user_cards so the vault
-- can show application context (when applied, bonus status, etc.)
-- This is additive — existing rows have null application_id.
-- ============================================================
alter table user_cards
  add column if not exists application_id uuid references applications (id) on delete set null;

-- ============================================================
-- ROW LEVEL SECURITY — new tables
-- ============================================================
alter table household_members  enable row level security;
alter table applications       enable row level security;
alter table retention_outcomes enable row level security;
alter table points_balances    enable row level security;

-- household_members: owner only
create policy "hm_owner" on household_members
  for all using (auth.uid() = user_id);

-- applications: owner only
create policy "apps_owner" on applications
  for all using (auth.uid() = user_id);

-- retention_outcomes: owner only
create policy "retention_owner" on retention_outcomes
  for all using (auth.uid() = user_id);

-- points_balances: owner only
create policy "pb_owner" on points_balances
  for all using (auth.uid() = user_id);

-- ============================================================
-- UPDATED_AT triggers
-- ============================================================
create trigger applications_updated_at before update on applications
  for each row execute function update_updated_at();

create trigger pb_updated_at before update on points_balances
  for each row execute function update_updated_at();
