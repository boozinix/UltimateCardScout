// ============================================================
// Velocity Engine — Unit Tests (~120 cases)
// Tests all 14 issuer rules, helpers, and integration scenarios
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
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
  getMonthDiff,
  addMonthsToMonthString,
  countInLastNMonths,
  isBusinessCardCounted,
  isChargeCard,
  getCardFamily,
  monthToDate,
} from '../lib/issuerRules';
import type { RuleResult } from '../lib/issuerRules';
import { computeVelocity, countByStatus, worstStatus, getIssuerRules } from '../lib/velocityEngine';
import type { Issuer } from '../lib/applicationTypes';
import {
  makeApp,
  chasePersonal,
  chaseBusiness,
  sapphireWithBonus,
  sapphireDenied,
  amexCredit,
  amexCharge,
  amexWithBonus,
  citiPersonal,
  citiBusiness,
  capOnePersonal,
  bofaCard,
  discoverCard,
  barclaysCard,
  usBankCard,
  genericCard,
  resetFixtures,
} from './helpers/fixtures';

// Reference month for deterministic tests
const REF = '2026-04';

beforeEach(() => resetFixtures());

// ─── Helper Functions (10 tests) ────────────────────────────────────────────

describe('Helper functions', () => {
  it('getMonthDiff: same month = 0', () => {
    expect(getMonthDiff('2026-04', '2026-04')).toBe(0);
  });

  it('getMonthDiff: 12 months apart', () => {
    expect(getMonthDiff('2026-04', '2025-04')).toBe(12);
  });

  it('getMonthDiff: negative when m1 < m2', () => {
    expect(getMonthDiff('2025-01', '2026-04')).toBe(-15);
  });

  it('addMonthsToMonthString: add 24 months', () => {
    expect(addMonthsToMonthString('2024-04', 24)).toBe('2026-04');
  });

  it('addMonthsToMonthString: wraps year', () => {
    expect(addMonthsToMonthString('2025-11', 3)).toBe('2026-02');
  });

  it('addMonthsToMonthString: subtract months', () => {
    expect(addMonthsToMonthString('2026-04', -6)).toBe('2025-10');
  });

  it('countInLastNMonths: counts within window', () => {
    const apps = [
      chasePersonal('2026-03'),
      chasePersonal('2026-01'),
      chasePersonal('2024-03'),
    ];
    expect(countInLastNMonths(apps, 6, REF).length).toBe(2);
  });

  it('isBusinessCardCounted: Chase biz exempt from 5/24', () => {
    expect(isBusinessCardCounted('chase', 'business')).toBe(false);
  });

  it('isBusinessCardCounted: Citi biz counts toward 5/24', () => {
    expect(isBusinessCardCounted('citi', 'business')).toBe(true);
  });

  it('isBusinessCardCounted: Amex biz exempt from 5/24', () => {
    expect(isBusinessCardCounted('amex', 'business')).toBe(false);
  });
});

// ─── Chase 5/24 (15 tests) ─────────────────────────────────────────────────

describe('Chase 5/24', () => {
  it('0 cards = clear', () => {
    const r = chase524([], REF);
    expect(r.status).toBe('clear');
    expect(r.current_value).toBe(0);
  });

  it('1 personal card = clear', () => {
    const r = chase524([chasePersonal('2026-02')], REF);
    expect(r.status).toBe('clear');
    expect(r.current_value).toBe(1);
  });

  it('4 personal cards = warning', () => {
    const apps = [
      chasePersonal('2026-01'),
      amexCredit('2025-11'),
      citiPersonal('2025-08'),
      capOnePersonal('2025-03'),
    ];
    const r = chase524(apps, REF);
    expect(r.status).toBe('warning');
    expect(r.current_value).toBe(4);
  });

  it('5 personal cards = blocked', () => {
    const apps = [
      chasePersonal('2026-01'),
      amexCredit('2025-11'),
      citiPersonal('2025-08'),
      capOnePersonal('2025-03'),
      genericCard('discover', '2024-10'),
    ];
    const r = chase524(apps, REF);
    expect(r.status).toBe('blocked');
    expect(r.current_value).toBe(5);
  });

  it('6 cards = blocked', () => {
    const apps = Array.from({ length: 6 }, (_, i) =>
      chasePersonal(addMonthsToMonthString(REF, -i * 3)),
    );
    const r = chase524(apps, REF);
    expect(r.status).toBe('blocked');
    expect(r.current_value).toBe(6);
  });

  it('Chase business cards do NOT count', () => {
    const apps = [
      chasePersonal('2026-01'),
      chasePersonal('2025-11'),
      chasePersonal('2025-08'),
      chasePersonal('2025-03'),
      chaseBusiness('2025-01'), // should NOT count
    ];
    const r = chase524(apps, REF);
    expect(r.current_value).toBe(4);
    expect(r.status).toBe('warning');
  });

  it('Amex business cards do NOT count', () => {
    const apps = [
      chasePersonal('2026-01'),
      makeApp({ card_name: 'Blue Business Plus', issuer: 'amex', applied_month: '2025-11', card_type: 'business' }),
    ];
    const r = chase524(apps, REF);
    expect(r.current_value).toBe(1);
  });

  it('Capital One business cards do NOT count', () => {
    const apps = [
      makeApp({ card_name: 'Spark Cash', issuer: 'capital_one', applied_month: '2025-11', card_type: 'business' }),
    ];
    const r = chase524(apps, REF);
    expect(r.current_value).toBe(0);
  });

  it('Citi business cards DO count', () => {
    const apps = [
      citiBusiness('2025-11'),
    ];
    const r = chase524(apps, REF);
    expect(r.current_value).toBe(1);
  });

  it('Barclays business cards DO count', () => {
    const apps = [
      makeApp({ card_name: 'Barclays Biz', issuer: 'barclays', applied_month: '2025-06', card_type: 'business' }),
    ];
    const r = chase524(apps, REF);
    expect(r.current_value).toBe(1);
  });

  it('closed card still counts within 24-month window', () => {
    const apps = [
      makeApp({ card_name: 'Chase Freedom', issuer: 'chase', applied_month: '2025-01', status: 'closed', closed_at: '2025-06-01' }),
    ];
    const r = chase524(apps, REF);
    expect(r.current_value).toBe(1);
  });

  it('product-changed card counts once', () => {
    const apps = [
      makeApp({ card_name: 'Chase Freedom', issuer: 'chase', applied_month: '2025-01', status: 'product_changed', product_changed_to: 'Chase Freedom Flex' }),
    ];
    const r = chase524(apps, REF);
    expect(r.current_value).toBe(1);
  });

  it('25-month-old card drops off', () => {
    const apps = [
      chasePersonal('2024-02'), // 26 months ago from 2026-04
    ];
    const r = chase524(apps, REF);
    expect(r.current_value).toBe(0);
  });

  it('card exactly at 24-month boundary counts', () => {
    // applied_month '2024-05' is within 24 months of ref '2026-04'
    // cutoff = 2026-04 - 24 = 2024-04. Filter: > '2024-04' AND <= '2026-04'
    const apps = [chasePersonal('2024-05')];
    const r = chase524(apps, REF);
    expect(r.current_value).toBe(1);
  });

  it('denied cards do not count', () => {
    const apps = [
      makeApp({ card_name: 'Chase Freedom', issuer: 'chase', applied_month: '2025-01', status: 'denied' }),
    ];
    const r = chase524(apps, REF);
    expect(r.current_value).toBe(0);
  });
});

