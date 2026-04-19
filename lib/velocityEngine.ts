// ============================================================
// Velocity Engine — computes all 14 issuer rules for a member
// and aggregates into a single VelocityReport.
// Performance target: <50ms for 50 applications.
// ============================================================

import type { Application, Issuer } from './applicationTypes';
import { ISSUER_LABELS } from './applicationTypes';
import type { RuleResult } from './issuerRules';
import {
  chase524,
  chaseSapphire48,
  amex1in90,
  amex2in90,
  amexCreditLimit,
  amexLifetime,
  citi8Day,
  citi65Day,
  citi24MonthBonus,
  capitalOne6Month,
  bofa234,
  discoverLifetime,
  barclays624,
  usBank230,
  currentMonth,
} from './issuerRules';

// ─── VelocityReport ─────────────────────────────────────────────────────────

export type VelocityReport = {
  member_id: string;
  chase: { five_twenty_four: RuleResult; sapphire_48: RuleResult };
  amex: { one_in_90: RuleResult; two_in_90: RuleResult; credit_limit: RuleResult; lifetime: RuleResult[] };
  citi: { eight_day: RuleResult; sixty_five_day: RuleResult; bonus_24: RuleResult[] };
  capital_one: { six_month: RuleResult };
  bofa: { two_three_four: RuleResult };
  discover: { lifetime: RuleResult };
  barclays: { six_24: RuleResult };
  us_bank: { two_30: RuleResult };
  overall_status: 'clear' | 'some_warnings' | 'some_blocked';
  blocked_issuers: Issuer[];
  warning_issuers: Issuer[];
  all_rules: RuleResult[];
  optimal_next: string | null;
};

// ─── Engine ─────────────────────────────────────────────────────────────────

export function computeVelocity(
  applications: Application[],
  memberId: string,
  referenceDate?: string,
): VelocityReport {
  const ref = referenceDate ?? currentMonth();

  // Filter to this household member
  const memberApps = applications.filter(
    (a) => a.household_member_id === memberId,
  );

  // Run all 14 rules
  const chaseResult = chase524(memberApps, ref);
  const sapphireResult = chaseSapphire48(memberApps, ref);
  const amex1 = amex1in90(memberApps, ref);
  const amex2 = amex2in90(memberApps, ref);
  const amexLimit = amexCreditLimit(memberApps);
  const amexLife = amexLifetime(memberApps);
  const citi8 = citi8Day(memberApps, ref);
  const citi65 = citi65Day(memberApps, ref);
  const citi24 = citi24MonthBonus(memberApps, ref);
  const capOne = capitalOne6Month(memberApps, ref);
  const bofaResult = bofa234(memberApps, ref);
  const discoverResult = discoverLifetime(memberApps);
  const barclaysResult = barclays624(memberApps, ref);
  const usBankResult = usBank230(memberApps, ref);

  // Collect all rule results into a flat array
  const allRules: RuleResult[] = [
    chaseResult,
    sapphireResult,
    amex1,
    amex2,
    amexLimit,
    ...amexLife,
    citi8,
    citi65,
    ...citi24,
    capOne,
    bofaResult,
    discoverResult,
    barclaysResult,
    usBankResult,
  ];

  // Aggregate blocked/warning issuers
  const blockedSet = new Set<Issuer>();
  const warningSet = new Set<Issuer>();

  for (const r of allRules) {
    if (r.status === 'blocked') blockedSet.add(r.issuer);
    else if (r.status === 'warning') warningSet.add(r.issuer);
  }

  // Remove from warning set if also blocked
  for (const i of blockedSet) warningSet.delete(i);

  const blocked_issuers = Array.from(blockedSet);
  const warning_issuers = Array.from(warningSet);

  let overall_status: 'clear' | 'some_warnings' | 'some_blocked' = 'clear';
  if (blocked_issuers.length > 0) overall_status = 'some_blocked';
  else if (warning_issuers.length > 0) overall_status = 'some_warnings';

  // Compute optimal next recommendation
  const optimal_next = computeOptimalNext(allRules, blocked_issuers, warning_issuers);

  return {
    member_id: memberId,
    chase: { five_twenty_four: chaseResult, sapphire_48: sapphireResult },
    amex: { one_in_90: amex1, two_in_90: amex2, credit_limit: amexLimit, lifetime: amexLife },
    citi: { eight_day: citi8, sixty_five_day: citi65, bonus_24: citi24 },
    capital_one: { six_month: capOne },
    bofa: { two_three_four: bofaResult },
    discover: { lifetime: discoverResult },
    barclays: { six_24: barclaysResult },
    us_bank: { two_30: usBankResult },
    overall_status,
    blocked_issuers,
    warning_issuers,
    all_rules: allRules,
    optimal_next,
  };
}

