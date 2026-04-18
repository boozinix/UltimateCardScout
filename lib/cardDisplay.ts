import type { Card } from './cardTypes';

export function parseMinSpend(raw: string | undefined): number {
  if (!raw || !raw.trim()) return 0;
  const n = parseInt(raw.replace(/[$,]/g, '').trim(), 10);
  return Number.isNaN(n) ? 0 : n;
}

export function parseAnnualFee(raw: string | undefined): number {
  if (!raw || !raw.trim()) return 0;
  const lower = raw.toLowerCase();
  if (/no\s*annual\s*fee|\$0|^0$/.test(lower)) return 0;
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  return Number.isNaN(num) ? 0 : Math.round(num);
}

export function splitProsCons(text: string | undefined): string[] {
  if (!text || !text.trim()) return [];
  return text.split(/\s*[;•]\s*/).map((s) => s.trim()).filter(Boolean);
}

export function getBonusRewardsLabel(card: Card): string {
  const bonusType = (card.signup_bonus_type || '').toLowerCase();
  if (bonusType === 'dollars') return 'cash';
  const rt = (card.rewards_type || '').trim();
  if (rt) {
    if (rt.toLowerCase() === 'cash') return 'cash';
    return rt;
  }
  const issuer = (card.issuer || '').toLowerCase();
  if (issuer === 'chase') return 'Ultimate Rewards (UR) points';
  if (issuer === 'amex' || issuer === 'american express') return 'Membership Rewards (MR) points';
  if (bonusType === 'miles') return 'miles';
  return 'points';
}

export function getCashbackDisplay(card: Card): string | null {
  const display = card.cashback_rate_display?.trim();
  if (display) {
    const parts = display.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return null;
    return parts.map((p) => {
      const n = parseFloat(p);
      return Number.isNaN(n) ? p : `${n}%`;
    }).join(' / ');
  }
  const effective = card.cashback_rate_effective?.trim();
  if (effective && parseFloat(effective) >= 0) return `${effective}%`;
  return null;
}

export function getMainFeaturesForTile(card: Card): string[] {
  const features: string[] = [];
  const cashback = getCashbackDisplay(card);
  if (cashback) features.push(`${cashback} cash back`);
  if (card.intro_apr_purchase?.trim()) features.push(`Intro APR: ${card.intro_apr_purchase}`);
  if (card.special_feature_1?.trim()) features.push(card.special_feature_1);
  if (card.special_feature_2?.trim()) features.push(card.special_feature_2);
  if (card.lounge?.trim()) features.push(`Lounge: ${card.lounge}`);
  const ftf = (card.ftf || card.foreign_tx_fee || '').toString().toLowerCase();
  if (ftf === 'no' || ftf === '0' || ftf === '0%') features.push('No foreign transaction fee');
  if (features.length < 4 && card.pros?.trim()) {
    splitProsCons(card.pros).slice(0, 2).forEach((p) => {
      const clean = p.replace(/^\s*[✓•]\s*/, '').trim();
      if (clean && clean.length < 80) features.push(clean);
    });
  }
  return features.slice(0, 6);
}