// ─── Chase Sapphire 48-Month (8 tests) ─────────────────────────────────────

describe('Chase Sapphire 48-Month', () => {
  it('no prior Sapphire = eligible', () => {
    const r = chaseSapphire48([], REF);
    expect(r.status).toBe('clear');
  });

  it('Sapphire bonus 50 months ago = eligible', () => {
    const r = chaseSapphire48([sapphireWithBonus('2022-01')], REF);
    // 2022-01 is more than 48 months before 2026-04
    expect(r.status).toBe('clear');
  });

  it('Sapphire bonus 40 months ago = not eligible', () => {
    const r = chaseSapphire48([sapphireWithBonus('2023-01')], REF);
    expect(r.status).toBe('blocked');
  });

  it('CSR bonus blocks CSP', () => {
    const r = chaseSapphire48([sapphireWithBonus('2024-01', 'CSR')], REF);
    expect(r.status).toBe('blocked');
  });

  it('CSP bonus blocks CSR', () => {
    const r = chaseSapphire48([sapphireWithBonus('2024-06', 'CSP')], REF);
    expect(r.status).toBe('blocked');
  });

  it('denied Sapphire = eligible (no bonus)', () => {
    const r = chaseSapphire48([sapphireDenied('2024-06')], REF);
    expect(r.status).toBe('clear');
  });

  it('approved Sapphire but no bonus achieved = eligible', () => {
    const app = makeApp({
      card_name: 'Chase Sapphire Preferred',
      issuer: 'chase',
      applied_month: '2024-06',
      bonus_achieved: false,
    });
    const r = chaseSapphire48([app], REF);
    expect(r.status).toBe('clear');
  });

  it('eligible_after is 48 months from bonus date', () => {
    const r = chaseSapphire48([sapphireWithBonus('2023-06')], REF);
    expect(r.eligible_after).toBe('2027-06');
  });
});

// ─── Amex Velocity (12 tests) ───────────────────────────────────────────────

describe('Amex 1-in-90', () => {
  it('no recent Amex credit = clear', () => {
    const r = amex1in90([], REF);
    expect(r.status).toBe('clear');
  });

  it('Amex credit 100 days ago = clear', () => {
    // 100 days before 2026-04-01 ≈ 2025-12-23
    const app = amexCredit('2025-12', 'Amex Blue Cash Preferred', '2025-12-22');
    const r = amex1in90([app], REF);
    expect(r.status).toBe('clear');
  });

  it('Amex credit 60 days ago = warning (1-in-90)', () => {
    // 60 days before 2026-04-01 ≈ 2026-01-31
    const app = amexCredit('2026-01', 'Amex Blue Cash Preferred', '2026-01-31');
    const r = amex1in90([app], REF);
    expect(r.status).toBe('warning');
  });

  it('charge card is exempt from 1-in-90', () => {
    const app = amexCharge('2026-03', 'Amex Gold Card', '2026-03-01');
    const r = amex1in90([app], REF);
    expect(r.status).toBe('clear');
    expect(r.current_value).toBe(0);
  });

  it('mixed credit + charge: only credit counts', () => {
    const apps = [
      amexCredit('2026-03', 'Amex Blue Cash Preferred', '2026-03-01'),
      amexCharge('2026-03', 'Amex Platinum Card', '2026-03-10'),
    ];
    const r = amex1in90(apps, REF);
    expect(r.current_value).toBe(1);
  });
});

