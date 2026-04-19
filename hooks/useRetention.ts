import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  RetentionScript,
  DowngradePath,
  RetentionOutcome,
  RetentionOutcomeType,
} from '@/lib/applicationTypes';

const SCRIPTS_KEY = ['retention_scripts'] as const;
const DOWNGRADES_KEY = ['downgrade_paths'] as const;
const OUTCOMES_KEY = ['retention_outcomes'] as const;
const STALE_MS = 30 * 60 * 1000; // 30 min — static data

// ============================================================
// Retention Scripts
// ============================================================

export function useRetentionScripts(issuer?: string) {
  return useQuery({
    queryKey: issuer ? [...SCRIPTS_KEY, issuer] : [...SCRIPTS_KEY],
    queryFn: async (): Promise<RetentionScript[]> => {
      try {
        let query = supabase
          .from('retention_scripts')
          .select('*')
          .order('situation', { ascending: true });

        if (issuer) {
          query = query.or(`issuer.eq.${issuer},issuer.eq.other`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as RetentionScript[];
      } catch {
        return getFallbackScripts(issuer);
      }
    },
    staleTime: STALE_MS,
  });
}

// ============================================================
// Downgrade Paths
// ============================================================

export function useDowngradePaths(issuer?: string) {
  return useQuery({
    queryKey: issuer ? [...DOWNGRADES_KEY, issuer] : [...DOWNGRADES_KEY],
    queryFn: async (): Promise<DowngradePathWithNames[]> => {
      try {
        let query = supabase
          .from('downgrade_paths')
          .select('*')
          .order('issuer', { ascending: true });

        if (issuer) {
          query = query.eq('issuer', issuer);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Parse the "From → To|Notes" format from the notes field
        return ((data ?? []) as DowngradePath[]).map(parseDowngradePath);
      } catch {
        return getFallbackDowngrades(issuer);
      }
    },
    staleTime: STALE_MS,
  });
}

// ============================================================
// Retention Outcomes (user-generated)
// ============================================================

export function useRetentionOutcomes(applicationId?: string) {
  return useQuery({
    queryKey: applicationId
      ? [...OUTCOMES_KEY, applicationId]
      : [...OUTCOMES_KEY],
    queryFn: async (): Promise<RetentionOutcome[]> => {
      try {
        let query = supabase
          .from('retention_outcomes')
          .select('*')
          .order('called_at', { ascending: false });

        if (applicationId) {
          query = query.eq('application_id', applicationId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as RetentionOutcome[];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!applicationId,
  });
}

type CreateOutcomeInput = {
  application_id: string;
  fee_amount: number | null;
  outcome: RetentionOutcomeType;
  points_offered: number | null;
  credit_offered: number | null;
  accepted: boolean | null;
  notes: string | null;
};

export function useCreateRetentionOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOutcomeInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('retention_outcomes')
        .insert({
          ...input,
          user_id: user.id,
          called_at: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      return data as RetentionOutcome;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: OUTCOMES_KEY });
      queryClient.invalidateQueries({
        queryKey: [...OUTCOMES_KEY, variables.application_id],
      });
    },
  });
}

// ============================================================
// Types & Helpers
// ============================================================

export interface DowngradePathWithNames extends DowngradePath {
  from_card_name: string;
  to_card_name: string;
  description: string;
}

function parseDowngradePath(dp: DowngradePath): DowngradePathWithNames {
  // Notes format: "From Card → To Card|Description text"
  const notes = dp.notes ?? '';
  const [names, description] = notes.split('|');
  const [fromName, toName] = (names ?? '').split('→').map((s) => s.trim());

  return {
    ...dp,
    from_card_name: fromName ?? 'Unknown',
    to_card_name: toName ?? 'Unknown',
    description: description?.trim() ?? '',
  };
}

// ============================================================
// Fallback data (when Supabase is unreachable)
// ============================================================

function getFallbackScripts(issuer?: string): RetentionScript[] {
  const all: RetentionScript[] = [
    {
      id: 'fallback-1', issuer: 'chase', situation: 'below_breakeven',
      script_text: 'Hi, I\'ve been a Chase cardmember for a while now, and my annual fee just posted. I\'m trying to evaluate whether the card still makes sense for my spending. Are there any retention offers available?',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'fallback-2', issuer: 'amex', situation: 'below_breakeven',
      script_text: 'Hi, I\'ve been an Amex cardmember for several years. My annual fee is coming up, and while I love the benefits, I\'m not sure I\'m using them enough to justify the fee. Are there any retention offers available?',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'fallback-3', issuer: 'other', situation: 'below_breakeven',
      script_text: 'Hi, my annual fee is approaching and I\'m evaluating whether to keep this card. Are there any retention offers, statement credits, or bonus points available?',
      updated_at: new Date().toISOString(),
    },
  ];

  if (issuer) {
    return all.filter((s) => s.issuer === issuer || s.issuer === 'other');
  }
  return all;
}

function getFallbackDowngrades(issuer?: string): DowngradePathWithNames[] {
  const all: DowngradePathWithNames[] = [
    {
      id: 'fb-dp-1', from_card_id: '', to_card_id: '', issuer: 'chase',
      notes: 'Chase Sapphire Reserve → Chase Freedom Flex|No annual fee. Quarterly 5x categories.',
      from_card_name: 'Chase Sapphire Reserve', to_card_name: 'Chase Freedom Flex',
      description: 'No annual fee. Quarterly 5x categories.',
    },
    {
      id: 'fb-dp-2', from_card_id: '', to_card_id: '', issuer: 'amex',
      notes: 'Amex Platinum → Amex EveryDay|No annual fee. Keeps MR pool alive.',
      from_card_name: 'Amex Platinum', to_card_name: 'Amex EveryDay',
      description: 'No annual fee. Keeps MR pool alive.',
    },
  ];

  if (issuer) return all.filter((d) => d.issuer === issuer);
  return all;
}
