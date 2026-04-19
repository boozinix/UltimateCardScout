// ============================================================
// Application Ledger — TypeScript types
// Mirrors the Supabase schema in migrations/001 + 002
// ============================================================

// Household constants
export const MAX_HOUSEHOLD_MEMBERS = 4;
export const DEFAULT_MEMBER_NAMES = ['Johnny', 'Moira', 'David', 'Alexis'] as const;

// All issuers the app knows about
export type Issuer =
  | 'amex'
  | 'chase'
  | 'citi'
  | 'capital_one'
  | 'bank_of_america'
  | 'us_bank'
  | 'barclays'
  | 'wells_fargo'
  | 'discover'
  | 'other';

export const ISSUER_LABELS: Record<Issuer, string> = {
  amex:            'American Express',
  chase:           'Chase',
  citi:            'Citi',
  capital_one:     'Capital One',
  bank_of_america: 'Bank of America',
  us_bank:         'U.S. Bank',
  barclays:        'Barclays',
  wells_fargo:     'Wells Fargo',
  discover:        'Discover',
  other:           'Other',
};

// All rewards currencies the app tracks
export type RewardsCurrency =
  | 'chase_ur'
  | 'amex_mr'
  | 'citi_typ'
  | 'capital_one_miles'
  | 'united_miles'
  | 'delta_miles'
  | 'southwest_points'
  | 'jetblue_points'
  | 'american_miles'
  | 'alaska_miles'
  | 'hyatt_points'
  | 'marriott_points'
  | 'hilton_points'
  | 'ihg_points'
  | 'cash'
  | 'other';

export const CURRENCY_LABELS: Record<RewardsCurrency, string> = {
  chase_ur:          'Chase Ultimate Rewards',
  amex_mr:           'Amex Membership Rewards',
  citi_typ:          'Citi ThankYou Points',
  capital_one_miles: 'Capital One Miles',
  united_miles:      'United MileagePlus',
  delta_miles:       'Delta SkyMiles',
  southwest_points:  'Southwest Rapid Rewards',
  jetblue_points:    'JetBlue TrueBlue',
  american_miles:    'American AAdvantage',
  alaska_miles:      'Alaska Mileage Plan',
  hyatt_points:      'World of Hyatt',
  marriott_points:   'Marriott Bonvoy',
  hilton_points:     'Hilton Honors',
  ihg_points:        'IHG One Rewards',
  cash:              'Cash Back',
  other:             'Other',
};

// Cents-per-point valuations (cpp × 100 = cents per point)
// e.g. 1.5 means 1.5 cents per point → 100,000 pts = $1,500
export const CURRENCY_CPP: Record<RewardsCurrency, number> = {
  chase_ur:          1.50,  // via transfer partners (conservative)
  amex_mr:           1.50,  // via transfer partners
  citi_typ:          1.20,
  capital_one_miles: 1.00,
  united_miles:      1.30,
  delta_miles:       1.10,
  southwest_points:  1.40,
  jetblue_points:    1.30,
  american_miles:    1.20,
  alaska_miles:      1.40,
  hyatt_points:      1.80,  // highest-value hotel program
  marriott_points:   0.70,
  hilton_points:     0.50,
  ihg_points:        0.50,
  cash:              1.00,  // cash is always 1cpp
  other:             1.00,
};

/** Convert a points balance to a dollar value */
export function pointsToDollars(amount: number, currency: RewardsCurrency): number {
  return (amount * CURRENCY_CPP[currency]) / 100;
}

// Application status
export type ApplicationStatus =
  | 'pending'
  | 'active'
  | 'product_changed'
  | 'closed'
  | 'denied'
  | 'shutdown_by_issuer';

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending:             'Pending',
  active:              'Active',
  product_changed:     'Product Changed',
  closed:              'Closed',
  denied:              'Denied',
  shutdown_by_issuer:  'Shutdown by Issuer',
};

// Credit bureaus
export type CreditBureau =
  | 'equifax'
  | 'transunion'
  | 'experian'
  | 'equifax_transunion'
  | 'unknown';

export const BUREAU_LABELS: Record<CreditBureau, string> = {
  equifax:            'Equifax',
  transunion:         'TransUnion',
  experian:           'Experian',
  equifax_transunion: 'Equifax + TransUnion',
  unknown:            'Unknown',
};

// Retention outcome types
export type RetentionOutcomeType =
  | 'points_offer'
  | 'credit_offer'
  | 'fee_waived'
  | 'no_offer'
  | 'cancelled'
  | 'downgraded';

export const RETENTION_OUTCOME_LABELS: Record<RetentionOutcomeType, string> = {
  points_offer: 'Points Offer',
  credit_offer: 'Statement Credit Offer',
  fee_waived:   'Fee Waived',
  no_offer:     'No Offer',
  cancelled:    'Cancelled Card',
  downgraded:   'Downgraded Product',
};

// ============================================================
// DB row types (match Supabase table columns exactly)
// ============================================================