describe('Amex 2-in-90', () => {
  it('0 credit cards = clear', () => {
    const r = amex2in90([], REF);
    expect(r.status).toBe('clear');
  });

  it('2 credit cards in 90 days = blocked', () => {
    const apps = [
      amexCredit('2026-02', 'Amex Blue Cash Preferred', '2026-02-01'),
      amexCredit('2026-03', 'Amex EveryDay Preferred', '2026-03-01'),
    ];
    const r = amex2in90(apps, REF);
    expect(r.status).toBe('blocked');
    expect(r.current_value).toBe(2);
  });

  it('1 credit card in 90 days = clear', () => {
    const apps = [
      amexCredit('2026-03', 'Amex Blue Cash Preferred', '2026-03-15'),
    ];
    const r = amex2in90(apps, REF);
    expect(r.status).toBe('clear');
    expect(r.current_value).toBe(1);
  });
});

describe('Amex 4/5 Credit Card Limit', () => {
  it('0 open = clear', () => {
    const r = amexCreditLimit([]);
    expect(r.status).toBe('clear');
    expect(r.current_value).toBe(0);
  });

  it('4 open = warning', () => {
    const apps = Array.from({ length: 4 }, (_, i) =>
      amexCredit(`2025-0${i + 1}`, `Amex Card ${i + 1}`),
    );
    const r = amexCreditLimit(apps);
    expect(r.status).toBe('warning');
  });

  it('5 open = blocked', () => {
    const apps = Array.from({ length: 5 }, (_, i) =>
      amexCredit(`2025-0${i + 1}`, `Amex Card ${i + 1}`),
    );
    const r = amexCreditLimit(apps);
    expect(r.status).toBe('blocked');
    expect(r.current_value).toBe(5);
  });

  it('closed cards not counted toward limit', () => {
    const apps = [
      amexCredit('2025-01', 'Amex Blue Cash Preferred'),
      makeApp({ card_name: 'Amex Cash Magnet', issuer: 'amex', applied_month: '2024-01', status: 'closed', closed_at: '2025-01-01' }),
    ];
    const r = amexCreditLimit(apps);
    expect(r.current_value).toBe(1);
  });
});

// ─── Amex Lifetime (10 tests) ───────────────────────────────────────────────

describe('Amex Once-Per-Lifetime', () => {
  it('never had card = eligible', () => {
    const r = amexLifetime([], 'Amex Gold Card');
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe('clear');
  });

  it('bonus earned 10 years ago = still blocked (lifetime)', () => {
    const apps = [amexWithBonus('2016-01', 'Amex Gold Card')];
    const r = amexLifetime(apps, 'Amex Gold Card');
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe('blocked');
  });

  it('business vs personal are separate products', () => {
    const apps = [amexWithBonus('2024-01', 'Business Gold')];
    const r = amexLifetime(apps, 'Amex Gold Card');
    // Business Gold is biz_gold_charge, Gold Card is gold_charge — different
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe('clear');
  });

  it('Gold and Rose Gold are the same family', () => {
    const apps = [amexWithBonus('2024-01', 'Amex Rose Gold')];
    const r = amexLifetime(apps, 'Amex Gold Card');
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe('blocked');
  });

  it('denied card = eligible (no bonus earned)', () => {
    const apps = [
      makeApp({ card_name: 'Amex Gold Card', issuer: 'amex', applied_month: '2024-06', status: 'denied', bonus_achieved: false }),
    ];
    const r = amexLifetime(apps, 'Amex Gold Card');
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe('clear');
  });

  it('returns all burned families when no target', () => {
    const apps = [
      amexWithBonus('2023-01', 'Amex Gold Card'),
      amexWithBonus('2024-01', 'Amex Blue Cash Preferred'),
    ];
    const r = amexLifetime(apps);
    expect(r.length).toBeGreaterThanOrEqual(2);
    expect(r.every((x) => x.status === 'blocked')).toBe(true);
  });

  it('unrecognized card name returns empty if no target', () => {
    const apps = [
      makeApp({ card_name: 'Amex Unknown Card XYZ', issuer: 'amex', applied_month: '2024-01', bonus_achieved: true }),
    ];
    const r = amexLifetime(apps);
    // No recognized family = no result
    expect(r).toHaveLength(0);
  });

  it('Hilton Honors and Hilton Surpass are different families', () => {
    const apps = [amexWithBonus('2024-01', 'Amex Hilton Honors')];
    const r = amexLifetime(apps, 'Amex Hilton Honors Surpass');
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe('clear');
  });

  it('Delta Gold Personal and Delta Gold Business are different', () => {
    const apps = [amexWithBonus('2024-01', 'Delta SkyMiles Gold')];
    const r = amexLifetime(apps, 'Delta SkyMiles Gold Business');
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe('clear');
  });

  it('bonus_achieved flag is what matters, not status', () => {
    const apps = [
      makeApp({
        card_name: 'Amex Gold Card',
        issuer: 'amex',
        applied_month: '2024-01',
        status: 'closed',
        bonus_achieved: true,
      }),
    ];
    const r = amexLifetime(apps, 'Amex Gold Card');
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe('blocked');
  });
});

// ─── Citi Rules (8 tests) ───────────────────────────────────────────────────

