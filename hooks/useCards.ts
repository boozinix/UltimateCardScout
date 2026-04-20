import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import type { Card } from '@/lib/cardTypes';

async function loadCardsFromCSV(): Promise<Card[]> {
  const url = Platform.OS === 'web' ? '/cards.csv' : null;
  if (!url) return [];
  const res = await fetch(url);
  const text = await res.text();
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return data.map((row, i) => ({
    ...row,
    id: row.card_name + '_' + i,
    is_active: true,
  })) as unknown as Card[];
}

/**
 * Map Supabase row to the Card shape the rest of the app expects.
 * Key differences:
 *   - Supabase column is `name`, app expects `card_name`
 *   - Supabase `annual_fee` is numeric, app expects string
 */
function normalizeCard(row: Record<string, unknown>): Card {
  return {
    ...row,
    // Supabase column "name" → app field "card_name"
    card_name: (row.card_name as string) ?? (row.name as string) ?? '',
    // Supabase annual_fee is numeric; coerce to string for the scoring engine
    annual_fee: String(row.annual_fee ?? '0'),
    // Ensure required string fields are never null/undefined
    issuer: (row.issuer as string) ?? '',
    card_type: (row.card_type as string) ?? 'personal',
    reward_model: (row.reward_model as string) ?? '',
    card_family: (row.card_family as string) ?? '',
    cashback_rate_effective: (row.cashback_rate_effective as string) ?? '',
    estimated_bonus_value_usd: (row.estimated_bonus_value_usd as string) ?? '',
    intro_apr_purchase: (row.intro_apr_purchase as string) ?? '',
    best_for: (row.best_for as string) ?? '',
    pros: (row.pros as string) ?? '',
    cons: (row.cons as string) ?? '',
    signup_bonus: (row.signup_bonus as string) ?? '',
    signup_bonus_type: (row.signup_bonus_type as string) ?? '',
  } as Card;
}

async function fetchCards(): Promise<Card[]> {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error || !data?.length) return loadCardsFromCSV();
    return (data as Record<string, unknown>[]).map(normalizeCard);
  } catch {
    return loadCardsFromCSV();
  }
}

export function useCards() {
  return useQuery({
    queryKey: ['cards'],
    queryFn: fetchCards,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCard(cardId: string) {
  return useQuery({
    queryKey: ['card', cardId],
    queryFn: async (): Promise<Card | null> => {
      try {
        const { data, error } = await supabase
          .from('cards')
          .select('*')
          .eq('id', cardId)
          .single();
        if (error) return null;
        return normalizeCard(data as Record<string, unknown>);
      } catch {
        return null;
      }
    },
    enabled: !!cardId,
  });
}