export interface HouseholdMember {
  id: string;
  user_id: string;
  name: string;
  role: 'primary' | 'partner' | 'other';
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  household_member_id: string | null;
  card_catalog_id: string | null;
  card_name: string;
  card_name_override: string | null;
  last_four: string | null;
  issuer: Issuer;
  card_type: 'personal' | 'business';
  counts_toward_5_24: boolean;
  applied_month: string;              // 'YYYY-MM'
  approved_at: string | null;         // ISO date
  denied_at: string | null;
  bonus_currency: RewardsCurrency | null;
  bonus_amount: number | null;
  bonus_min_spend: number | null;
  bonus_spend_months: number | null;
  bonus_spend_deadline: string | null;
  bonus_spend_progress: number;
  bonus_achieved: boolean;
  bonus_achieved_at: string | null;
  annual_fee: number;
  annual_fee_waived_year_one: boolean;
  annual_fee_next_due: string | null;
  credit_bureau: CreditBureau | null;
  status: ApplicationStatus;
  closed_at: string | null;
  product_changed_to: string | null;
  product_changed_at: string | null;
  user_card_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RetentionOutcome {
  id: string;
  user_id: string;
  application_id: string;
  called_at: string;
  fee_amount: number | null;
  outcome: RetentionOutcomeType;
  points_offered: number | null;
  credit_offered: number | null;
  accepted: boolean | null;
  notes: string | null;
  created_at: string;
}

export interface PointsBalance {
  id: string;
  user_id: string;
  household_member_id: string | null;
  currency: RewardsCurrency;
  balance: number;
  last_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// New tables from 002_extra_tables.sql
// ============================================================

export interface PointsValuation {
  id: string;
  program: string;
  cpp: number;
  source: string | null;
  updated_at: string;
}

export interface CardCategory {
  id: string;
  card_id: string;
  category: string;
  multiplier: number;
  cap_amount: number | null;
  cap_period: string | null;
  expires_date: string | null;
  notes: string | null;
}

export interface DowngradePath {
  id: string;
  from_card_id: string;
  to_card_id: string;
  issuer: string;
  notes: string | null;
}

export interface RetentionScript {
  id: string;
  issuer: string;
  situation: string;
  script_text: string;
  updated_at: string;
}

export type DealType = 'transfer_bonus' | 'elevated_signup' | 'limited_offer' | 'community_report';

export interface DealPassportEntry {
  id: string;
  deal_type: DealType;
  title: string;
  description: string | null;
  program_from: string | null;
  program_to: string | null;
  bonus_pct: number | null;
  card_id: string | null;
  expiry_date: string | null;
  source_url: string | null;
  active: boolean;
  created_at: string;
}

export type ProposalSourceType =
  | 'doc_scraper'
  | 'reddit_scraper'
  | 'issuer_rescrape'
  | 'email_forward'
  | 'user_submission'
  | 'manual';

export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'auto_applied' | 'auto_apply_pending';

export interface DataProposal {
  id: string;
  source_type: ProposalSourceType;
  source_url: string | null;
  source_fingerprint: string | null;
  proposal_type: string;
  target_table: string | null;
  target_row_id: string | null;
  proposed_change: Record<string, unknown>;
  current_value: Record<string, unknown> | null;
  confidence_score: number;
  status: ProposalStatus;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  auto_apply_after: string | null;
  applied_at: string | null;
  created_at: string;
}

// ============================================================
// Computed / view types used in UI
// ============================================================

/** Application with household member joined */
export interface ApplicationWithMember extends Application {
  household_member: HouseholdMember | null;
}

/** Points balance with computed dollar value */
export interface PointsBalanceWithValue extends PointsBalance {
  dollar_value: number;
  currency_label: string;
  cpp: number;
}

/** Portfolio summary across all currencies and members */
export interface PortfolioSummary {
  total_dollar_value: number;
  balances: PointsBalanceWithValue[];
  by_member: Record<string, { name: string; total_dollar_value: number; balances: PointsBalanceWithValue[] }>;
}

/** Per-issuer velocity summary for the dashboard */
export interface IssuerVelocitySummary {
  issuer: Issuer;
  issuer_label: string;
  open_cards: number;
  recent_applications: Application[];   // last 24 months
  warnings: VelocityWarning[];
}

export interface VelocityWarning {
  rule: string;         // '5/24' | 'amex_1_in_90' | 'citi_8_day' etc.
  message: string;      // human-readable
  severity: 'block' | 'caution' | 'info';
  clear_date: string | null;  // when the restriction lifts (null = no clear date)
}

/** 5/24 summary for Chase */
export interface Chase524Summary {
  member_name: string;
  count: number;             // current 5/24 count (0-5+)
  counting_cards: Application[];   // which cards are counting
  next_dropoff_date: string | null;  // when next card falls off
  next_dropoff_card: string | null;  // which card drops off next
  is_under_524: boolean;     // count < 5
}
