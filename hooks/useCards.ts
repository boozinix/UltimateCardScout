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

async function fetchCards(): Promise<Card[]> {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('is_active', true)
      .order('card_name');
    if (error || !data?.length) return loadCardsFromCSV();
    return data as Card[];
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
        return data as Card;
      } catch {
        return null;
      }
    },
    enabled: !!cardId,
  });
}
