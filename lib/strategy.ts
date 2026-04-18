/**
 * Strategy Lab — Chase-first vs non-Chase multi-card optimization.
 * Ported from cc-recommender/app/lib/advancedStrategy.ts
 */
import type { Card } from './cardTypes';

export type Under524Status = 'under' | 'over' | 'unsure';
export type PrimaryGoal = 'max_sub' | 'travel' | 'cashback';
export type TimeHorizon = '6' | '12' | '24';
export type StrategyMode = 'chase_first' | 'non_chase' | 'neutral';
export type OptionalBool = boolean | 'skip';
export type CashbackPreference = 'flat_rate' | 'category' | 'no_preference';

export type IssuerState = {
  haveSapphire: OptionalBool;
  haveInk: OptionalBool;
  amexPopUpConcern: OptionalBool;
};

export const DEFAULT_ISSUER_STATE: IssuerState = {
  haveSapphire: 'skip',
  haveInk: 'skip',
  amexPopUpConcern: 'skip',
};

export const DEFAULT_CASHBACK_PREFERENCE: CashbackPreference = 'no_preference';

const CHASE_FAMILY_ORDER = [
  'sapphire', 'ink', 'freedom',
  'united', 'southwest', 'marriott', 'ihg', 'hyatt', '',
];

function getChaseFamily(card: Card): string {
  const family = (card.card_family ?? '').trim().toLowerCase();
  const name = (card.card_name ?? '').toLowerCase();
  if (family) return family;
  if (name.includes('hyatt')) return 'hyatt';
  if (name.includes('sapphire')) return 'sapphire';
  if (name.includes('ink')) return 'ink';
  if (name.includes('freedom')) return 'freedom';
  if (name.includes('united')) return 'united';
  if (name.includes('southwest')) return 'southwest';
  if (name.includes('marriott')) return 'marriott';
  if (name.includes('ihg')) return 'ihg';
  return '';
}

function isChase(card: Card): boolean {
  return (card.issuer ?? '').toLowerCase() === 'chase';
}

function isAmex(card: Card): boolean {
  const i = (card.issuer ?? '').toLowerCase();
  return i === 'amex' || i === 'american express';
}

function isBusinessCard(card: Card): boolean {
  return (card.card_type ?? '').toLowerCase() === 'business';
}

function isCashbackCard(card: Card): boolean {
  return (card.reward_model ?? '').toLowerCase() === 'cashback';
}

function hasCategoryBonus(card: Card): boolean {
  const display = (card.cashback_rate_display ?? '').trim();
  return display.includes('/') || display.includes('5') || parseFloat(card.cashback_rate_effective || '0') >= 2.5;
}

export function getStrategyMode(under524: Under524Status, _goal: PrimaryGoal): StrategyMode {
  if (under524 === 'under') return 'chase_first';
  if (under524 === 'over') return 'non_chase';
  return 'neutral';
}

export function filterCardsByStrategy(
  cards: Card[],
  strategy: StrategyMode,
  businessEligible: boolean,
  ownedCards: string[],
  issuerState: IssuerState = DEFAULT_ISSUER_STATE,
  goal: PrimaryGoal = 'max_sub',
  cashbackPreference: CashbackPreference = DEFAULT_CASHBACK_PREFERENCE,
): Card[] {
  const excluded = new Set(ownedCards.map((n) => n.trim().toLowerCase()));
  let pool = cards.filter((c) => {
    const name = (c.card_name ?? '').trim().toLowerCase();
    return !excluded.has(name);
  });

  if (strategy === 'non_chase') {
    pool = pool.filter((c) => !isChase(c));
  }
  if (!businessEligible) {
    pool = pool.filter((c) => !isBusinessCard(c));
  }

  if (issuerState.haveSapphire === true) {
    pool = pool.filter((c) => getChaseFamily(c) !== 'sapphire');
  }
  if (issuerState.haveInk === true) {
    pool = pool.filter((c) => getChaseFamily(c) !== 'ink');
  }
  if (issuerState.amexPopUpConcern === true) {
    pool = pool.filter((c) => !isAmex(c));
  }

  if (goal === 'cashback') {
    pool = pool.filter((c) => isCashbackCard(c));
    if (cashbackPreference === 'flat_rate') {
      pool = pool.filter((c) => !hasCategoryBonus(c));
    } else if (cashbackPreference === 'category') {
      pool = pool.filter((c) => hasCategoryBonus(c));
    }
  }

  return pool;
}

