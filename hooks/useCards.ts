import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Card } from '@/lib/cardTypes';

export function useCards() {
  return useQuery({
    queryKey: ['cards'],
    queryFn: async (): Promise<Card[]> => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('is_active', true)
        .order('card_name');
      if (error) throw error;
      return (data ?? []) as Card[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useCard(cardId: string) {
  return useQuery({
    queryKey: ['card', cardId],
    queryFn: async (): Promise<Card | null> => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', cardId)
        .single();
      if (error) return null;
      return data as Card;
    },
    enabled: !!cardId,
  });
}