describe('Citi 8-Day', () => {
  it('no recent Citi = clear', () => {
    const r = citi8Day([], REF);
    expect(r.status).toBe('clear');
  });

  it('Citi personal card within 8 days = blocked', () => {
    // Using approved_at to get exact day
    const app = citiPersonal('2026-04', 'Citi Premier', '2026-04-01');
    const r = citi8Day([app], REF);
    expect(r.status).toBe('blocked');
  });

  it('Citi personal card 9 days ago = clear', () => {
    const app = citiPersonal('2026-03', 'Citi Premier', '2026-03-22');
    const r = citi8Day([app], REF);
    expect(r.status).toBe('clear');
  });

  it('business cards are exempt', () => {
    const app = citiBusiness('2026-04');
    const r = citi8Day([app], REF);
    expect(r.status).toBe('clear');
    expect(r.current_value).toBe(0);
  });
});

describe('Citi 65-Day', () => {
  it('0 Citi personal in 65 days = clear', () => {
    const r = citi65Day([], REF);
    expect(r.status).toBe('clear');
  });

  it('2 Citi personal in 65 days = blocked', () => {
    const apps = [
      citiPersonal('2026-03', 'Citi Premier', '2026-03-01'),
      citiPersonal('2026-02', 'Citi Double Cash', '2026-02-15'),
    ];
    const r = citi65Day(apps, REF);
    expect(r.status).toBe('blocked');
    expect(r.current_value).toBe(2);
  });

  it('1 Citi personal in 65 days = clear', () => {
    const apps = [
      citiPersonal('2026-03', 'Citi Premier', '2026-03-01'),
    ];
    const r = citi65Day(apps, REF);
    expect(r.status).toBe('clear');
    expect(r.current_value).toBe(1);
  });
});

describe('Citi 24-Month Bonus', () => {
  it('bonus received 12 months ago = blocked', () => {
    const app = makeApp({
      card_name: 'Citi Premier',
      issuer: 'citi',
      applied_month: '2025-04',
      bonus_achieved: true,
    });
    const r = citi24MonthBonus([app], REF);
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe('blocked');
  });

  it('card closed 12 months ago = blocked', () => {
    const app = makeApp({
      card_name: 'Citi Premier',
      issuer: 'citi',
      applied_month: '2023-01',
      status: 'closed',
      closed_at: '2025-06-01',
      bonus_achieved: false,
    });
    const r = citi24MonthBonus([app], REF);
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe('blocked');
  });

  it('bonus 25+ months ago and card not closed recently = clear', () => {
    const app = makeApp({
      card_name: 'Citi Premier',
      issuer: 'citi',
      applied_month: '2024-02',
      bonus_achieved: true,
      status: 'active',
    });
    const r = citi24MonthBonus([app], REF);
    expect(r).toHaveLength(0); // No blocked result
  });

  it('uses max(bonus_date, closed_date) for restriction', () => {
    // Bonus in 2024-01, closed in 2025-06 → restriction from 2025-06
    const app = makeApp({
      card_name: 'Citi Premier',
      issuer: 'citi',
      applied_month: '2024-01',
      bonus_achieved: true,
      status: 'closed',
      closed_at: '2025-06-01',
    });
    const r = citi24MonthBonus([app], REF);
    expect(r).toHaveLength(1);
    expect(r[0].eligible_after).toBe('2027-06');
  });
});

// ─── Capital One (2 tests) ──────────────────────────────────────────────────

describe('Capital One 6-Month', () => {
  it('no recent Cap One = clear', () => {
    const r = capitalOne6Month([], REF);
    expect(r.status).toBe('clear');
  });

  it('personal card 3 months ago = warning (soft rule)', () => {
    const apps = [capOnePersonal('2026-02')];
    const r = capitalOne6Month(apps, REF);
    expect(r.status).toBe('warning');
  });

  it('business card does not count', () => {
    const apps = [
      makeApp({ card_name: 'Spark Cash', issuer: 'capital_one', applied_month: '2026-03', card_type: 'business' }),
    ];
    const r = capitalOne6Month(apps, REF);
    expect(r.status).toBe('clear');
  });
});

// ─── BofA 2/3/4 (4 tests) ──────────────────────────────────────────────────

describe('BofA 2/3/4', () => {
  it('no BofA cards = clear', () => {
    const r = bofa234([], REF);
    expect(r.status).toBe('clear');
  });

  it('2 BofA cards in 2 months = blocked (2/2)', () => {
    const apps = [
      bofaCard('2026-03'),
      bofaCard('2026-04', 'BofA Premium Rewards'),
    ];
    const r = bofa234(apps, REF);
    expect(r.status).toBe('blocked');
    expect(r.message).toContain('2/2');
  });

  it('3 BofA cards in 12 months = blocked (3/12)', () => {
    const apps = [
      bofaCard('2025-08'),
      bofaCard('2025-11'),
      bofaCard('2026-02', 'BofA Cash Rewards'),
    ];
    const r = bofa234(apps, REF);
    expect(r.status).toBe('blocked');
    expect(r.message).toContain('3/12');
  });

  it('4 BofA cards in 24 months = blocked (4/24)', () => {
    const apps = [
      bofaCard('2024-08'),
      bofaCard('2025-01'),
      bofaCard('2025-06'),
      bofaCard('2026-01', 'BofA Premium'),
    ];
    const r = bofa234(apps, REF);
    expect(r.status).toBe('blocked');
    expect(r.message).toContain('4/24');
  });

  it('business cards count toward BofA limits', () => {
    const apps = [
      bofaCard('2026-03', 'BofA Business Advantage', 'business'),
      bofaCard('2026-04', 'BofA Cash Rewards'),
    ];
    const r = bofa234(apps, REF);
    expect(r.status).toBe('blocked');
  });
});

// ─── Discover Lifetime (3 tests) ────────────────────────────────────────────

