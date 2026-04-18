/**
 * Card ranking engine — ported verbatim from cc-recommender/app/lib/resultsScoring.ts
 */
import type { Card } from './cardTypes';
import { parseMinSpend } from './cardDisplay';

export type Answers = { [key: string]: unknown };

export function getGoalRanks(answers: Answers): { primary?: string; secondary?: string; tertiary?: string } {
  if (Array.isArray(answers.primary_goal_ranked)) {
    const [first, second, third] = answers.primary_goal_ranked as string[];
    return { primary: first, secondary: second, tertiary: third };
  }
  return { primary: answers.primary_goal as string, secondary: undefined, tertiary: undefined };
}

function hasIntroAPR(card: Card): boolean {
  return (card.intro_apr_purchase || '').trim().startsWith('0%');
}

export function issuerExcluded(issuer: string, answers: Answers): boolean {
  const rules: string[] = Array.isArray(answers.issuer_approval_rules) ? (answers.issuer_approval_rules as string[]) : [];
  const i = issuer.toLowerCase();
  if (rules.includes('5_in_24mo') && i === 'chase') return true;
  if (rules.includes('6_in_24mo') && (i === 'chase' || i === 'barclays')) return true;
  if (rules.includes('2_in_60_days') && (i === 'citi' || i === 'amex')) return true;
  if (rules.includes('2_in_90_days') && i === 'amex') return true;
  return false;
}

export function cardMatchesAirline(card: Card, airline: string): boolean {
  if (!airline || airline === 'No strong preference') return false;
  const key = airline.trim().toLowerCase();
  return (card.card_family || '').toLowerCase().includes(key) || (card.card_name || '').toLowerCase().includes(key);
}

export function cardMatchesHotel(card: Card, hotel: string): boolean {
  if (!hotel || hotel === 'No strong preference') return false;
  const key = hotel.trim().toLowerCase();
  const name = (card.card_name || '').toLowerCase();
  const family = (card.card_family || '').toLowerCase();
  if (family.includes(key) || name.includes(key)) return true;
  if (key === 'expedia' && (name.includes('one key') || name.includes('hotels.com') || name.includes('vrbo'))) return true;
  return false;
}

export function isPremiumTierCard(card: Card): boolean {
  const name = (card.card_name || '').toLowerCase();
  const fee = parseInt(card.annual_fee || '0', 10);
  const premiumNames = ['reserve', 'venture x', 'platinum', 'infinite', 'aspire', 'brilliant', 'performance', 'premier', 'executive'];
  if (premiumNames.some((p) => name.includes(p))) return true;
  if (fee >= 395) return true;
  return false;
}

export function isPersonalBucket(card: Card): boolean {
  const t = (card.card_type || '').toLowerCase();
  return t === 'personal' || t === 'secured' || t === 'student';
}

export function isBusinessBucket(card: Card): boolean {
  return (card.card_type || '').toLowerCase() === 'business';
}

function isGenericTravelCard(card: Card): boolean {
  return (card.reward_model || '').toLowerCase() === 'travel';
}

function isVeryPremiumTravelCard(card: Card): boolean {
  const name = (card.card_name || '').toLowerCase();
  const issuer = (card.issuer || '').toLowerCase();
  if (name.includes('sapphire reserve')) return true;
  if (name.includes('venture x')) return true;
  if (issuer === 'amex' && name.includes('platinum') && !name.includes('delta')) return true;
  return false;
}

function isMidTierTravelCard(card: Card): boolean {
  const name = (card.card_name || '').toLowerCase();
  const issuer = (card.issuer || '').toLowerCase();
  if (name.includes('sapphire preferred')) return true;
  if (name.includes('venture') && !name.includes('venture x')) return true;
  if (issuer === 'amex' && name.includes('gold') && !name.includes('delta')) return true;
  return false;
}

export function dedupeByFamily(items: { card: Card; score: number }[]): { card: Card; score: number }[] {
  const best = new Map<string, { card: Card; score: number }>();
  for (const entry of items) {
    const key = entry.card.card_family?.trim() || entry.card.card_name;
    const existing = best.get(key);
    if (!existing || entry.score > existing.score) best.set(key, entry);
  }
  return Array.from(best.values());
}

export function getBonusToMinSpendRatio(bonusValue: number, minSpend: number): number {
  if (minSpend <= 0 || bonusValue <= 0) return 0;
  return bonusValue / minSpend;
}

