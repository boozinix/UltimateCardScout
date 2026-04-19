// ============================================================
// Issuer Velocity Rules — 14 rules as TypeScript constants
// These rules determine whether a user is eligible to apply
// for a new card from a given issuer. If any rule is wrong,
// a user could apply and get denied. Test thoroughly.
// ============================================================

import type { Application, Issuer } from './applicationTypes';

// ─── RuleResult ─────────────────────────────────────────────────────────────

export type RuleResult = {
  rule_id: string;
  issuer: Issuer;
  status: 'clear' | 'warning' | 'blocked';
  current_value: number | null;
  limit_value: number | null;
  eligible_after: string | null;   // 'YYYY-MM' or null
  days_until_clear: number | null;
  message: string;
  applications_considered: string[];
};

// ─── Constants ──────────────────────────────────────────────────────────────

/** Business cards from these issuers count toward Chase 5/24 */
export const BUSINESS_CARDS_THAT_COUNT_TOWARD_5_24: Issuer[] = [
  'citi', 'us_bank', 'barclays',
];

/** Issuers whose business cards do NOT count toward 5/24 */
export const BUSINESS_CARDS_EXEMPT_FROM_5_24: Issuer[] = [
  'chase', 'amex', 'capital_one',
];

/** Amex charge cards (exempt from credit card velocity rules) */
export const AMEX_CHARGE_CARDS = [
  'Business Platinum',
  'Business Gold',
  'Business Green',
  'Schwab Platinum',
  'Morgan Stanley Platinum',
  'Centurion',
  'Platinum Card',
  'Gold Card',
  'Green Card',
] as const;

/**
 * Co-brand credit card keywords — if the card name contains any of these,
 * it is a CREDIT card regardless of also containing "Gold"/"Platinum".
 * Delta Gold, Hilton, Marriott, etc. are all credit cards.
 */
const COBRAND_CREDIT_KEYWORDS = [
  'delta', 'hilton', 'marriott', 'bonvoy', 'blue cash', 'everyday',
  'cash magnet', 'amazon', 'lowe', 'brilliant',
] as const;

/**
 * Amex lifetime bonus families — cards in the same family share the
 * once-per-lifetime restriction. Business and Personal are SEPARATE products.
 */
export const AMEX_LIFETIME_FAMILIES: Record<string, string> = {
  // Personal credit cards
  'Blue Cash Preferred': 'blue_cash_preferred',
  'Blue Cash Everyday': 'blue_cash_everyday',
  'Cash Magnet': 'cash_magnet',
  'EveryDay': 'everyday',
  'EveryDay Preferred': 'everyday_preferred',
  'Hilton Honors': 'hilton_honors',
  'Hilton Honors Surpass': 'hilton_surpass',
  'Hilton Honors Aspire': 'hilton_aspire',
  'Delta SkyMiles Blue': 'delta_blue',
  'Delta SkyMiles Gold': 'delta_gold',
  'Delta SkyMiles Platinum': 'delta_platinum',
  'Delta SkyMiles Reserve': 'delta_reserve',
  'Marriott Bonvoy Brilliant': 'marriott_brilliant',
  'Marriott Bonvoy Bevy': 'marriott_bevy',
  // Gold and Rose Gold are the same product
  'Gold': 'gold_charge',
  'Gold Card': 'gold_charge',
  'Rose Gold': 'gold_charge',
  // Platinum variants
  'Platinum': 'platinum_charge',
  'Platinum Card': 'platinum_charge',
  'Schwab Platinum': 'schwab_platinum_charge',
  'Morgan Stanley Platinum': 'ms_platinum_charge',
  'Green': 'green_charge',
  // Business credit cards (separate from personal)
  'Blue Business Plus': 'biz_blue_plus',
  'Blue Business Cash': 'biz_blue_cash',
  'Amazon Business': 'biz_amazon',
  'Hilton Honors Business': 'biz_hilton',
  'Delta SkyMiles Gold Business': 'biz_delta_gold',
  'Delta SkyMiles Platinum Business': 'biz_delta_platinum',
  'Delta SkyMiles Reserve Business': 'biz_delta_reserve',
  'Marriott Bonvoy Business': 'biz_marriott',
  // Business charge cards
  'Business Platinum': 'biz_platinum_charge',
  'Business Gold': 'biz_gold_charge',
  'Business Green': 'biz_green_charge',
};