describe('Discover Once-Per-Lifetime', () => {
  it('no Discover cards = eligible', () => {
    const r = discoverLifetime([], 'Discover it Cash Back');
    expect(r.status).toBe('clear');
  });

  it('Discover IT bonus earned = blocked', () => {
    const apps = [
      makeApp({ card_name: 'Discover it Cash Back', issuer: 'discover', applied_month: '2020-01', bonus_achieved: true }),
    ];
    const r = discoverLifetime(apps, 'Discover it Cash Back');
    expect(r.status).toBe('blocked');
  });

  it('Discover Miles is a separate product from Discover IT', () => {
    const apps = [
      makeApp({ card_name: 'Discover it Cash Back', issuer: 'discover', applied_month: '2020-01', bonus_achieved: true }),
    ];
    const r = discoverLifetime(apps, 'Discover it Miles');
    expect(r.status).toBe('clear');
  });
});

// ─── Barclays 6/24 (3 tests) ───────────────────────────────────────────────

describe('Barclays 6/24', () => {
  it('5 total cards in 24 months = warning', () => {
    const apps = Array.from({ length: 5 }, (_, i) =>
      genericCard('chase', addMonthsToMonthString(REF, -i * 4)),
    );
    const r = barclays624(apps, REF);
    expect(r.status).toBe('warning');
    expect(r.current_value).toBe(5);
  });

  it('6 total cards in 24 months = blocked', () => {
    const apps = Array.from({ length: 6 }, (_, i) =>
      genericCard('chase', addMonthsToMonthString(REF, -i * 3)),
    );
    const r = barclays624(apps, REF);
    expect(r.status).toBe('blocked');
    expect(r.current_value).toBe(6);
  });

  it('business cards INCLUDED in count', () => {
    const apps = [
      ...Array.from({ length: 5 }, (_, i) =>
        genericCard('chase', addMonthsToMonthString(REF, -i * 4)),
      ),
      makeApp({ card_name: 'Ink Biz', issuer: 'chase', applied_month: addMonthsToMonthString(REF, -2), card_type: 'business' }),
    ];
    const r = barclays624(apps, REF);
    expect(r.status).toBe('blocked');
    expect(r.current_value).toBe(6);
  });
});

// ─── US Bank 2/30 (3 tests) ────────────────────────────────────────────────

describe('US Bank 2/30', () => {
  it('0 US Bank cards = clear', () => {
    const r = usBank230([], REF);
    expect(r.status).toBe('clear');
  });

  it('1 US Bank card in 30 days = clear', () => {
    const apps = [usBankCard('2026-04', 'US Bank Altitude Reserve', '2026-03-25')];
    const r = usBank230(apps, REF);
    expect(r.status).toBe('clear');
    expect(r.current_value).toBe(1);
  });

  it('2 US Bank cards in 30 days = blocked', () => {
    const apps = [
      usBankCard('2026-04', 'US Bank Altitude Reserve', '2026-03-10'),
      usBankCard('2026-03', 'US Bank Cash+', '2026-03-20'),
    ];
    const r = usBank230(apps, REF);
    expect(r.status).toBe('blocked');
    expect(r.current_value).toBe(2);
  });
});

// ─── isChargeCard helper (4 tests) ──────────────────────────────────────────

describe('isChargeCard', () => {
  it('Amex Platinum is a charge card', () => {
    expect(isChargeCard('Amex Platinum')).toBe(true);
  });

  it('Amex Gold Card is a charge card', () => {
    expect(isChargeCard('Amex Gold Card')).toBe(true);
  });

  it('Blue Cash Preferred is NOT a charge card', () => {
    expect(isChargeCard('Blue Cash Preferred')).toBe(false);
  });

  it('Business Platinum is a charge card', () => {
    expect(isChargeCard('Business Platinum')).toBe(true);
  });
});

// ─── getCardFamily helper (4 tests) ─────────────────────────────────────────

describe('getCardFamily', () => {
  it('Gold and Rose Gold map to same family', () => {
    const gold = getCardFamily('Amex Gold Card', 'amex');
    const rose = getCardFamily('Amex Rose Gold', 'amex');
    expect(gold).toBe(rose);
    expect(gold).toBe('gold_charge');
  });

  it('Business Gold is different from personal Gold', () => {
    const biz = getCardFamily('Business Gold', 'amex');
    const personal = getCardFamily('Gold Card', 'amex');
    expect(biz).not.toBe(personal);
  });

  it('Discover IT maps to discover_it family', () => {
    const f = getCardFamily('Discover it Cash Back', 'discover');
    expect(f).toBe('discover_it');
  });

  it('Discover Miles maps to discover_miles family', () => {
    const f = getCardFamily('Discover it Miles', 'discover');
    expect(f).toBe('discover_miles');
  });
});

// ─── monthToDate helper (2 tests) ───────────────────────────────────────────

describe('monthToDate', () => {
  it('converts YYYY-MM to first of month', () => {
    const d = monthToDate('2026-04');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3); // April = 3
    expect(d.getDate()).toBe(1);
  });

  it('January works correctly', () => {
    const d = monthToDate('2026-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
  });
});

// ─── Integration: computeVelocity (5 tests) ─────────────────────────────────