export function scoreCard(card: Card, answers: Answers, ownedCards: string[]): number {
  if (ownedCards.includes(card.card_name)) return -9999;
  if (issuerExcluded(card.issuer, answers)) return -9999;
  const rewardModel = (card.reward_model || '').toLowerCase();
  const isTravelCard = rewardModel === 'travel' || rewardModel === 'airline' || rewardModel === 'hotel';
  if (answers.exclude_travel_cards === 'Yes' && isTravelCard) return -9999;
  if (answers.max_annual_fee !== undefined) {
    const maxFee = Number(answers.max_annual_fee);
    if (!isNaN(maxFee) && parseInt(card.annual_fee || '0', 10) > maxFee) return -9999;
  }
  const excludedIssuers: string[] = Array.isArray(answers.excluded_issuers) ? (answers.excluded_issuers as string[]) : [];
  if (excludedIssuers.length > 0) {
    const issuerLower = (card.issuer || '').toLowerCase();
    if (excludedIssuers.some((ex) => issuerLower.includes(ex.toLowerCase()))) return -9999;
  }
  if (answers.lounge_required === 'Yes') {
    const loungeVal = (card.lounge || '').trim().toLowerCase();
    if (!loungeVal || loungeVal === 'no' || loungeVal === 'none' || loungeVal === 'n/a') return -9999;
  }

  const { primary, secondary, tertiary } = getGoalRanks(answers);
  const cardFee = parseInt(card.annual_fee || '0', 10);
  const bonusValue = parseInt(card.estimated_bonus_value_usd || '0', 10);
  const minSpend = parseMinSpend(card.minimum_spend_amount);
  const bonusRatio = getBonusToMinSpendRatio(bonusValue, minSpend);
  const cashbackRate = parseFloat(card.cashback_rate_effective || '0');
  const isCashbackCard = rewardModel === 'cashback';
  const spendComfort = answers.spend_comfort as string | undefined;

  let score = 0;

  if (spendComfort === 'Low' && minSpend >= 1000 && bonusValue > 0) return -9999;
  if (answers.needs_0_apr === 'Yes' && primary !== 'Travel') {
    if (!hasIntroAPR(card)) return -9999;
    score += cashbackRate * 10;
    score -= cardFee / 10;
    return score;
  }

  const feeTolerance = answers.annual_fee_tolerance as string | undefined;
  if (feeTolerance === 'None' && cardFee > 0) score -= 50;
  else if (feeTolerance === 'Low' && cardFee > 100) score -= 30;
  else if (feeTolerance === 'Medium' && cardFee > 400) score -= 30;

  const isPremium = isPremiumTierCard(card);
  if (feeTolerance === 'High' || feeTolerance === 'Medium') { if (isPremium) score += 20; }
  else if (feeTolerance === 'None' || feeTolerance === 'Low') { if (isPremium) score -= 15; }

  if (primary === 'Travel') {
    if (isTravelCard) {
      score += 80;
      if (answers.travel_frequency === 'High') score += 15;
      else if (answers.travel_frequency === 'Medium') score += 8;
      else if (answers.travel_frequency === 'Low') score -= 10;
      if (cardFee === 0 && (feeTolerance === 'Medium' || feeTolerance === 'High')) score -= 25;
    } else score -= 40;
  } else if (primary === 'Cashback') {
    if (isCashbackCard) {
      score += 50;
      const ratioFromCsv = parseFloat((card.bonus_to_spend_ratio as string) || '');
      const bsr = !Number.isNaN(ratioFromCsv) && ratioFromCsv >= 0 ? ratioFromCsv : bonusRatio;
      score += 0.6 * Math.min(cashbackRate * 20, 100) + 0.4 * Math.min(bsr * 100, 100);
    } else score += cashbackRate * 25;
  } else if (primary === 'Everyday') {
    score += cashbackRate * 15;
    if (hasIntroAPR(card)) score += 35;
  } else if (primary === 'Bonus') {
    if (answers.spend_comfort !== 'None') {
      score += Math.min(bonusValue / 25, 80);
      if (bonusRatio > 0) score += Math.min(bonusRatio * 25, 15);
    } else score -= 20;
  }

  if (secondary === 'Travel') {
    if (isTravelCard) { score += 30; if (answers.travel_frequency === 'High') score += 8; else if (answers.travel_frequency === 'Low') score -= 5; }
    else score -= 15;
  } else if (secondary === 'Cashback') {
    if (isCashbackCard) { score += 15; if (bonusRatio > 0) score += Math.min(bonusRatio * 5, 4); }
    score += cashbackRate * 5;
  } else if (secondary === 'Everyday') {
    score += cashbackRate * 4;
    if (hasIntroAPR(card)) score += 10;
  } else if (secondary === 'Bonus') {
    if (answers.spend_comfort !== 'None') { score += Math.min(bonusValue / 80, 15); if (bonusRatio > 0) score += Math.min(bonusRatio * 8, 5); }
  }

  if (tertiary === 'Travel') { if (isTravelCard) { score += 12; if (answers.travel_frequency === 'High') score += 3; } else score -= 5; }
  else if (tertiary === 'Cashback') { if (isCashbackCard) { score += 8; if (bonusRatio > 0) score += Math.min(bonusRatio * 3, 2); } score += cashbackRate * 2; }
  else if (tertiary === 'Everyday') { score += cashbackRate * 2; if (hasIntroAPR(card)) score += 5; }
  else if (tertiary === 'Bonus') { if (answers.spend_comfort !== 'None') { score += Math.min(bonusValue / 150, 8); if (bonusRatio > 0) score += Math.min(bonusRatio * 4, 3); } }

  const spendingFocus: string[] = Array.isArray(answers.spending_focus) ? (answers.spending_focus as string[]) : [];
  if ((primary === 'Cashback' || primary === 'Everyday') && spendingFocus.length > 0) {
    const gasRate = parseFloat((card.gas_rate as string) || '0') || 0;
    const groceryRate = parseFloat((card.grocery_rate as string) || '0') || 0;
    if (spendingFocus.includes('gas') && gasRate >= 1) score += gasRate * 8;
    if (spendingFocus.includes('grocery') && groceryRate >= 1) score += groceryRate * 8;
  }

  const caresAboutTravel = primary === 'Travel' || secondary === 'Travel' || tertiary === 'Travel';
  const travelRewardsType = (answers.travel_rewards_type as string | undefined) || '';
  const wantsGenericTravel = travelRewardsType === 'General' || !travelRewardsType;

  if (caresAboutTravel && travelRewardsType && travelRewardsType !== 'No Preference') {
    if (travelRewardsType === 'General') { if (rewardModel === 'airline' || rewardModel === 'hotel') return -9999; }
    else if (travelRewardsType === 'Airline') { if (rewardModel !== 'airline') return -9999; }
    else if (travelRewardsType === 'Hotel') { if (rewardModel !== 'hotel') return -9999; }
  }

  if (caresAboutTravel) {
    if (wantsGenericTravel && isGenericTravelCard(card)) score += 30;
    const preferredBank = answers.preferred_bank as string | undefined;
    if (wantsGenericTravel && preferredBank && preferredBank !== 'No preference') {
      const cardIssuer = (card.issuer || '').trim().toLowerCase();
      const bankKey = preferredBank.trim().toLowerCase();
      if (cardIssuer === bankKey || (bankKey === 'amex' && cardIssuer === 'american express')) score += 40;
    }
    const tierPref = answers.travel_tier_preference as string | undefined;
    if (tierPref === 'Premium') { if (isVeryPremiumTravelCard(card)) score += 35; else if (isTravelCard && cardFee >= 350) score += 25; }
    else if (tierPref === 'Mid-tier') { if (isMidTierTravelCard(card)) score += 35; else if (isTravelCard && cardFee >= 300) score -= 35; }
    if (cardMatchesAirline(card, (answers.preferred_airline as string) || '')) score += 40;
    if (cardMatchesHotel(card, (answers.preferred_hotel as string) || '')) score += 40;
    const travelPerks: string[] = Array.isArray(answers.travel_perks) ? (answers.travel_perks as string[]) : [];
    if (travelPerks.includes('tsa_ge') && (card.ge_tsa_precheck || '').trim().length > 0) score += 25;
    if (travelPerks.includes('lounge') && (card.lounge || '').trim().length > 0) score += 25;
  }

  if (answers.spend_comfort !== 'None') { score += Math.min(bonusValue / 100, 20); if (bonusRatio > 0) score += Math.min(bonusRatio * 8, 6); }
  else { if (bonusValue > 500) score -= 5; }

  if (primary === 'Bonus' || secondary === 'Bonus') { if (bonusValue < 300) score -= 40; else if (bonusValue < 500) score -= 15; }
  if (cardFee > 0 && cardFee > 400 && score < 50) score -= 10;

  const hasFTF = (card.foreign_tx_fee || '').trim().toUpperCase() === 'YES' ||
    ((card.ftf || '').trim() !== '' && (card.ftf || '').trim() !== '0%' && (card.ftf || '').trim() !== 'No');
  if (caresAboutTravel && hasFTF) score -= 20;

  const hasTransferPartners = (card.transfer_partners || '').trim().length > 0 && !/^(no|none|n\/a)$/i.test((card.transfer_partners || '').trim());
  if (caresAboutTravel && hasTransferPartners) score += 15;

  const isAmex = (card.issuer || '').toLowerCase() === 'amex';
  if (isAmex && (primary === 'Everyday' || primary === 'Cashback') && !caresAboutTravel) score -= 8;

  const favBrands: string[] = Array.isArray(answers.favorite_brands) ? (answers.favorite_brands as string[]) : [];
  if (favBrands.length > 0) {
    const cardName = (card.card_name || '').toLowerCase();
    const cardFamily = (card.card_family || '').toLowerCase();
    if (favBrands.some((brand) => cardName.includes(brand) || cardFamily.includes(brand))) score += 30;
  }

  return score;
}