// ─── Optimal Next ───────────────────────────────────────────────────────────

const ISSUER_PRIORITY: Issuer[] = [
  'chase', 'amex', 'citi', 'capital_one',
  'bank_of_america', 'barclays', 'us_bank', 'discover',
];

function computeOptimalNext(
  allRules: RuleResult[],
  blocked: Issuer[],
  warnings: Issuer[],
): string | null {
  const blockedSet = new Set(blocked);
  const warningSet = new Set(warnings);

  // Find the highest-priority issuer that's clear
  const clearIssuers = ISSUER_PRIORITY.filter(
    (i) => !blockedSet.has(i) && !warningSet.has(i),
  );

  if (clearIssuers.length === 0 && blocked.length === ISSUER_PRIORITY.length) {
    // Find the earliest unblock
    const rulesWithDates = allRules.filter(
      (r) => r.status === 'blocked' && r.eligible_after,
    );
    if (rulesWithDates.length > 0) {
      const earliest = rulesWithDates.sort(
        (a, b) => a.eligible_after!.localeCompare(b.eligible_after!),
      )[0];
      return `All major issuers are restricted. Next opening: ${ISSUER_LABELS[earliest.issuer]} clears ${earliest.eligible_after}.`;
    }
    return 'All major issuers are currently restricted. Consider waiting before your next application.';
  }

  // Special: if Chase is clear and under 5/24, prioritize Chase
  const chaseRule = allRules.find((r) => r.rule_id === 'chase_5_24');
  if (chaseRule && chaseRule.status === 'clear' && (chaseRule.current_value ?? 0) <= 3) {
    return `Chase is clear at ${chaseRule.current_value}/5 — prioritize Chase cards before other issuers push you over 5/24.`;
  }

  if (chaseRule && chaseRule.status === 'warning') {
    return `At ${chaseRule.current_value}/5 with Chase — one slot left. Apply for your most-wanted Chase card now.`;
  }

  if (clearIssuers.length > 0) {
    const labels = clearIssuers.slice(0, 3).map((i) => ISSUER_LABELS[i]);
    return `Clear for: ${labels.join(', ')}. Consider your highest-value target.`;
  }

  if (warnings.length > 0 && blocked.length === 0) {
    return 'Some velocity cautions — proceed carefully with your next application.';
  }

  return null;
}

// ─── Summary Helpers (for dashboard display) ────────────────────────────────

export function countByStatus(report: VelocityReport): {
  clear: number;
  warning: number;
  blocked: number;
} {
  const issuers: Issuer[] = [
    'chase', 'amex', 'citi', 'capital_one',
    'bank_of_america', 'discover', 'barclays', 'us_bank',
  ];

  const blockedSet = new Set(report.blocked_issuers);
  const warningSet = new Set(report.warning_issuers);

  return {
    clear: issuers.filter((i) => !blockedSet.has(i) && !warningSet.has(i)).length,
    warning: warningSet.size,
    blocked: blockedSet.size,
  };
}

/** Get the primary rule result for an issuer (the one that matters most for display) */
export function getPrimaryRule(report: VelocityReport, issuer: Issuer): RuleResult | null {
  switch (issuer) {
    case 'chase': return report.chase.five_twenty_four;
    case 'amex': return report.amex.two_in_90;
    case 'citi': return report.citi.sixty_five_day;
    case 'capital_one': return report.capital_one.six_month;
    case 'bank_of_america': return report.bofa.two_three_four;
    case 'discover': return report.discover.lifetime;
    case 'barclays': return report.barclays.six_24;
    case 'us_bank': return report.us_bank.two_30;
    default: return null;
  }
}

/** Get all rule results for an issuer */
export function getIssuerRules(report: VelocityReport, issuer: Issuer): RuleResult[] {
  switch (issuer) {
    case 'chase':
      return [report.chase.five_twenty_four, report.chase.sapphire_48];
    case 'amex':
      return [report.amex.one_in_90, report.amex.two_in_90, report.amex.credit_limit, ...report.amex.lifetime];
    case 'citi':
      return [report.citi.eight_day, report.citi.sixty_five_day, ...report.citi.bonus_24];
    case 'capital_one':
      return [report.capital_one.six_month];
    case 'bank_of_america':
      return [report.bofa.two_three_four];
    case 'discover':
      return [report.discover.lifetime];
    case 'barclays':
      return [report.barclays.six_24];
    case 'us_bank':
      return [report.us_bank.two_30];
    default:
      return [];
  }
}

/** Worst status from a list of rules */
export function worstStatus(rules: RuleResult[]): 'clear' | 'warning' | 'blocked' {
  if (rules.some((r) => r.status === 'blocked')) return 'blocked';
  if (rules.some((r) => r.status === 'warning')) return 'warning';
  return 'clear';
}