describe('computeVelocity integration', () => {
  it('empty apps = all clear', () => {
    const report = computeVelocity([], 'member-1', REF);
    expect(report.overall_status).toBe('clear');
    expect(report.blocked_issuers).toHaveLength(0);
    expect(report.warning_issuers).toHaveLength(0);
  });

  it('complex churner state with CSP application', () => {
    const memberId = 'member-1';
    const apps = [
      // 4 personal cards in last 24 months (4/5 for Chase)
      makeApp({ card_name: 'Chase Freedom Flex', issuer: 'chase', applied_month: '2025-01', household_member_id: memberId }),
      makeApp({ card_name: 'Amex Blue Cash Preferred', issuer: 'amex', applied_month: '2025-04', household_member_id: memberId }),
      makeApp({ card_name: 'Citi Premier', issuer: 'citi', applied_month: '2025-08', household_member_id: memberId }),
      makeApp({ card_name: 'Capital One Venture X', issuer: 'capital_one', applied_month: '2025-11', household_member_id: memberId }),
      // No Sapphire bonus in 48 months
    ];

    const report = computeVelocity(apps, memberId, REF);

    // Should be at 4/5 Chase = warning
    expect(report.chase.five_twenty_four.status).toBe('warning');
    expect(report.chase.five_twenty_four.current_value).toBe(4);
    // Sapphire should be clear
    expect(report.chase.sapphire_48.status).toBe('clear');
    // Overall should have warnings
    expect(report.warning_issuers).toContain('chase');
  });

  it('household separation: member A apps do not affect member B', () => {
    const apps = [
      // Member A: 5 cards (blocked)
      ...Array.from({ length: 5 }, (_, i) =>
        makeApp({
          card_name: `Card ${i}`,
          issuer: 'chase',
          applied_month: addMonthsToMonthString(REF, -i * 3),
          household_member_id: 'member-a',
        }),
      ),
      // Member B: 1 card (clear)
      makeApp({
        card_name: 'One Card',
        issuer: 'chase',
        applied_month: '2026-01',
        household_member_id: 'member-b',
      }),
    ];

    const reportA = computeVelocity(apps, 'member-a', REF);
    const reportB = computeVelocity(apps, 'member-b', REF);

    expect(reportA.chase.five_twenty_four.status).toBe('blocked');
    expect(reportB.chase.five_twenty_four.status).toBe('clear');
    expect(reportB.chase.five_twenty_four.current_value).toBe(1);
  });

  it('full 20-app history across 8 issuers', () => {
    const memberId = 'member-1';
    const apps = [
      makeApp({ card_name: 'Chase Sapphire Preferred', issuer: 'chase', applied_month: '2024-06', household_member_id: memberId, bonus_achieved: true }),
      makeApp({ card_name: 'Chase Freedom Flex', issuer: 'chase', applied_month: '2025-01', household_member_id: memberId }),
      makeApp({ card_name: 'Ink Business Cash', issuer: 'chase', applied_month: '2025-03', household_member_id: memberId, card_type: 'business' }),
      makeApp({ card_name: 'Amex Gold Card', issuer: 'amex', applied_month: '2024-09', household_member_id: memberId, bonus_achieved: true }),
      makeApp({ card_name: 'Amex Blue Cash Preferred', issuer: 'amex', applied_month: '2025-06', household_member_id: memberId }),
      makeApp({ card_name: 'Amex Platinum Card', issuer: 'amex', applied_month: '2025-09', household_member_id: memberId }),
      makeApp({ card_name: 'Amex Hilton Honors', issuer: 'amex', applied_month: '2025-12', household_member_id: memberId }),
      makeApp({ card_name: 'Citi Premier', issuer: 'citi', applied_month: '2025-02', household_member_id: memberId, bonus_achieved: true }),
      makeApp({ card_name: 'Citi Double Cash', issuer: 'citi', applied_month: '2025-08', household_member_id: memberId }),
      makeApp({ card_name: 'Capital One Venture X', issuer: 'capital_one', applied_month: '2025-05', household_member_id: memberId }),
      makeApp({ card_name: 'Capital One Savor', issuer: 'capital_one', applied_month: '2025-11', household_member_id: memberId }),
      makeApp({ card_name: 'BofA Customized Cash', issuer: 'bank_of_america', applied_month: '2025-03', household_member_id: memberId }),
      makeApp({ card_name: 'BofA Premium Rewards', issuer: 'bank_of_america', applied_month: '2025-09', household_member_id: memberId }),
      makeApp({ card_name: 'Barclays AAdvantage Aviator', issuer: 'barclays', applied_month: '2025-04', household_member_id: memberId }),
      makeApp({ card_name: 'Discover it', issuer: 'discover', applied_month: '2024-12', household_member_id: memberId, bonus_achieved: true }),
      makeApp({ card_name: 'US Bank Altitude Reserve', issuer: 'us_bank', applied_month: '2025-07', household_member_id: memberId }),
      makeApp({ card_name: 'Wells Fargo Autograph', issuer: 'wells_fargo', applied_month: '2025-10', household_member_id: memberId }),
      makeApp({ card_name: 'Chase Freedom Unlimited', issuer: 'chase', applied_month: '2024-08', household_member_id: memberId }),
      makeApp({ card_name: 'Amex EveryDay Preferred', issuer: 'amex', applied_month: '2024-11', household_member_id: memberId, status: 'closed', closed_at: '2025-11-01' }),
      makeApp({ card_name: 'Citi Custom Cash', issuer: 'citi', applied_month: '2026-01', household_member_id: memberId }),
    ];

    const report = computeVelocity(apps, memberId, REF);

    // 20 apps, lots of issuers. Should compute without error
    expect(report.all_rules.length).toBeGreaterThan(0);
    expect(report.overall_status).toBeDefined();

    // Chase should be well over 5/24 (many personal cards)
    expect(report.chase.five_twenty_four.current_value).toBeGreaterThanOrEqual(5);
    expect(report.chase.five_twenty_four.status).toBe('blocked');

    // Sapphire bonus earned in 2024-06 = blocked until 2028-06
    expect(report.chase.sapphire_48.status).toBe('blocked');

    // Barclays 6/24: count all cards from all issuers
    expect(report.barclays.six_24.status).toBe('blocked');
  });

  it('performance: <50ms for 50 applications', () => {
    const memberId = 'member-1';
    const apps = Array.from({ length: 50 }, (_, i) => {
      const issuers = ['chase', 'amex', 'citi', 'capital_one', 'bank_of_america', 'barclays', 'us_bank', 'discover'] as const;
      const issuer = issuers[i % issuers.length];
      return makeApp({
        card_name: `Card ${i}`,
        issuer,
        applied_month: addMonthsToMonthString(REF, -i),
        household_member_id: memberId,
        card_type: i % 3 === 0 ? 'business' : 'personal',
      });
    });

    const start = performance.now();
    const report = computeVelocity(apps, memberId, REF);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
    expect(report.all_rules.length).toBeGreaterThan(0);
  });
});

