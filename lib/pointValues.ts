/**
 * Point and mile valuations (cents per point/mile).
 * Ported from cc-recommender/app/lib/pointValues.ts
 */

export type PointValueKey =
  | 'Ultimate Rewards (UR)'
  | 'Membership Rewards (MR)'
  | 'Thank You Points (TYP)'
  | 'Bank of America Points'
  | 'U.S. Bank Points'
  | 'Wells Fargo Rewards'
  | 'Capital One Miles'
  | 'United Miles'
  | 'Southwest Rapid Rewards'
  | 'Delta SkyMiles'
  | 'AAdvantage Miles'
  | 'Alaska Miles'
  | 'JetBlue TrueBlue'
  | 'BreezePoints'
  | 'Atmos Miles'
  | 'Airline Miles'
  | 'Marriott Bonvoy Points'
  | 'Hilton Honors Points'
  | 'World of Hyatt Points'
  | 'IHG One Rewards'
  | 'Wyndham Rewards'
  | 'Choice Privileges'
  | 'Cash';

export const POINT_VALUES_CPP: Record<PointValueKey, number> = {
  'Ultimate Rewards (UR)': 1.25,
  'Membership Rewards (MR)': 1.25,
  'Thank You Points (TYP)': 1.0,
  'Bank of America Points': 0.6,
  'U.S. Bank Points': 1.0,
  'Wells Fargo Rewards': 1.0,
  'Capital One Miles': 1.0,

  'United Miles': 1.2,
  'Southwest Rapid Rewards': 1.3,
  'Delta SkyMiles': 1.0,
  'AAdvantage Miles': 1.0,
  'Alaska Miles': 1.1,
  'JetBlue TrueBlue': 1.3,
  'BreezePoints': 1.0,
  'Atmos Miles': 1.1,
  'Airline Miles': 1.1,

  'Marriott Bonvoy Points': 0.8,
  'Hilton Honors Points': 0.5,
  'World of Hyatt Points': 1.5,
  'IHG One Rewards': 0.6,
  'Wyndham Rewards': 0.6,
  'Choice Privileges': 0.6,

  Cash: 1.0,
};

const DEFAULT_CPP = 1.0;

export function getCentsPerPoint(rewardsType: string | undefined): number {
  if (!rewardsType || !rewardsType.trim()) return DEFAULT_CPP;
  const key = rewardsType.trim() as PointValueKey;
  if (key in POINT_VALUES_CPP) return POINT_VALUES_CPP[key];
  return DEFAULT_CPP;
}

export type CardLike = {
  signup_bonus?: string;
  signup_bonus_type?: string;
  rewards_type?: string;
  estimated_bonus_value_usd?: string;
};

export function getEstimatedBonusValueUsd(card: CardLike): number {
  const bonusType = (card.signup_bonus_type || '').toLowerCase().trim();
  const rawBonus = (card.signup_bonus || '').replace(/[,]/g, '').trim();
  const bonusNum = parseInt(rawBonus, 10) || 0;

  if (bonusType === 'dollars') {
    const csvStr = (card.estimated_bonus_value_usd || '').replace(/,/g, '').trim();
    const fromCsv = parseFloat(csvStr);
    const value = !Number.isNaN(fromCsv) && fromCsv >= 0 ? Math.round(fromCsv) : 0;
    return value || bonusNum;
  }

  const cpp = getCentsPerPoint(card.rewards_type);
  return Math.round((bonusNum * cpp) / 100);
}
