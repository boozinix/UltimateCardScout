import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  Application,
  ApplicationWithMember,
  Issuer,
  ApplicationStatus,
} from '@/lib/applicationTypes';

const APPS_KEY = ['applications'] as const;
const STALE_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================
// Queries
// ============================================================

export function useApplications(memberId?: string) {
  return useQuery({
    queryKey: memberId ? [...APPS_KEY, 'member', memberId] : [...APPS_KEY],
    queryFn: async (): Promise<ApplicationWithMember[]> => {
      try {
        let query = supabase
          .from('applications')
          .select('*, household_member:household_members(*)')
          .order('applied_month', { ascending: false });

        if (memberId) {
          query = query.eq('household_member_id', memberId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as ApplicationWithMember[];
      } catch {
        return [];
      }
    },
    staleTime: STALE_MS,
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: [...APPS_KEY, id],
    queryFn: async (): Promise<ApplicationWithMember | null> => {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('*, household_member:household_members(*)')
          .eq('id', id)
          .single();
        if (error) return null;
        return data as ApplicationWithMember;
      } catch {
        return null;
      }
    },
    enabled: !!id,
  });
}

// ============================================================
// Mutations
// ============================================================

type CreateApplicationInput = Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateApplicationInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('applications')
        .insert({ ...input, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Application;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPS_KEY });
    },
  });
}

type UpdateApplicationInput = Partial<Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  id: string;
};

export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateApplicationInput) => {
      const { data, error } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Application;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: APPS_KEY });
      queryClient.invalidateQueries({ queryKey: [...APPS_KEY, variables.id] });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: APPS_KEY });
      const previous = queryClient.getQueryData<ApplicationWithMember[]>(APPS_KEY);
      queryClient.setQueryData<ApplicationWithMember[]>(
        APPS_KEY,
        (old) => old?.filter((app) => app.id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(APPS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: APPS_KEY });
    },
  });
}

// ============================================================
// Helpers
// ============================================================

/** Detect issuer from card name string */
export function detectIssuer(cardName: string): Issuer {
  const name = cardName.toLowerCase();
  if (name.includes('amex') || name.includes('american express') || name.includes('platinum') || name.includes('gold card')) return 'amex';
  if (name.includes('chase') || name.includes('sapphire') || name.includes('freedom') || name.includes('ink')) return 'chase';
  if (name.includes('citi') || name.includes('premier') || name.includes('double cash') || name.includes('custom cash')) return 'citi';
  if (name.includes('capital one') || name.includes('venture') || name.includes('savor') || name.includes('quicksilver')) return 'capital_one';
  if (name.includes('bank of america') || name.includes('customized cash')) return 'bank_of_america';
  if (name.includes('u.s. bank') || name.includes('us bank') || name.includes('altitude')) return 'us_bank';
  if (name.includes('barclays') || name.includes('jetblue') || name.includes('aadvantage aviator')) return 'barclays';
  if (name.includes('wells fargo') || name.includes('autograph')) return 'wells_fargo';
  if (name.includes('discover')) return 'discover';
  if (name.includes('bilt')) return 'other';
  return 'other';
}