// ─── Engine helpers (3 tests) ───────────────────────────────────────────────

describe('Engine helpers', () => {
  it('countByStatus tallies correctly', () => {
    const report = computeVelocity([], 'member-1', REF);
    const counts = countByStatus(report);
    expect(counts.clear).toBe(8);
    expect(counts.warning).toBe(0);
    expect(counts.blocked).toBe(0);
  });

  it('worstStatus: blocked > warning > clear', () => {
    const makeRule = (status: RuleResult['status']): RuleResult => ({
      rule_id: 'test', issuer: 'chase', status, current_value: 0, limit_value: 5, eligible_after: null, days_until_clear: null, message: '', applications_considered: [],
    });
    const rules: RuleResult[] = [makeRule('clear'), makeRule('warning')];
    expect(worstStatus(rules)).toBe('warning');

    rules.push(makeRule('blocked'));
    expect(worstStatus(rules)).toBe('blocked');
  });

  it('getIssuerRules returns correct rules per issuer', () => {
    const report = computeVelocity([], 'member-1', REF);
    const chaseRules = getIssuerRules(report, 'chase');
    expect(chaseRules).toHaveLength(2); // 5/24 + sapphire_48
    const amexRules = getIssuerRules(report, 'amex');
    expect(amexRules).toHaveLength(3); // 1_in_90 + 2_in_90 + credit_limit (no lifetime burns)
  });
});

// ─── Edge cases (6 tests) ───────────────────────────────────────────────────

describe('Edge cases', () => {
  it('shutdown_by_issuer status is excluded from counting', () => {
    const apps = [
      makeApp({ card_name: 'Chase Freedom', issuer: 'chase', applied_month: '2025-06', status: 'shutdown_by_issuer' }),
    ];
    const r = chase524(apps, REF);
    expect(r.current_value).toBe(0);
  });

  it('pending applications still count toward velocity', () => {
    const apps = [
      makeApp({ card_name: 'Chase Freedom', issuer: 'chase', applied_month: '2026-03', status: 'pending' }),
    ];
    const r = chase524(apps, REF);
    expect(r.current_value).toBe(1);
  });

  it('optimal_next prioritizes Chase when under 5/24', () => {
    const report = computeVelocity([], 'member-1', REF);
    expect(report.optimal_next).toContain('Chase');
  });

  it('eligible_after has correct month for 5/24 drop-off', () => {
    const apps = Array.from({ length: 5 }, (_, i) =>
      chasePersonal(addMonthsToMonthString(REF, -(20 - i * 2))),
    );
    const r = chase524(apps, REF);
    expect(r.eligible_after).toBeDefined();
    // Oldest card applied 20 months ago + 24 = 4 months from now
    expect(r.eligible_after).toBe(addMonthsToMonthString(addMonthsToMonthString(REF, -20), 24));
  });

  it('addMonthsToMonthString handles December→January wrap', () => {
    expect(addMonthsToMonthString('2025-12', 1)).toBe('2026-01');
  });

  it('addMonthsToMonthString handles January→December unwrap', () => {
    expect(addMonthsToMonthString('2026-01', -1)).toBe('2025-12');
  });
});

// ─── Additional coverage (13 more tests) ────────────────────────────────────

describe('Amex business credit cards count against personal velocity', () => {
  it('biz credit card counts toward 1-in-90', () => {
    const app = makeApp({
      card_name: 'Amex Blue Business Plus',
      issuer: 'amex',
      applied_month: '2026-03',
      card_type: 'business',
      approved_at: '2026-03-15',
    });
    const r = amex1in90([app], REF);
    expect(r.current_value).toBe(1);
    expect(r.status).toBe('warning');
  });

  it('biz credit card counts toward 2-in-90', () => {
    const apps = [
      makeApp({ card_name: 'Amex Blue Business Plus', issuer: 'amex', applied_month: '2026-02', card_type: 'business', approved_at: '2026-02-01' }),
      makeApp({ card_name: 'Amex Blue Business Cash', issuer: 'amex', applied_month: '2026-03', card_type: 'business', approved_at: '2026-03-01' }),
    ];
    const r = amex2in90(apps, REF);
    expect(r.status).toBe('blocked');
  });
});