/** Discover product families */
export const DISCOVER_FAMILIES: Record<string, string> = {
  'Discover it': 'discover_it',
  'Discover it Chrome': 'discover_it',
  'Discover it Cash Back': 'discover_it',
  'Discover it Miles': 'discover_miles',
  'Discover it Student': 'discover_it',
  'Discover it Secured': 'discover_it_secured',
};

/** Sapphire product names (CSP/CSR) for the 48-month rule */
export const SAPPHIRE_PRODUCTS = [
  'Chase Sapphire Preferred',
  'Chase Sapphire Reserve',
  'Sapphire Preferred',
  'Sapphire Reserve',
  'CSP',
  'CSR',
] as const;

// ─── Helper Functions ───────────────────────────────────────────────────────

/** Parse 'YYYY-MM' to a Date (first of month) */
export function monthToDate(month: string): Date {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

/** Get month diff between two 'YYYY-MM' strings. Positive if m1 > m2 */
export function getMonthDiff(m1: string, m2: string): number {
  const [y1, mo1] = m1.split('-').map(Number);
  const [y2, mo2] = m2.split('-').map(Number);
  return (y1 - y2) * 12 + (mo1 - mo2);
}

/** Add N months to a 'YYYY-MM' string */
export function addMonthsToMonthString(monthStr: string, n: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const total = (y * 12 + (m - 1)) + n;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

/** Get the best date for an application (approved_at > applied_month first-of-month) */
export function getAppDate(app: Application): Date {
  if (app.approved_at) return new Date(app.approved_at);
  return monthToDate(app.applied_month);
}

/** Days between two dates */
function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/** Current month as 'YYYY-MM' */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Count applications in the last N months (inclusive) from reference */
export function countInLastNMonths(
  apps: Application[],
  nMonths: number,
  referenceMonth: string,
): Application[] {
  const cutoff = addMonthsToMonthString(referenceMonth, -nMonths);
  return apps.filter((a) => a.applied_month > cutoff && a.applied_month <= referenceMonth);
}

/** Count applications in the last N days from a reference date */
function appsInLastNDays(apps: Application[], nDays: number, refDate: Date): Application[] {
  return apps.filter((a) => {
    const d = getAppDate(a);
    return d <= refDate && daysBetween(d, refDate) <= nDays;
  });
}

/**
 * Does a business card count toward 5/24?
 * Chase, Amex, Capital One biz cards do NOT count.
 * Citi, US Bank, Barclays biz cards DO count.
 * TD Bank also counts (mapped to 'other' in our system).
 */
export function isBusinessCardCounted(issuer: Issuer, _cardType: 'personal' | 'business'): boolean {
  if (BUSINESS_CARDS_EXEMPT_FROM_5_24.includes(issuer)) return false;
  // Everything else counts
  return true;
}

/** Is this an Amex charge card (exempt from credit velocity rules)? */
export function isChargeCard(cardName: string): boolean {
  const n = cardName.toLowerCase().trim();

  // Co-brand credit cards are NEVER charge cards, even if name contains "Gold"/"Platinum"
  if (COBRAND_CREDIT_KEYWORDS.some((kw) => n.includes(kw))) return false;

  // Check specific charge card patterns first
  if (AMEX_CHARGE_CARDS.some((cc) => n.includes(cc.toLowerCase()))) return true;

  // Standalone "platinum", "gold", "green" as the primary product name
  // Match only if the name is essentially just the charge card name (with optional "amex"/"card" prefix/suffix)
  const stripped = n.replace(/\b(amex|american express|the|card)\b/g, '').trim();
  if (/^platinum$/.test(stripped)) return true;
  if (/^gold$/.test(stripped)) return true;
  if (/^rose gold$/.test(stripped)) return true;
  if (/^green$/.test(stripped)) return true;

  return false;
}

/** Get the Amex lifetime family key for a card name */
export function getCardFamily(cardName: string, issuer: Issuer): string | null {
  if (issuer === 'amex') {
    // Sort by pattern length descending so more specific patterns match first
    // e.g. "Business Gold" matches before "Gold", "Hilton Honors Surpass" before "Hilton Honors"
    const entries = Object.entries(AMEX_LIFETIME_FAMILIES)
      .sort((a, b) => b[0].length - a[0].length);
    for (const [pattern, family] of entries) {
      if (cardName.toLowerCase().includes(pattern.toLowerCase())) {
        return family;
      }
    }
    return null;
  }
  if (issuer === 'discover') {
    const entries = Object.entries(DISCOVER_FAMILIES)
      .sort((a, b) => b[0].length - a[0].length);
    for (const [pattern, family] of entries) {
      if (cardName.toLowerCase().includes(pattern.toLowerCase())) {
        return family;
      }
    }
    return null;
  }
  return null;
}

/** Is this a Sapphire product? */
function isSapphireProduct(cardName: string): boolean {
  const n = cardName.toLowerCase();
  return SAPPHIRE_PRODUCTS.some((s) => n.includes(s.toLowerCase()));
}

/** Filter apps: only non-denied applications (pending, active, closed, product_changed count) */
function nonDeniedApps(apps: Application[]): Application[] {
  return apps.filter((a) => a.status !== 'denied' && a.status !== 'shutdown_by_issuer');
}

// ─── Rule Functions ─────────────────────────────────────────────────────────

/**
 * Rule 1: Chase 5/24
 * Count personal cards from ANY issuer in last 24 months.
 * Business cards from Chase/Amex/CapOne exempt.
 * Closed cards still count. Product changes count once.
 */
export function chase524(
  apps: Application[],
  referenceMonth?: string,
): RuleResult {
  const ref = referenceMonth ?? currentMonth();
  const valid = nonDeniedApps(apps);

  // Cards that count toward 5/24
  const counting = countInLastNMonths(valid, 24, ref).filter((a) => {
    if (a.card_type === 'personal') return true;
    // Business card — check per-issuer rule
    return isBusinessCardCounted(a.issuer, a.card_type);
  });

  const count = counting.length;
  const limit = 5;

  // Find next drop-off
  let eligibleAfter: string | null = null;
  let daysUntilClear: number | null = null;
  if (count >= limit) {
    // Sort counting cards by applied_month ascending
    const sorted = [...counting].sort((a, b) => a.applied_month.localeCompare(b.applied_month));
    // Need (count - limit + 1) cards to drop off
    const dropoffIndex = count - limit;
    if (dropoffIndex < sorted.length) {
      eligibleAfter = addMonthsToMonthString(sorted[dropoffIndex].applied_month, 24);
      const refDate = monthToDate(ref);
      const clearDate = monthToDate(eligibleAfter);
      daysUntilClear = Math.max(0, Math.ceil((clearDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  const status = count >= limit ? 'blocked' : count >= 4 ? 'warning' : 'clear';

  return {
    rule_id: 'chase_5_24',
    issuer: 'chase',
    status,
    current_value: count,
    limit_value: limit,
    eligible_after: eligibleAfter,
    days_until_clear: daysUntilClear,
    message: count >= limit
      ? `At ${count}/5 — blocked from most Chase cards. Next slot opens ${eligibleAfter ?? 'unknown'}.`
      : count === 4
        ? `At 4/5 — one more card locks you out of Chase.`
        : `${count}/5 — you're clear for Chase applications.`,
    applications_considered: counting.map((a) => a.id),
  };
}

/**
 * Rule 2: Chase Sapphire 48-Month
 * No Sapphire bonus if you received any Sapphire bonus in last 48 months.
 * CSR bonus blocks CSP and vice versa. Only matters if bonus_achieved === true.
 */
export function chaseSapphire48(
  apps: Application[],
  referenceMonth?: string,
): RuleResult {
  const ref = referenceMonth ?? currentMonth();
  const valid = nonDeniedApps(apps);

  // Find any Sapphire app where bonus was achieved in last 48 months
  const sapphireApps = countInLastNMonths(valid, 48, ref).filter(
    (a) => a.issuer === 'chase' && isSapphireProduct(a.card_name) && a.bonus_achieved,
  );

  const isBlocked = sapphireApps.length > 0;
  let eligibleAfter: string | null = null;
  let daysUntilClear: number | null = null;

  if (isBlocked) {
    // Find the most recent Sapphire bonus
    const sorted = [...sapphireApps].sort((a, b) => b.applied_month.localeCompare(a.applied_month));
    eligibleAfter = addMonthsToMonthString(sorted[0].applied_month, 48);
    const refDate = monthToDate(ref);
    const clearDate = monthToDate(eligibleAfter);
    daysUntilClear = Math.max(0, Math.ceil((clearDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)));
  }

  return {
    rule_id: 'chase_sapphire_48',
    issuer: 'chase',
    status: isBlocked ? 'blocked' : 'clear',
    current_value: sapphireApps.length,
    limit_value: 0,
    eligible_after: eligibleAfter,
    days_until_clear: daysUntilClear,
    message: isBlocked
      ? `Sapphire bonus received — ineligible until ${eligibleAfter}.`
      : 'Eligible for Sapphire bonus.',
    applications_considered: sapphireApps.map((a) => a.id),
  };
}

/**
 * Rule 3: Amex 1-in-90 (Credit Cards)
 * Max 1 new Amex credit card per 90 days. Charge cards exempt.
 * Business credit cards count against personal pace.
 */
export function amex1in90(
  apps: Application[],
  referenceMonth?: string,
): RuleResult {
  const ref = referenceMonth ?? currentMonth();
  const refDate = monthToDate(ref);
  const valid = nonDeniedApps(apps);

  // Amex credit cards (not charge cards) in last 90 days
  const amexCredit = appsInLastNDays(valid, 90, refDate).filter(
    (a) => a.issuer === 'amex' && !isChargeCard(a.card_name),
  );

  const count = amexCredit.length;
  const limit = 1;
  const status = count >= limit ? 'warning' : 'clear';

  let eligibleAfter: string | null = null;
  let daysUntilClear: number | null = null;

  if (count >= limit) {
    const oldest = [...amexCredit].sort((a, b) => getAppDate(a).getTime() - getAppDate(b).getTime())[0];
    const clearDate = new Date(getAppDate(oldest).getTime() + 91 * 24 * 60 * 60 * 1000);
    eligibleAfter = `${clearDate.getFullYear()}-${String(clearDate.getMonth() + 1).padStart(2, '0')}`;
    daysUntilClear = Math.max(0, daysBetween(refDate, clearDate));
  }

  return {
    rule_id: 'amex_1_in_90',
    issuer: 'amex',
    status,
    current_value: count,
    limit_value: limit,
    eligible_after: eligibleAfter,
    days_until_clear: daysUntilClear,
    message: count >= limit
      ? `${count} Amex credit card(s) in last 90 days — pace yourself.`
      : 'Clear to apply for an Amex credit card.',
    applications_considered: amexCredit.map((a) => a.id),
  };
}

/**
 * Rule 4: Amex 2-in-90 (Credit Cards)
 * Hard limit: max 2 credit cards in 90 days. Same charge card exemption.
 */
export function amex2in90(
  apps: Application[],
  referenceMonth?: string,
): RuleResult {
  const ref = referenceMonth ?? currentMonth();
  const refDate = monthToDate(ref);
  const valid = nonDeniedApps(apps);

  const amexCredit = appsInLastNDays(valid, 90, refDate).filter(
    (a) => a.issuer === 'amex' && !isChargeCard(a.card_name),
  );

  const count = amexCredit.length;
  const limit = 2;
  const status = count >= limit ? 'blocked' : 'clear';

  let eligibleAfter: string | null = null;
  let daysUntilClear: number | null = null;

  if (count >= limit) {
    const sorted = [...amexCredit].sort((a, b) => getAppDate(a).getTime() - getAppDate(b).getTime());
    const dropOff = sorted[count - limit];
    const clearDate = new Date(getAppDate(dropOff).getTime() + 91 * 24 * 60 * 60 * 1000);
    eligibleAfter = `${clearDate.getFullYear()}-${String(clearDate.getMonth() + 1).padStart(2, '0')}`;
    daysUntilClear = Math.max(0, daysBetween(refDate, clearDate));
  }

  return {
    rule_id: 'amex_2_in_90',
    issuer: 'amex',
    status,
    current_value: count,
    limit_value: limit,
    eligible_after: eligibleAfter,
    days_until_clear: daysUntilClear,
    message: count >= limit
      ? `${count} Amex credit cards in 90 days — hard limit reached.`
      : `${count}/2 Amex credit cards in last 90 days.`,
    applications_considered: amexCredit.map((a) => a.id),
  };
}

/**
 * Rule 5: Amex 4/5 Credit Card Limit
 * Max 5 open credit cards simultaneously. Charge cards don't count.
 * Only OPEN (active) cards count — closed cards excluded.
 */
export function amexCreditLimit(
  apps: Application[],
): RuleResult {
  const valid = apps.filter(
    (a) =>
      a.issuer === 'amex' &&
      a.status === 'active' &&
      !isChargeCard(a.card_name),
  );

  const count = valid.length;
  const limit = 5;
  const status = count >= limit ? 'blocked' : count >= 4 ? 'warning' : 'clear';

  return {
    rule_id: 'amex_credit_limit',
    issuer: 'amex',
    status,
    current_value: count,
    limit_value: limit,
    eligible_after: null,
    days_until_clear: null,
    message: count >= limit
      ? `${count} open Amex credit cards — at the limit. Close one to open a new one.`
      : `${count}/5 open Amex credit cards.`,
    applications_considered: valid.map((a) => a.id),
  };
}

/**
 * Rule 6: Amex Once-Per-Lifetime
 * Signup bonus once per lifetime per card product/family.
 * Gold and Rose Gold are the same product.
 * Business and Personal versions are SEPARATE products.
 * Returns one RuleResult per family that has been burned.
 */
export function amexLifetime(
  apps: Application[],
  targetCardName?: string,
): RuleResult[] {
  const results: RuleResult[] = [];

  // Group all Amex apps by family
  const familyMap = new Map<string, Application[]>();
  for (const app of apps) {
    if (app.issuer !== 'amex') continue;
    const family = getCardFamily(app.card_name, 'amex');
    if (!family) continue;
    if (!familyMap.has(family)) familyMap.set(family, []);
    familyMap.get(family)!.push(app);
  }

  // If a target card is specified, only check that family
  const targetFamily = targetCardName ? getCardFamily(targetCardName, 'amex') : null;

  for (const [family, familyApps] of familyMap) {
    if (targetFamily && family !== targetFamily) continue;

    const burned = familyApps.some(
      (a) => a.bonus_achieved || (a as any).bonus_lifetime_burned,
    );

    if (burned) {
      results.push({
        rule_id: 'amex_lifetime',
        issuer: 'amex',
        status: 'blocked',
        current_value: 1,
        limit_value: 0,
        eligible_after: null,
        days_until_clear: null,
        message: `Lifetime bonus already earned for ${familyApps[0].card_name} family.`,
        applications_considered: familyApps.filter((a) => a.bonus_achieved).map((a) => a.id),
      });
    }
  }

  // If target specified and no burn found, return clear
  if (targetFamily && results.length === 0) {
    return [{
      rule_id: 'amex_lifetime',
      issuer: 'amex',
      status: 'clear',
      current_value: 0,
      limit_value: 0,
      eligible_after: null,
      days_until_clear: null,
      message: 'Eligible for this Amex signup bonus.',
      applications_considered: [],
    }];
  }

  return results;
}

/**
 * Rule 7: Citi 8-Day Rule
 * Max 1 Citi personal card per 8 calendar days.
 * Personal only — business cards exempt.
 */
export function citi8Day(
  apps: Application[],
  referenceMonth?: string,
): RuleResult {
  const ref = referenceMonth ?? currentMonth();
  const refDate = monthToDate(ref);
  const valid = nonDeniedApps(apps);

  const citiPersonal = appsInLastNDays(valid, 8, refDate).filter(
    (a) => a.issuer === 'citi' && a.card_type === 'personal',
  );

  const count = citiPersonal.length;
  const limit = 1;
  const status = count >= limit ? 'blocked' : 'clear';

  let eligibleAfter: string | null = null;
  let daysUntilClear: number | null = null;

  if (count >= limit) {
    const mostRecent = [...citiPersonal].sort((a, b) => getAppDate(b).getTime() - getAppDate(a).getTime())[0];
    const clearDate = new Date(getAppDate(mostRecent).getTime() + 9 * 24 * 60 * 60 * 1000);
    eligibleAfter = `${clearDate.getFullYear()}-${String(clearDate.getMonth() + 1).padStart(2, '0')}`;
    daysUntilClear = Math.max(0, daysBetween(refDate, clearDate));
  }

  return {
    rule_id: 'citi_8_day',
    issuer: 'citi',
    status,
    current_value: count,
    limit_value: limit,
    eligible_after: eligibleAfter,
    days_until_clear: daysUntilClear,
    message: count >= limit
      ? 'Applied for Citi personal card within 8 days — wait before next application.'
      : 'Clear for a Citi personal card application.',
    applications_considered: citiPersonal.map((a) => a.id),
  };
}

/**
 * Rule 8: Citi 65-Day Rule
 * Max 2 Citi personal cards per 65 days.
 */
export function citi65Day(
  apps: Application[],
  referenceMonth?: string,
): RuleResult {
  const ref = referenceMonth ?? currentMonth();
  const refDate = monthToDate(ref);
  const valid = nonDeniedApps(apps);

  const citiPersonal = appsInLastNDays(valid, 65, refDate).filter(
    (a) => a.issuer === 'citi' && a.card_type === 'personal',
  );

  const count = citiPersonal.length;
  const limit = 2;
  const status = count >= limit ? 'blocked' : 'clear';

  let eligibleAfter: string | null = null;
  let daysUntilClear: number | null = null;

  if (count >= limit) {
    const sorted = [...citiPersonal].sort((a, b) => getAppDate(a).getTime() - getAppDate(b).getTime());
    const dropOff = sorted[count - limit];
    const clearDate = new Date(getAppDate(dropOff).getTime() + 66 * 24 * 60 * 60 * 1000);
    eligibleAfter = `${clearDate.getFullYear()}-${String(clearDate.getMonth() + 1).padStart(2, '0')}`;
    daysUntilClear = Math.max(0, daysBetween(refDate, clearDate));
  }

  return {
    rule_id: 'citi_65_day',
    issuer: 'citi',
    status,
    current_value: count,
    limit_value: limit,
    eligible_after: eligibleAfter,
    days_until_clear: daysUntilClear,
    message: count >= limit
      ? `${count} Citi personal cards in 65 days — at the limit.`
      : `${count}/2 Citi personal cards in last 65 days.`,
    applications_considered: citiPersonal.map((a) => a.id),
  };
}

/**
 * Rule 9: Citi 24-Month Bonus Rule
 * No bonus if received OR closed same card product in last 24 months.
 * Unique: uses max(bonus_received_date, closed_date) + 24 months.
 * Returns one RuleResult per card product.
 */
export function citi24MonthBonus(
  apps: Application[],
  referenceMonth?: string,
): RuleResult[] {
  const ref = referenceMonth ?? currentMonth();
  const results: RuleResult[] = [];

  const citiApps = apps.filter((a) => a.issuer === 'citi');

  // Group by card_name (normalized)
  const byProduct = new Map<string, Application[]>();
  for (const app of citiApps) {
    const key = app.card_name.toLowerCase().trim();
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key)!.push(app);
  }

  for (const [product, productApps] of byProduct) {
    for (const app of productApps) {
      // Check bonus received or card closed in last 24 months
      const bonusMonth = app.bonus_achieved ? app.applied_month : null;
      const closedMonth = app.closed_at
        ? app.closed_at.substring(0, 7)
        : null;

      // Use the later of the two dates
      let restrictionMonth: string | null = null;
      if (bonusMonth && closedMonth) {
        restrictionMonth = bonusMonth > closedMonth ? bonusMonth : closedMonth;
      } else {
        restrictionMonth = bonusMonth ?? closedMonth;
      }

      if (!restrictionMonth) continue;

      const diff = getMonthDiff(ref, restrictionMonth);
      if (diff < 24) {
        const eligibleAfter = addMonthsToMonthString(restrictionMonth, 24);
        const refDate = monthToDate(ref);
        const clearDate = monthToDate(eligibleAfter);
        const daysUntilClear = Math.max(0, Math.ceil((clearDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)));

        results.push({
          rule_id: 'citi_24_month_bonus',
          issuer: 'citi',
          status: 'blocked',
          current_value: diff,
          limit_value: 24,
          eligible_after: eligibleAfter,
          days_until_clear: daysUntilClear,
          message: `${app.card_name} bonus/closure within 24 months — ineligible until ${eligibleAfter}.`,
          applications_considered: [app.id],
        });
        break; // Only one result per product
      }
    }
  }

  return results;
}

/**
 * Rule 10: Capital One 6-Month
 * ~1 personal card per 6 months (soft rule — warning, not block).
 * Business cards don't count.
 */
export function capitalOne6Month(
  apps: Application[],
  referenceMonth?: string,
): RuleResult {
  const ref = referenceMonth ?? currentMonth();
  const valid = nonDeniedApps(apps);

  const capOnePersonal = countInLastNMonths(valid, 6, ref).filter(
    (a) => a.issuer === 'capital_one' && a.card_type === 'personal',
  );

  const count = capOnePersonal.length;
  const limit = 1;
  const status = count >= limit ? 'warning' : 'clear';

  let eligibleAfter: string | null = null;
  let daysUntilClear: number | null = null;

  if (count >= limit) {
    const sorted = [...capOnePersonal].sort((a, b) => a.applied_month.localeCompare(b.applied_month));
    eligibleAfter = addMonthsToMonthString(sorted[0].applied_month, 6);
    const refDate = monthToDate(ref);
    const clearDate = monthToDate(eligibleAfter);
    daysUntilClear = Math.max(0, Math.ceil((clearDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)));
  }

  return {
    rule_id: 'capital_one_6_month',
    issuer: 'capital_one',
    status,
    current_value: count,
    limit_value: limit,
    eligible_after: eligibleAfter,
    days_until_clear: daysUntilClear,
    message: count >= limit
      ? `Applied for Capital One personal card within 6 months — may face denial.`
      : 'Clear for a Capital One application.',
    applications_considered: capOnePersonal.map((a) => a.id),
  };
}

/**
 * Rule 11: BofA 2/3/4
 * 2 cards in 2 months (60 days), 3 in 12 months, 4 in 24 months.
 * Business cards DO count.
 */
export function bofa234(
  apps: Application[],
  referenceMonth?: string,
): RuleResult {
  const ref = referenceMonth ?? currentMonth();
  const valid = nonDeniedApps(apps).filter((a) => a.issuer === 'bank_of_america');

  const in2m = countInLastNMonths(valid, 2, ref).length;
  const in12m = countInLastNMonths(valid, 12, ref).length;
  const in24m = countInLastNMonths(valid, 24, ref).length;

  let status: 'clear' | 'warning' | 'blocked' = 'clear';
  let message = '';
  let currentValue = 0;
  let limitValue = 0;

  if (in2m >= 2) {
    status = 'blocked';
    message = `${in2m} BofA cards in 2 months — at the 2/2 limit.`;
    currentValue = in2m;
    limitValue = 2;
  } else if (in12m >= 3) {
    status = 'blocked';
    message = `${in12m} BofA cards in 12 months — at the 3/12 limit.`;
    currentValue = in12m;
    limitValue = 3;
  } else if (in24m >= 4) {
    status = 'blocked';
    message = `${in24m} BofA cards in 24 months — at the 4/24 limit.`;
    currentValue = in24m;
    limitValue = 4;
  } else {
    message = `BofA: ${in2m}/2 (2mo), ${in12m}/3 (12mo), ${in24m}/4 (24mo) — clear.`;
    currentValue = in24m;
    limitValue = 4;
  }

  const allConsidered = countInLastNMonths(valid, 24, ref);

  return {
    rule_id: 'bofa_2_3_4',
    issuer: 'bank_of_america',
    status,
    current_value: currentValue,
    limit_value: limitValue,
    eligible_after: null,
    days_until_clear: null,
    message,
    applications_considered: allConsidered.map((a) => a.id),
  };
}

/**
 * Rule 12: Discover Once-Per-Lifetime
 * Discover IT bonus is once per lifetime. Discover Miles is separate.
 */
export function discoverLifetime(
  apps: Application[],
  targetCardName?: string,
): RuleResult {
  const discoverApps = apps.filter((a) => a.issuer === 'discover');
  const targetFamily = targetCardName
    ? getCardFamily(targetCardName, 'discover')
    : 'discover_it';

  const burned = discoverApps.some((a) => {
    const family = getCardFamily(a.card_name, 'discover');
    return family === targetFamily && a.bonus_achieved;
  });

  return {
    rule_id: 'discover_lifetime',
    issuer: 'discover',
    status: burned ? 'blocked' : 'clear',
    current_value: burned ? 1 : 0,
    limit_value: 0,
    eligible_after: null,
    days_until_clear: null,
    message: burned
      ? 'Discover bonus already earned for this product family.'
      : 'Eligible for Discover signup bonus.',
    applications_considered: discoverApps.filter((a) => a.bonus_achieved).map((a) => a.id),
  };
}

/**
 * Rule 13: Barclays 6/24
 * Denied if 6+ total cards in 24 months from ANY issuer.
 * Business cards INCLUDED (unlike Chase 5/24).
 */
export function barclays624(
  apps: Application[],
  referenceMonth?: string,
): RuleResult {
  const ref = referenceMonth ?? currentMonth();
  const valid = nonDeniedApps(apps);

  // ALL cards from ALL issuers in last 24 months
  const counting = countInLastNMonths(valid, 24, ref);
  const count = counting.length;
  const limit = 6;

  let eligibleAfter: string | null = null;
  let daysUntilClear: number | null = null;

  if (count >= limit) {
    const sorted = [...counting].sort((a, b) => a.applied_month.localeCompare(b.applied_month));
    const dropoffIndex = count - limit;
    if (dropoffIndex < sorted.length) {
      eligibleAfter = addMonthsToMonthString(sorted[dropoffIndex].applied_month, 24);
      const refDate = monthToDate(ref);
      const clearDate = monthToDate(eligibleAfter);
      daysUntilClear = Math.max(0, Math.ceil((clearDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  const status = count >= limit ? 'blocked' : count >= 5 ? 'warning' : 'clear';

  return {
    rule_id: 'barclays_6_24',
    issuer: 'barclays',
    status,
    current_value: count,
    limit_value: limit,
    eligible_after: eligibleAfter,
    days_until_clear: daysUntilClear,
    message: count >= limit
      ? `${count} total cards in 24 months — Barclays likely to deny (6/24 rule).`
      : `${count}/6 total cards in 24 months for Barclays.`,
    applications_considered: counting.map((a) => a.id),
  };
}

/**
 * Rule 14: US Bank 2/30
 * Max 2 US Bank cards in any 30-day window.
 */
export function usBank230(
  apps: Application[],
  referenceMonth?: string,
): RuleResult {
  const ref = referenceMonth ?? currentMonth();
  const refDate = monthToDate(ref);
  const valid = nonDeniedApps(apps);

  const usBankApps = appsInLastNDays(valid, 30, refDate).filter(
    (a) => a.issuer === 'us_bank',
  );

  const count = usBankApps.length;
  const limit = 2;
  const status = count >= limit ? 'blocked' : 'clear';

  let eligibleAfter: string | null = null;
  let daysUntilClear: number | null = null;

  if (count >= limit) {
    const sorted = [...usBankApps].sort((a, b) => getAppDate(a).getTime() - getAppDate(b).getTime());
    const dropOff = sorted[count - limit];
    const clearDate = new Date(getAppDate(dropOff).getTime() + 31 * 24 * 60 * 60 * 1000);
    eligibleAfter = `${clearDate.getFullYear()}-${String(clearDate.getMonth() + 1).padStart(2, '0')}`;
    daysUntilClear = Math.max(0, daysBetween(refDate, clearDate));
  }

  return {
    rule_id: 'us_bank_2_30',
    issuer: 'us_bank',
    status,
    current_value: count,
    limit_value: limit,
    eligible_after: eligibleAfter,
    days_until_clear: daysUntilClear,
    message: count >= limit
      ? `${count} US Bank cards in 30 days — at the limit.`
      : `${count}/2 US Bank cards in last 30 days.`,
    applications_considered: usBankApps.map((a) => a.id),
  };
}