export function getWhyNotReason(card: Card, answers: Answers): string {
  const { primary } = getGoalRanks(answers);
  const rewardModel = (card.reward_model || '').toLowerCase();
  const isTravelCard = rewardModel === 'travel' || rewardModel === 'airline' || rewardModel === 'hotel';
  const isCashbackCard = rewardModel === 'cashback';
  const cardFee = parseInt(card.annual_fee || '0', 10);
  const feeTolerance = answers.annual_fee_tolerance as string | undefined;
  const bonusValue = parseInt((card.estimated_bonus_value_usd || '0').replace(/\D/g, ''), 10);
  const minSpend = parseMinSpend(card.minimum_spend_amount);
  const caresAboutTravel = primary === 'Travel';

  if (feeTolerance === 'None' && cardFee > 0) return `Has a $${cardFee}/yr annual fee`;
  if (feeTolerance === 'Low' && cardFee > 100) return `$${cardFee}/yr fee is higher than your preference`;
  if (caresAboutTravel && isCashbackCard) return 'Cashback card — no travel points or transfer partners';
  if ((primary === 'Cashback' || primary === 'Everyday') && isTravelCard) return 'Travel card — optimized for points, not flat cashback';
  const hasFTF = (card.foreign_tx_fee || '').trim().toUpperCase() === 'YES' || ((card.ftf || '').trim() !== '' && (card.ftf || '').trim() !== '0%' && !/^(no|none|n\/a|0)$/i.test((card.ftf || '').trim()));
  if (caresAboutTravel && hasFTF) return 'Charges a foreign transaction fee';
  if (minSpend >= 5000) return `High signup spend: $${minSpend.toLocaleString()} required`;
  if (minSpend >= 3000 && answers.spend_comfort === 'Low') return `Signup spend ($${minSpend.toLocaleString()}) may be hard to reach`;
  if (bonusValue < 200 && (primary === 'Bonus' || caresAboutTravel)) return 'Signup bonus is relatively modest';
  if (isPremiumTierCard(card) && (feeTolerance === 'None' || feeTolerance === 'Low')) return 'Premium travel card — high fee may not offset value';
  return 'Close match — just outside the top results';
}