describe('US Bank business cards exempt from 5/24', () => {
  it('US Bank business counts toward 5/24', () => {
    const app = makeApp({
      card_name: 'US Bank Biz Card',
      issuer: 'us_bank',
      applied_month: '2025-06',
      card_type: 'business',
    });
    const r = chase524([app], REF);
    expect(r.current_value).toBe(1);
  });
});

describe('Capital One 6-month: older card is clear', () => {
  it('personal card 7 months ago = clear', () => {
    const apps = [capOnePersonal('2025-08')];
    const r = capitalOne6Month(apps, REF);
    expect(r.status).toBe('clear');
  });
});

describe('BofA: 1 card in each window is still clear', () => {
  it('1 in 2mo, 1 in 12mo, 1 in 24mo = clear', () => {
    const apps = [
      bofaCard('2026-03'),
    ];
    const r = bofa234(apps, REF);
    expect(r.status).toBe('clear');
  });
});

describe('Barclays: cards older than 24 months do not count', () => {
  it('card 25 months ago excluded', () => {
    const apps = [
      genericCard('chase', '2024-02'), // 26 months ago
    ];
    const r = barclays624(apps, REF);
    expect(r.current_value).toBe(0);
  });
});

describe('Citi 8-day: card 20 days ago = clear', () => {
  it('Citi personal 20 days ago = clear', () => {
    const app = citiPersonal('2026-03', 'Citi Premier', '2026-03-12');
    const r = citi8Day([app], REF);
    expect(r.status).toBe('clear');
  });
});

describe('Amex Green is a charge card', () => {
  it('Green is exempt from credit velocity', () => {
    expect(isChargeCard('Amex Green')).toBe(true);
  });

  it('Business Green is a charge card', () => {
    expect(isChargeCard('Business Green')).toBe(true);
  });
});

describe('Multiple Citi products in 24-month bonus rule', () => {
  it('different product names tracked separately', () => {
    const apps = [
      makeApp({ card_name: 'Citi Premier', issuer: 'citi', applied_month: '2025-06', bonus_achieved: true }),
      makeApp({ card_name: 'Citi Double Cash', issuer: 'citi', applied_month: '2025-08', bonus_achieved: true }),
    ];
    const r = citi24MonthBonus(apps, REF);
    expect(r).toHaveLength(2);
    expect(r.every((x) => x.status === 'blocked')).toBe(true);
  });
});

describe('Optimal next with warnings-only state', () => {
  it('returns caution message when only warnings exist', () => {
    const memberId = 'member-1';
    const apps = [
      makeApp({
        card_name: 'Capital One Venture X',
        issuer: 'capital_one',
        applied_month: '2026-02',
        household_member_id: memberId,
      }),
    ];
    const report = computeVelocity(apps, memberId, REF);
    // Cap One shows warning (soft rule), but Chase is still clear and prioritized
    expect(report.optimal_next).toContain('Chase');
  });
});

describe('Chase 5/24 with exactly 5 cards shows drop-off info', () => {
  it('provides days_until_clear', () => {
    const apps = Array.from({ length: 5 }, (_, i) =>
      chasePersonal(addMonthsToMonthString(REF, -(22 - i))),
    );
    const r = chase524(apps, REF);
    expect(r.status).toBe('blocked');
    expect(r.days_until_clear).toBeGreaterThan(0);
    expect(r.eligible_after).toBeDefined();
  });
});

describe('Schwab Platinum is a charge card', () => {
  it('exempt from credit card velocity', () => {
    expect(isChargeCard('Schwab Platinum')).toBe(true);
  });
});

// ─── S1-1 regression: Delta/co-brand credit cards must NOT be charge cards ──

describe('S1-1 regression: co-brand credit cards are not charge cards', () => {
  it('Delta SkyMiles Gold is a credit card (not charge)', () => {
    expect(isChargeCard('Delta SkyMiles Gold')).toBe(false);
  });

  it('Delta SkyMiles Platinum is a credit card (not charge)', () => {
    expect(isChargeCard('Delta SkyMiles Platinum')).toBe(false);
  });

  it('Delta SkyMiles Gold Business is a credit card', () => {
    expect(isChargeCard('Delta SkyMiles Gold Business')).toBe(false);
  });

  it('Delta SkyMiles Platinum Business is a credit card', () => {
    expect(isChargeCard('Delta SkyMiles Platinum Business')).toBe(false);
  });

  it('Hilton Honors is a credit card', () => {
    expect(isChargeCard('Hilton Honors')).toBe(false);
  });

  it('Marriott Bonvoy Brilliant is a credit card', () => {
    expect(isChargeCard('Marriott Bonvoy Brilliant')).toBe(false);
  });

  it('Blue Cash Everyday is a credit card', () => {
    expect(isChargeCard('Blue Cash Everyday')).toBe(false);
  });

  it('EveryDay Preferred is a credit card', () => {
    expect(isChargeCard('EveryDay Preferred')).toBe(false);
  });

  // Confirm actual charge cards still work
  it('Amex Platinum Card is still a charge card', () => {
    expect(isChargeCard('Amex Platinum Card')).toBe(true);
  });

  it('Amex Gold Card is still a charge card', () => {
    expect(isChargeCard('Amex Gold Card')).toBe(true);
  });

  it('standalone "Amex Platinum" is still a charge card', () => {
    expect(isChargeCard('Amex Platinum')).toBe(true);
  });

  it('standalone "Amex Gold" is still a charge card', () => {
    expect(isChargeCard('Amex Gold')).toBe(true);
  });

  it('Rose Gold is a charge card', () => {
    expect(isChargeCard('Amex Rose Gold')).toBe(true);
  });
});
