import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  PointsBalance,
  PointsBalanceWithValue,
  PointsValuation,
  PortfolioSummary,
  RewardsCurrency,
} from '@/lib/applicationTypes';
import { CURRENCY_CPP, CURRENCY_LABELS, pointsToDollars } from '@/lib/applicationTypes';
import { useHousehold } from './useHousehold';

const BALANCES_KEY = ['points_balances'] as const;
const VALUATIONS_KEY = ['points_valuations'] as const;
const STALE_MS = 5 * 60 * 1000;

// ============================================================
// Fetch server-side CPP valuations (fallback to local constants)
// ============================================================

export function useValuations() {
  return useQuery({
    queryKey: [...VALUATIONS_KEY],
    queryFn: async (): Promise<Record<string, number>> => {
      try {
        const { data, error } = await supabase
          .from('points_valuations')
          .select('program, cpp');

        if (error || !data?.length) return {};
        const map: Record<string, number> = {};
        for (const row of data as PointsValuation[]) {
          map[row.program] = Number(row.cpp);
        }
        return map;
      } catch {
        return {};
      }
    },
    staleTime: 30 * 60 * 1000, // 30 min — valuations change rarely
  });
}

/** Resolve CPP: server-side valuations override local constants */
export function resolveCpp(
  currency: RewardsCurrency,
  serverValuations: Record<string, number>,
): number {
  const label = CURRENCY_LABELS[currency];
  if (label && serverValuations[label] !== undefined) {
    return serverValuations[label];
  }
  return CURRENCY_CPP[currency] ?? 1.0;
}

// ============================================================
// Queries
// ============================================================

export function usePointsBalances(memberId?: string) {
  const { data: serverCpp } = useValuations();

  return useQuery({
    queryKey: memberId ? [...BALANCES_KEY, 'member', memberId] : [...BALANCES_KEY],
    queryFn: async (): Promise<PointsBalanceWithValue[]> => {
      try {
        let query = supabase
          .from('points_balances')
          .select('*')
          .order('currency', { ascending: true });

        if (memberId) {
          query = query.eq('household_member_id', memberId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const cpp = serverCpp ?? {};
        return ((data ?? []) as PointsBalance[]).map((b) => ({
          ...b,
          dollar_value: (b.balance * resolveCpp(b.currency, cpp)) / 100,
          currency_label: CURRENCY_LABELS[b.currency] ?? b.currency,
          cpp: resolveCpp(b.currency, cpp),
        }));
      } catch {
        return [];
      }
    },
    staleTime: STALE_MS,
  });
}

export function usePortfolioTotal() {
  const { data: balances } = usePointsBalances();
  const { data: members } = useHousehold();

  return useQuery({
    queryKey: ['portfolio_total'],
    queryFn: (): PortfolioSummary => {
      const all = balances ?? [];
      const total = all.reduce((sum, b) => sum + b.dollar_value, 0);

      const byMember: PortfolioSummary['by_member'] = {};
      for (const b of all) {
        const mid = b.household_member_id ?? '__self__';
        if (!byMember[mid]) {
          const member = members?.find((m) => m.id === mid);
          byMember[mid] = {
            name: member?.name ?? 'You',
            total_dollar_value: 0,
            balances: [],
          };
        }
        byMember[mid].balances.push(b);
        byMember[mid].total_dollar_value += b.dollar_value;
      }

      return { total_dollar_value: total, balances: all, by_member: byMember };
    },
    enabled: balances !== undefined,
    staleTime: STALE_MS,
  });
}

// ============================================================
// Mutations
// ============================================================

type UpsertBalanceInput = {
  household_member_id: string | null;
  currency: RewardsCurrency;
  balance: number;
};

export function useUpdateBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpsertBalanceInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('points_balances')
        .upsert(
          {
            user_id: user.id,
            household_member_id: input.household_member_id,
            currency: input.currency,
            balance: input.balance,
            last_updated_at: new Date().toISOString().split('T')[0],
          },
          { onConflict: 'user_id,household_member_id,currency' },
        )
        .select()
        .single();

      if (error) throw error;
      return data as PointsBalance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BALANCES_KEY });
      queryClient.invalidateQueries({ queryKey: ['portfolio_total'] });
    },
  });
}
