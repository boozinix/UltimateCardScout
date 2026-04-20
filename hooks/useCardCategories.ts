import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CardCategory, RewardsCurrency } from '@/lib/applicationTypes';
import { CURRENCY_CPP } from '@/lib/applicationTypes';

const CATEGORIES_KEY = ['card_categories'] as const;
const STALE_MS = 30 * 60 * 1000; // 30 min — static reference data

// ============================================================
// Fetch card categories from Supabase (fallback to local)
// ============================================================

export function useCardCategories() {
  return useQuery({
    queryKey: [...CATEGORIES_KEY],
    queryFn: async (): Promise<CardCategoryWithCard[]> => {
      try {
        const { data, error } = await supabase
          .from('card_categories')
          .select('*, card:cards(id, name, issuer, rewards_currency)')
          .order('multiplier', { ascending: false });

        if (error) throw error;

        return ((data ?? []) as any[]).map((row) => ({
          ...row,
          card_name: row.card?.name ?? parseCardNameFromNotes(row.notes),
          card_issuer: row.card?.issuer ?? parseIssuerFromNotes(row.notes),
          rewards_currency: row.card?.rewards_currency ?? null,
        }));
      } catch {
        return getFallbackCategories();
      }
    },
    staleTime: STALE_MS,
  });
}

// ============================================================
// Spend optimizer ranking logic
// ============================================================

export interface RankedCard {
  card_name: string;
  card_issuer: string;
  multiplier: number;
  cpp: number;
  valuePerDollar: number;
  totalValue: number | null;
  isNearCap: boolean;
  capInfo: string | null;
  rewards_currency: string | null;
}

/**
 * Rank user's cards for a given spend category.
 * Ranks by dollar value (multiplier x cpp), not raw earn rate.
 * Cards without an explicit bonus entry are shown at 1x base rate.
 */
export function rankCards(
  userCardNames: string[],
  allCategories: CardCategoryWithCard[],
  category: string,
  pointsValuations: Record<string, number>,
  amount?: number,
): RankedCard[] {
  // Normalize user card names for matching
  const userNamesLower = new Set(userCardNames.map((n) => n.toLowerCase()));

  // Filter categories for this spend category that belong to user's cards
  const matching = allCategories.filter((cc) => {
    const catMatch = cc.category.toLowerCase() === category.toLowerCase();
    const nameMatch = userNamesLower.has(cc.card_name.toLowerCase());
    return catMatch && nameMatch;
  });

  // Track which cards have explicit bonus entries
  const matchedNamesLower = new Set(matching.map((cc) => cc.card_name.toLowerCase()));

  // Build bonus card results
  const bonusCards: RankedCard[] = matching.map((cc) => {
    const currency = cc.rewards_currency as RewardsCurrency | null;
    const cpp = currency
      ? (pointsValuations[currency] ?? CURRENCY_CPP[currency] ?? 1.0)
      : 1.0;
    const valuePerDollar = (cc.multiplier * cpp) / 100;
    const isNearCap = cc.cap_amount != null && amount != null
      ? amount > cc.cap_amount * 0.8
      : false;

    return {
      card_name: cc.card_name,
      card_issuer: cc.card_issuer,
      multiplier: cc.multiplier,
      cpp,
      valuePerDollar,
      totalValue: amount ? amount * valuePerDollar : null,
      isNearCap,
      capInfo: cc.cap_amount
        ? `Cap: $${cc.cap_amount.toLocaleString()}/${cc.cap_period ?? 'period'}`
        : null,
      rewards_currency: currency,
    };
  });

  // Add base-rate (1x) cards for user cards without an explicit entry
  const baseRateCards: RankedCard[] = userCardNames
    .filter((name) => !matchedNamesLower.has(name.toLowerCase()))
    .map((name) => {
      // Look up this card's currency from any category entry
      const anyEntry = allCategories.find(
        (cc) => cc.card_name.toLowerCase() === name.toLowerCase(),
      );
      const currency = (anyEntry?.rewards_currency ?? 'cash') as RewardsCurrency;
      const cpp = pointsValuations[currency] ?? CURRENCY_CPP[currency] ?? 1.0;
      const valuePerDollar = (1 * cpp) / 100; // 1x base rate

      return {
        card_name: name,
        card_issuer: anyEntry?.card_issuer ?? 'other',
        multiplier: 1,
        cpp,
        valuePerDollar,
        totalValue: amount ? amount * valuePerDollar : null,
        isNearCap: false,
        capInfo: null,
        rewards_currency: currency,
      };
    });

  return [...bonusCards, ...baseRateCards].sort((a, b) => b.valuePerDollar - a.valuePerDollar);
}

// ============================================================
// Available spend categories (derived from data)
// ============================================================

export const SPEND_CATEGORIES = [
  { id: 'dining', label: 'Dining' },
  { id: 'grocery', label: 'Grocery' },
  { id: 'travel', label: 'Travel' },
  { id: 'gas', label: 'Gas' },
  { id: 'flights', label: 'Flights' },
  { id: 'hotels', label: 'Hotels' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'transit', label: 'Transit' },
  { id: 'drugstore', label: 'Drugstore' },
  { id: 'office', label: 'Office' },
  { id: 'rent', label: 'Rent' },
  { id: 'mobile_wallet', label: 'Mobile Wallet' },
  { id: 'advertising', label: 'Advertising' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'internet', label: 'Internet' },
  { id: 'phone', label: 'Phone' },
] as const;

