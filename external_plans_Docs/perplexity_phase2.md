---

## DATABASE SCHEMA

### EXISTING TABLES (from PerksVault — do not modify structure)

users (extends Supabase auth.users)
  id                uuid PK
  email             text
  is_pro            boolean default false
  pro_expires_at    timestamptz
  stripe_customer_id text
  created_at        timestamptz

cards (master catalog — 100+ cards)
  id                uuid PK
  name              text
  issuer            text
  network           text
  annual_fee        numeric(8,2)
  annual_fee_waived_y1 boolean
  rewards_type      enum: cashback|points|miles
  points_currency   text (Chase UR, Amex MR, etc.)
  card_type         enum: personal|business
  image_url         text
  apply_url         text
  is_active         boolean
  last_scraped_at   timestamptz
  created_at        timestamptz

user_cards (cards in user's active wallet)
  id                uuid PK
  user_id           uuid FK → users
  card_id           uuid FK → cards
  last_four         text(4)
  opened_date       date
  created_at        timestamptz

benefits (per card, seeded data)
  id                uuid PK
  card_id           uuid FK → cards
  name              text
  value             numeric(8,2)
  period            enum: monthly|quarterly|semi-annual|annual|multi-year
  category          text
  description       text
  terms             text
  created_at        timestamptz

user_benefits (per user per benefit)
  id                uuid PK
  user_id           uuid FK → users
  benefit_id        uuid FK → benefits
  is_active         boolean default true
  used_this_period  boolean default false
  used_at           timestamptz
  reminder_days     integer default 7
  snoozed_until     timestamptz
  created_at        timestamptz

### NEW TABLES (add via migration)

card_applications  -- THE SPINE. Replaces churner spreadsheet.
  id                    uuid PK default gen_random_uuid()
  user_id               uuid FK → users
  card_id               uuid FK → cards nullable
  card_name_override    text  -- if card not in catalog
  issuer                text not null
  card_type             enum: personal|business not null
  applied_date          date not null
  status                enum: approved|denied|pending|cancelled
  approved_date         date
  closed_date           date
  signup_bonus_amount   integer
  signup_bonus_type     enum: points|miles|cashback
  spend_requirement     numeric(10,2)
  spend_deadline        date
  spend_achieved        boolean default false
  spend_current         numeric(10,2) default 0
  annual_fee            numeric(8,2)
  annual_fee_due_date   date
  year_one_waived       boolean default false
  bonus_lifetime_burned boolean default false
  last_bonus_received   date
  notes                 text
  created_at            timestamptz default now()
  updated_at            timestamptz default now()

points_balances  -- Manual entry, user-maintained
  id              uuid PK default gen_random_uuid()
  user_id         uuid FK → users
  program         text not null
  balance         integer not null default 0
  last_updated    date
  created_at      timestamptz default now()

points_valuations  -- You maintain quarterly
  id          uuid PK default gen_random_uuid()
  program     text UNIQUE not null
  cpp         numeric(6,4) not null  -- cents per point
  source      text  -- TPG, Upgraded Points, etc.
  updated_at  timestamptz default now()

card_categories  -- Bonus multipliers per category
  id            uuid PK default gen_random_uuid()
  card_id       uuid FK → cards
  category      text not null
  multiplier    numeric(4,2) not null
  notes         text  -- "Q1 2026 only", "capped $1500/qtr"
  cap_amount    numeric(10,2)
  expires_date  date
  UNIQUE(card_id, category)

retention_logs  -- User-submitted retention outcomes
  id                    uuid PK default gen_random_uuid()
  user_id               uuid FK → users
  card_application_id   uuid FK → card_applications
  logged_date           date not null
  outcome               enum: kept|downgraded|cancelled|fee_waived
  offer_points          integer
  offer_credit          numeric(8,2)
  offer_accepted        boolean
  notes                 text
  created_at            timestamptz default now()

downgrade_paths  -- Static data, you seed this
  id            uuid PK default gen_random_uuid()
  from_card_id  uuid FK → cards
  to_card_id    uuid FK → cards
  notes         text
  issuer        text

deal_passport  -- You + automation populate this
  id            uuid PK default gen_random_uuid()
  deal_type     enum: transfer_bonus|elevated_signup|
                      limited_offer|community_report
  title         text not null
  description   text
  program_from  text  -- for transfer bonuses
  program_to    text
  bonus_pct     integer
  card_id       uuid FK → cards nullable
  expiry_date   date
  source_url    text
  active        boolean default true
  created_at    timestamptz default now()

data_proposals  -- ALL automation writes here first
  id               uuid PK default gen_random_uuid()
  source           enum: doc|reddit|issuer_page|manual
  source_url       text
  change_type      enum: benefit_change|new_card|
                         bonus_change|valuation_update|
                         rule_change|deal
  proposed_data    jsonb not null
  current_data     jsonb  -- for diffing
  confidence_score numeric(3,2)  -- 0.00 to 1.00
  state            enum: pending|approved|rejected|applied
                   default pending
  auto_apply_after timestamptz
  created_at       timestamptz default now()
  reviewed_at      timestamptz
  reviewer_notes   text

issuer_rules  -- Bank application rules, you maintain
  id          uuid PK default gen_random_uuid()
  issuer      text not null
  rule_name   text not null  -- "5/24", "velocity_90_day"
  rule_type   enum: count_limit|time_limit|lifetime
  parameters  jsonb  -- flexible rule params
  description text
  updated_at  timestamptz default now()

retention_scripts  -- Static library, never dynamic
  id          uuid PK default gen_random_uuid()
  issuer      text not null
  situation   text not null  -- "below_breakeven",
                             --  "above_breakeven", "new_card"
  script_text text not null
  updated_at  timestamptz default now()

### RLS POLICIES (apply to all user tables)
-- Users can only read/write their own rows
-- Service role bypasses RLS (for edge functions)
-- data_proposals: only service role can write,
--   only admin user_id can read

### INDEXES
CREATE INDEX idx_card_applications_user_id
  ON card_applications(user_id);
CREATE INDEX idx_card_applications_issued
  ON card_applications(issuer, status);
CREATE INDEX idx_card_applications_applied_date
  ON card_applications(applied_date);
CREATE INDEX idx_points_balances_user_id
  ON points_balances(user_id);
CREATE INDEX idx_deal_passport_active
  ON deal_passport(active, expiry_date);
CREATE INDEX idx_data_proposals_state
  ON data_proposals(state, auto_apply_after);