export function getNarrativeOneliner(card: Card, answers: Answers): string {
  const { primary } = getGoalRanks(answers);
  const rewardModel = (card.reward_model || '').toLowerCase();
  const isTravelCard = rewardModel === 'travel' || rewardModel === 'airline' || rewardModel === 'hotel';
  const isCashbackCard = rewardModel === 'cashback';
  const cardFee = parseInt(card.annual_fee || '0', 10);
  const feeTolerance = answers.annual_fee_tolerance as string | undefined;
  const bonusValue = parseInt((card.estimated_bonus_value_usd || '0').replace(/\D/g, ''), 10);
  const minSpend = parseMinSpend(card.minimum_spend_amount);
  const hasTransferPartners = (card.transfer_partners || '').trim().length > 0 && !/^(no|none|n\/a)$/i.test((card.transfer_partners || '').trim());
  const hasFTF = (card.foreign_tx_fee || '').trim().toUpperCase() === 'YES' || ((card.ftf || '').trim() !== '' && (card.ftf || '').trim() !== '0%' && !/^(no|none|n\/a|0)$/i.test((card.ftf || '').trim()));

  const parts: string[] = [];
  if (primary === 'Travel' && isTravelCard) {
    if (hasTransferPartners) parts.push('flexible points you can transfer to airlines and hotels');
    else if (rewardModel === 'airline') parts.push('miles that go straight toward flights');
    else if (rewardModel === 'hotel') parts.push('hotel points for free nights');
    else parts.push('strong travel rewards');
  } else if (primary === 'Bonus' && bonusValue >= 500) {
    parts.push(`big signup bonus (${card.estimated_bonus_value_usd})`);
  } else if (primary === 'Bonus' && bonusValue > 0) {
    parts.push(`solid signup offer (${card.estimated_bonus_value_usd})`);
  } else if ((primary === 'Cashback' || primary === 'Everyday') && isCashbackCard) {
    const rate = parseFloat(card.cashback_rate_effective || '0');
    parts.push(rate >= 2 ? `${rate}% cash back on everything` : 'flat cash back on everyday purchases');
  }
  if (cardFee === 0) parts.push('no annual fee');
  else if ((feeTolerance === 'Medium' || feeTolerance === 'High') && isPremiumTierCard(card) && isTravelCard) parts.push(`premium perks that offset the $${cardFee} fee`);
  if (primary === 'Travel' && !hasFTF) parts.push('no foreign transaction fees');
  if (bonusValue >= 500 && minSpend >= 5000) parts.push(`requires $${(minSpend / 1000).toFixed(0)}k spend to unlock`);
  if (parts.length === 0) return '';
  const sentence = parts.map((p, i) => i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p).join(', ');
  return `Best for you: ${sentence}.`;
}

