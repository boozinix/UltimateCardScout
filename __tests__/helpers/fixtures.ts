// ============================================================
// Test fixtures for velocity engine tests
// ============================================================

import type { Application, Issuer, ApplicationStatus, RewardsCurrency, CreditBureau } from '../../lib/applicationTypes';

let idCounter = 0;

/** Create a minimal Application with sensible defaults */
export function makeApp(overrides: Partial<Application> & { card_name: string; issuer: Issuer; applied_month: string }): Application {
  idCounter++;
  const base: Application = {
    id: `app-${idCounter}`,
    user_id: 'user-1',
    household_member_id: 'member-1',
    card_catalog_id: null,
    card_name: overrides.card_name,
    card_name_override: null,
    last_four: null,
    issuer: overrides.issuer,
    card_type: 'personal',
    counts_toward_5_24: true,
    applied_month: overrides.applied_month,
    approved_at: null,
    denied_at: null,
    bonus_currency: 'chase_ur' as RewardsCurrency,
    bonus_amount: 60000,
    bonus_min_spend: 4000,
    bonus_spend_months: 3,
    bonus_spend_deadline: null,
    bonus_spend_progress: 0,
    bonus_achieved: false,
    bonus_achieved_at: null,
    annual_fee: 95,
    annual_fee_waived_year_one: false,
    annual_fee_next_due: null,
    credit_bureau: 'experian' as CreditBureau,
    status: 'active' as ApplicationStatus,
    closed_at: null,
    product_changed_to: null,
    product_changed_at: null,
    user_card_id: null,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };
  return { ...base, ...overrides };
}

/** Create a Chase personal card */
export function chasePersonal(month: string, name = 'Chase Freedom Unlimited'): Application {
  return makeApp({ card_name: name, issuer: 'chase', applied_month: month, bonus_currency: 'chase_ur' });
}

/** Create a Chase business card */
export function chaseBusiness(month: string, name = 'Chase Ink Business Cash'): Application {
  return makeApp({ card_name: name, issuer: 'chase', applied_month: month, card_type: 'business', bonus_currency: 'chase_ur' });
}

/** Create a Chase Sapphire card with bonus achieved */
export function sapphireWithBonus(month: string, variant: 'CSP' | 'CSR' = 'CSP'): Application {
  const name = variant === 'CSP' ? 'Chase Sapphire Preferred' : 'Chase Sapphire Reserve';
  return makeApp({
    card_name: name,
    issuer: 'chase',
    applied_month: month,
    bonus_achieved: true,
    bonus_achieved_at: `${month}-15`,
    bonus_currency: 'chase_ur',
    bonus_amount: variant === 'CSP' ? 60000 : 50000,
  });
}

/** Create a Chase Sapphire card that was denied */
export function sapphireDenied(month: string): Application {
  return makeApp({
    card_name: 'Chase Sapphire Preferred',
    issuer: 'chase',
    applied_month: month,
    status: 'denied',
    denied_at: `${month}-10`,
    bonus_achieved: false,
  });
}

/** Create an Amex credit card */
export function amexCredit(month: string, name = 'Amex Blue Cash Preferred', approvedAt?: string): Application {
  return makeApp({
    card_name: name,
    issuer: 'amex',
    applied_month: month,
    approved_at: approvedAt ?? null,
    bonus_currency: 'amex_mr',
  });
}

/** Create an Amex charge card (exempt from velocity) */
export function amexCharge(month: string, name = 'Amex Gold Card', approvedAt?: string): Application {
  return makeApp({
    card_name: name,
    issuer: 'amex',
    applied_month: month,
    approved_at: approvedAt ?? null,
    annual_fee: 250,
    bonus_currency: 'amex_mr',
  });
}

/** Create an Amex card with lifetime bonus burned */
export function amexWithBonus(month: string, name = 'Amex Gold Card'): Application {
  return makeApp({
    card_name: name,
    issuer: 'amex',
    applied_month: month,
    bonus_achieved: true,
    bonus_achieved_at: `${month}-15`,
    bonus_currency: 'amex_mr',
  });
}

/** Create a Citi personal card */
export function citiPersonal(month: string, name = 'Citi Premier', approvedAt?: string): Application {
  return makeApp({
    card_name: name,
    issuer: 'citi',
    applied_month: month,
    approved_at: approvedAt ?? null,
    bonus_currency: 'citi_typ',
  });
}

/** Create a Citi business card */
export function citiBusiness(month: string, name = 'Citi Business AAdvantage'): Application {
  return makeApp({
    card_name: name,
    issuer: 'citi',
    applied_month: month,
    card_type: 'business',
    bonus_currency: 'citi_typ',
  });
}

/** Create a Capital One personal card */
export function capOnePersonal(month: string, name = 'Capital One Venture X'): Application {
  return makeApp({
    card_name: name,
    issuer: 'capital_one',
    applied_month: month,
    bonus_currency: 'capital_one_miles',
  });
}

/** Create a BofA card */
export function bofaCard(month: string, name = 'BofA Customized Cash', type: 'personal' | 'business' = 'personal'): Application {
  return makeApp({
    card_name: name,
    issuer: 'bank_of_america',
    applied_month: month,
    card_type: type,
    bonus_currency: 'cash',
  });
}

/** Create a Discover card */
export function discoverCard(month: string, name = 'Discover it Cash Back'): Application {
  return makeApp({
    card_name: name,
    issuer: 'discover',
    applied_month: month,
    bonus_currency: 'cash',
  });
}

/** Create a Barclays card */
export function barclaysCard(month: string, name = 'Barclays AAdvantage Aviator'): Application {
  return makeApp({
    card_name: name,
    issuer: 'barclays',
    applied_month: month,
    bonus_currency: 'american_miles',
  });
}

/** Create a US Bank card */
export function usBankCard(month: string, name = 'US Bank Altitude Reserve', approvedAt?: string): Application {
  return makeApp({
    card_name: name,
    issuer: 'us_bank',
    applied_month: month,
    approved_at: approvedAt ?? null,
    bonus_currency: 'cash',
  });
}

/** Create a generic card from any issuer */
export function genericCard(issuer: Issuer, month: string, type: 'personal' | 'business' = 'personal'): Application {
  return makeApp({
    card_name: `${issuer} Test Card`,
    issuer,
    applied_month: month,
    card_type: type,
  });
}

/** Reset the ID counter (call in beforeEach) */
export function resetFixtures(): void {
  idCounter = 0;
}
