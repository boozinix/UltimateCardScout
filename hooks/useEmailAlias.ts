import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UserEmailAlias } from '@/lib/applicationTypes';

const ALIAS_KEY = ['email_alias'] as const;
const STALE_MS = 5 * 60 * 1000;

// ============================================================
// Helpers
// ============================================================

/** Generate a unique 8-char hex alias: u_a1b2c3d4 */
function generateAlias(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `u_${hex}`;
}

// ============================================================
// Queries
// ============================================================

/** Get the current user's email alias */
export function useEmailAlias() {
  return useQuery({
    queryKey: [...ALIAS_KEY],
    queryFn: async (): Promise<UserEmailAlias | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
          .from('user_email_aliases')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) return null;
        return data as UserEmailAlias;
      } catch {
        return null;
      }
    },
    staleTime: STALE_MS,
  });
}

/** Get email import stats for the current user */
export function useEmailImportStats() {
  return useQuery({
    queryKey: [...ALIAS_KEY, 'stats'],
    queryFn: async (): Promise<{
      total: number;
      autoApplied: number;
      pending: number;
      lastReceived: string | null;
    }> => {
      const defaultStats = { total: 0, autoApplied: 0, pending: 0, lastReceived: null };
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return defaultStats;

        const { data, error } = await supabase
          .from('data_proposals')
          .select('status, created_at')
          .eq('source_type', 'email_forward')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error || !data) return defaultStats;

        const proposals = data as Array<{ status: string; created_at: string }>;
        return {
          total: proposals.length,
          autoApplied: proposals.filter((p) => p.status === 'auto_applied').length,
          pending: proposals.filter((p) => p.status === 'pending' || p.status === 'auto_apply_pending').length,
          lastReceived: proposals[0]?.created_at ?? null,
        };
      } catch {
        return defaultStats;
      }
    },
    staleTime: STALE_MS,
  });
}

// ============================================================
// Mutations
// ============================================================

/** Create a new email alias for the current user */
export function useCreateEmailAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<UserEmailAlias> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const alias = generateAlias();

      const { data, error } = await supabase
        .from('user_email_aliases')
        .insert({ user_id: user.id, alias })
        .select()
        .single();

      if (error) throw error;
      return data as UserEmailAlias;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALIAS_KEY });
    },
  });
}

/** Regenerate alias — delete old, create new */
export function useRegenerateAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<UserEmailAlias> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete existing
      await supabase
        .from('user_email_aliases')
        .delete()
        .eq('user_id', user.id);

      // Create new
      const alias = generateAlias();
      const { data, error } = await supabase
        .from('user_email_aliases')
        .insert({ user_id: user.id, alias })
        .select()
        .single();

      if (error) throw error;
      return data as UserEmailAlias;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALIAS_KEY });
    },
  });
}

// ============================================================
// Constants
// ============================================================

export const EMAIL_DOMAIN = 'in.cardscout.app';

export const GMAIL_FILTER_RULE =
  'from:(chase.com OR americanexpress.com OR citi.com OR capitalone.com OR discover.com OR bankofamerica.com OR usbank.com OR barclays.com OR wellsfargo.com)';