export interface ScoreBreakdownItem { label: string; value: string; good: boolean; }

export function getScoreBreakdown(card: Card, answers: Answers): ScoreBreakdownItem[] {
  const { primary } = getGoalRanks(answers);
  const rewardModel = (card.reward_model || '').toLowerCase();
  const isTravelCard = rewardModel === 'travel' || rewardModel === 'airline' || rewardModel === 'hotel';
  const isCashbackCard = rewardModel === 'cashback';
  const cardFee = parseInt(card.annual_fee || '0', 10);
  const feeTolerance = answers.annual_fee_tolerance as string | undefined;
  const bonusValue = parseInt((card.estimated_bonus_value_usd || '0').replace(/\D/g, ''), 10);
  const minSpend = parseMinSpend(card.minimum_spend_amount);
  const caresAboutTravel = primary === 'Travel';

  let goalValue: string; let goalGood: boolean;
  if (caresAboutTravel && isTravelCard) { goalValue = 'Travel card — matches your #1 goal'; goalGood = true; }
  else if (caresAboutTravel && isCashbackCard) { goalValue = 'Cashback card — not optimized for travel'; goalGood = false; }
  else if ((primary === 'Cashback' || primary === 'Everyday') && isCashbackCard) { goalValue = 'Cashback card — matches your goal'; goalGood = true; }
  else if (primary === 'Bonus' && bonusValue >= 500) { goalValue = `Strong signup bonus (${card.estimated_bonus_value_usd})`; goalGood = true; }
  else if (primary === 'Bonus' && bonusValue < 200) { goalValue = 'Modest signup bonus'; goalGood = false; }
  else { goalValue = `${rewardModel ? rewardModel.charAt(0).toUpperCase() + rewardModel.slice(1) : 'General'} card`; goalGood = true; }

  let feeValue: string; let feeGood: boolean;
  if (cardFee === 0) { feeValue = 'No annual fee'; feeGood = true; }
  else if (feeTolerance === 'None') { feeValue = `$${cardFee}/yr — outside your fee tolerance`; feeGood = false; }
  else if (feeTolerance === 'Low' && cardFee > 100) { feeValue = `$${cardFee}/yr — above your low-fee preference`; feeGood = false; }
  else { feeValue = `$${cardFee}/yr — within your tolerance`; feeGood = true; }

  let bonusEffValue: string; let bonusEffGood: boolean;
  if (bonusValue > 0 && minSpend > 0) {
    const ratio = bonusValue / minSpend;
    if (ratio >= 0.15) { bonusEffValue = `${card.estimated_bonus_value_usd} bonus for $${minSpend.toLocaleString()} spend (great ratio)`; bonusEffGood = true; }
    else if (ratio >= 0.08) { bonusEffValue = `${card.estimated_bonus_value_usd} bonus for $${minSpend.toLocaleString()} spend`; bonusEffGood = true; }
    else { bonusEffValue = `${card.estimated_bonus_value_usd} bonus for $${minSpend.toLocaleString()} spend (low ratio)`; bonusEffGood = false; }
  } else if (bonusValue > 0) { bonusEffValue = `${card.estimated_bonus_value_usd} estimated bonus value`; bonusEffGood = bonusValue >= 300; }
  else { bonusEffValue = 'No signup bonus — ongoing rewards card'; bonusEffGood = primary === 'Cashback' || primary === 'Everyday'; }

  return [
    { label: 'Goal match', value: goalValue, good: goalGood },
    { label: 'Annual fee', value: feeValue, good: feeGood },
    { label: 'Bonus efficiency', value: bonusEffValue, good: bonusEffGood },
  ];
}