function getChaseFamilyRank(card: Card): number {
  const family = getChaseFamily(card);
  const idx = CHASE_FAMILY_ORDER.findIndex((f) => family.startsWith(f) || f === family);
  return idx >= 0 ? idx : CHASE_FAMILY_ORDER.length;
}

export function sortAllocationByStrategy<T extends { card: Record<string, unknown> }>(
  allocation: T[],
  strategy: StrategyMode,
  goal: PrimaryGoal = 'max_sub',
  cashbackPreference: CashbackPreference = DEFAULT_CASHBACK_PREFERENCE,
): T[] {
  return [...allocation].sort((a, b) => {
    const cardA = a.card as Card;
    const cardB = b.card as Card;

    if (goal === 'cashback' && strategy !== 'chase_first') {
      const rateA = parseFloat(cardA.cashback_rate_effective || '0');
      const rateB = parseFloat(cardB.cashback_rate_effective || '0');
      if (cashbackPreference === 'flat_rate' || cashbackPreference === 'category') {
        const catA = hasCategoryBonus(cardA) ? 1 : 0;
        const catB = hasCategoryBonus(cardB) ? 1 : 0;
        if (cashbackPreference === 'category' && catA !== catB) return catB - catA;
        if (cashbackPreference === 'flat_rate' && catA !== catB) return catA - catB;
      }
      if (rateA !== rateB) return rateB - rateA;
    }

    if (strategy === 'chase_first') {
      const rankA = getChaseFamilyRank(cardA);
      const rankB = getChaseFamilyRank(cardB);
      if (rankA !== rankB) return rankA - rankB;
      const bonusA = parseInt(cardA.estimated_bonus_value_usd || '0', 10);
      const bonusB = parseInt(cardB.estimated_bonus_value_usd || '0', 10);
      return bonusB - bonusA;
    }

    if (strategy === 'non_chase') {
      const bonusA = parseInt(cardA.estimated_bonus_value_usd || '0', 10);
      const bonusB = parseInt(cardB.estimated_bonus_value_usd || '0', 10);
      if (bonusA !== bonusB) return bonusB - bonusA;
      const issuerOrder = ['amex', 'citi', 'capital one', 'bank of america', 'barclays', 'u.s. bank', 'wells fargo'];
      const ia = issuerOrder.indexOf((cardA.issuer ?? '').toLowerCase());
      const ib = issuerOrder.indexOf((cardB.issuer ?? '').toLowerCase());
      return (ia >= 0 ? ia : 99) - (ib >= 0 ? ib : 99);
    }

    const bonusA = parseInt(cardA.estimated_bonus_value_usd || '0', 10);
    const bonusB = parseInt(cardB.estimated_bonus_value_usd || '0', 10);
    return bonusB - bonusA;
  });
}

export function getCardRationale(card: Card, index: number, strategy: StrategyMode): string {
  if (strategy === 'chase_first' && isChase(card)) {
    const family = getChaseFamily(card);
    if (family === 'sapphire') return 'Get Sapphire first to unlock Ultimate Rewards transfer partners.';
    if (family === 'ink') return "Ink business cards don't count toward 5/24 — maximize before hitting limit.";
    if (family === 'freedom') return 'Freedom stacks with Sapphire for boosted redemptions.';
    if (['united', 'southwest', 'marriott', 'ihg', 'hyatt'].includes(family)) return 'Chase co-brand; apply while under 5/24.';
  }
  if (strategy === 'non_chase') return 'Non-Chase card — good option when over 5/24.';
  if (index === 0) return 'Top pick for your profile.';
  return '';
}

export function getStrategySummary(strategy: StrategyMode): string {
  switch (strategy) {
    case 'chase_first':
      return 'Chase-first: Sapphire, Ink, Freedom, and co-brands shown first. Under 5/24 — maximize Chase before they cut you off.';
    case 'non_chase':
      return "Non-Chase: You're over 5/24. Amex is often preferred for travel (MR ecosystem); Citi, Capital One, and others follow.";
    default:
      return "Neutral: Considering all cards. Answer \"Are you under 5/24?\" for targeted optimization.";
  }
}