// ============================================================
// Types
// ============================================================

export interface CardCategoryWithCard extends CardCategory {
  card_name: string;
  card_issuer: string;
  rewards_currency: string | null;
}

// ============================================================
// Helpers
// ============================================================

function parseCardNameFromNotes(notes: string | null): string {
  if (!notes) return 'Unknown';
  // Notes format: "Card Name — description"
  const dash = notes.indexOf('—');
  if (dash > 0) return notes.substring(0, dash).trim();
  return 'Unknown';
}

function parseIssuerFromNotes(notes: string | null): string {
  const name = parseCardNameFromNotes(notes).toLowerCase();
  if (name.includes('chase')) return 'chase';
  if (name.includes('amex')) return 'amex';
  if (name.includes('citi')) return 'citi';
  if (name.includes('capital one')) return 'capital_one';
  if (name.includes('bilt')) return 'other';
  if (name.includes('us bank')) return 'us_bank';
  if (name.includes('bofa') || name.includes('bank of america')) return 'bank_of_america';
  if (name.includes('wells fargo')) return 'wells_fargo';
  if (name.includes('barclays')) return 'barclays';
  if (name.includes('discover')) return 'discover';
  return 'other';
}

// ============================================================
// Fallback categories (when Supabase unreachable)
// ============================================================

function getFallbackCategories(): CardCategoryWithCard[] {
  const make = (
    cardName: string, issuer: string, category: string,
    multiplier: number, currency: string | null,
    cap?: number, capPeriod?: string,
  ): CardCategoryWithCard => ({
    id: `fb-${cardName}-${category}`,
    card_id: '',
    category,
    multiplier,
    cap_amount: cap ?? null,
    cap_period: capPeriod ?? null,
    expires_date: null,
    notes: `${cardName} — ${multiplier}x ${category}`,
    card_name: cardName,
    card_issuer: issuer,
    rewards_currency: currency,
  });

  return [
    // Chase Sapphire Reserve
    make('Chase Sapphire Reserve', 'chase', 'travel', 3, 'chase_ur'),
    make('Chase Sapphire Reserve', 'chase', 'dining', 3, 'chase_ur'),
    // Chase Sapphire Preferred
    make('Chase Sapphire Preferred', 'chase', 'travel', 2, 'chase_ur'),
    make('Chase Sapphire Preferred', 'chase', 'dining', 3, 'chase_ur'),
    make('Chase Sapphire Preferred', 'chase', 'streaming', 3, 'chase_ur'),
    make('Chase Sapphire Preferred', 'chase', 'grocery', 3, 'chase_ur'),
    // Chase Freedom Flex
    make('Chase Freedom Flex', 'chase', 'dining', 3, 'chase_ur'),
    make('Chase Freedom Flex', 'chase', 'drugstore', 3, 'chase_ur'),
    make('Chase Freedom Flex', 'chase', 'rotating', 5, 'chase_ur', 1500, 'quarter'),
    // Chase Freedom Unlimited
    make('Chase Freedom Unlimited', 'chase', 'dining', 3, 'chase_ur'),
    make('Chase Freedom Unlimited', 'chase', 'drugstore', 3, 'chase_ur'),
    // Amex Platinum
    make('Amex Platinum', 'amex', 'flights', 5, 'amex_mr'),
    make('Amex Platinum', 'amex', 'hotels', 5, 'amex_mr'),
    // Amex Gold
    make('Amex Gold', 'amex', 'dining', 4, 'amex_mr'),
    make('Amex Gold', 'amex', 'grocery', 4, 'amex_mr'),
    make('Amex Gold', 'amex', 'flights', 3, 'amex_mr'),
    // Capital One Savor
    make('Capital One Savor', 'capital_one', 'dining', 4, 'capital_one_miles'),
    make('Capital One Savor', 'capital_one', 'entertainment', 4, 'capital_one_miles'),
    make('Capital One Savor', 'capital_one', 'streaming', 4, 'capital_one_miles'),
    make('Capital One Savor', 'capital_one', 'grocery', 3, 'capital_one_miles'),
    // Bilt
    make('Bilt Mastercard', 'other', 'dining', 3, 'other'),
    make('Bilt Mastercard', 'other', 'travel', 2, 'other'),
    make('Bilt Mastercard', 'other', 'rent', 1, 'other'),
    // Citi Strata Premier
    make('Citi Strata Premier', 'citi', 'flights', 3, 'citi_typ'),
    make('Citi Strata Premier', 'citi', 'hotels', 3, 'citi_typ'),
    make('Citi Strata Premier', 'citi', 'dining', 3, 'citi_typ'),
    make('Citi Strata Premier', 'citi', 'grocery', 3, 'citi_typ'),
    make('Citi Strata Premier', 'citi', 'gas', 3, 'citi_typ'),
    // US Bank Altitude Reserve
    make('US Bank Altitude Reserve', 'us_bank', 'mobile_wallet', 3, 'other'),
    make('US Bank Altitude Reserve', 'us_bank', 'travel', 3, 'other'),
  ];
}
