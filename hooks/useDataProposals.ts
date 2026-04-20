import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DataProposal, ProposalStatus } from '@/lib/applicationTypes';

const PROPOSALS_KEY = ['data_proposals'] as const;
const STALE_MS = 2 * 60 * 1000; // 2 min — admin checks frequently

// ============================================================
// Queries
// ============================================================

/** Fetch all proposals (admin only — service role bypasses RLS) */
export function useDataProposals(filters?: {
  status?: ProposalStatus;
  sourceType?: string;
  minConfidence?: number;
  maxConfidence?: number;
}) {
  return useQuery({
    queryKey: [...PROPOSALS_KEY, filters ?? 'all'],
    queryFn: async (): Promise<DataProposal[]> => {
      try {
        let query = supabase
          .from('data_proposals')
          .select('*')
          .order('created_at', { ascending: false });

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }
        if (filters?.sourceType) {
          query = query.eq('source_type', filters.sourceType);
        }
        if (filters?.minConfidence !== undefined) {
          query = query.gte('confidence_score', filters.minConfidence);
        }
        if (filters?.maxConfidence !== undefined) {
          query = query.lte('confidence_score', filters.maxConfidence);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as DataProposal[];
      } catch {
        return [];
      }
    },
    staleTime: STALE_MS,
  });
}

/** Count proposals by status (for badges and summary) */
export function useProposalCounts() {
  return useQuery({
    queryKey: [...PROPOSALS_KEY, 'counts'],
    queryFn: async (): Promise<Record<ProposalStatus, number>> => {
      const counts: Record<string, number> = {
        pending: 0,
        approved: 0,
        rejected: 0,
        auto_applied: 0,
        auto_apply_pending: 0,
      };
      try {
        const { data, error } = await supabase
          .from('data_proposals')
          .select('status');

        if (error) throw error;
        for (const row of data ?? []) {
          const s = (row as { status: string }).status;
          counts[s] = (counts[s] ?? 0) + 1;
        }
      } catch {
        // return zeros
      }
      return counts as Record<ProposalStatus, number>;
    },
    staleTime: STALE_MS,
  });
}

// ============================================================
// Mutations
// ============================================================

/** Approve a proposal — applies changes to target table */
export function useApproveProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      // Fetch the proposal
      const { data: proposal, error: fetchErr } = await supabase
        .from('data_proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (fetchErr || !proposal) throw new Error('Proposal not found');
      const p = proposal as DataProposal;

      // Apply changes to target table
      if (p.target_table && p.target_row_id) {
        const { error: updateErr } = await supabase
          .from(p.target_table)
          .update(p.proposed_change)
          .eq('id', p.target_row_id);
        if (updateErr) throw updateErr;
      } else if (p.target_table && !p.target_row_id) {
        const { error: insertErr } = await supabase
          .from(p.target_table)
          .insert(p.proposed_change);
        if (insertErr) throw insertErr;
      }

      // Mark as approved
      const { error: statusErr } = await supabase
        .from('data_proposals')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          applied_at: new Date().toISOString(),
        })
        .eq('id', proposalId);

      if (statusErr) throw statusErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROPOSALS_KEY });
    },
  });
}

/** Reject a proposal */
export function useRejectProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from('data_proposals')
        .update({
          status: 'rejected',
          reviewer_notes: notes ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROPOSALS_KEY });
    },
  });
}

/** Edit and approve — update proposed_change then apply */
export function useEditAndApproveProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      editedChange,
    }: {
      id: string;
      editedChange: Record<string, unknown>;
    }) => {
      // Fetch the proposal
      const { data: proposal, error: fetchErr } = await supabase
        .from('data_proposals')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !proposal) throw new Error('Proposal not found');
      const p = proposal as DataProposal;

      // Apply edited changes to target table
      if (p.target_table && p.target_row_id) {
        const { error: updateErr } = await supabase
          .from(p.target_table)
          .update(editedChange)
          .eq('id', p.target_row_id);
        if (updateErr) throw updateErr;
      } else if (p.target_table && !p.target_row_id) {
        const { error: insertErr } = await supabase
          .from(p.target_table)
          .insert(editedChange);
        if (insertErr) throw insertErr;
      }

      // Update proposal with edited values and mark approved
      const { error: statusErr } = await supabase
        .from('data_proposals')
        .update({
          proposed_change: editedChange,
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          applied_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (statusErr) throw statusErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROPOSALS_KEY });
    },
  });
}

/** Bulk approve all high-confidence proposals from a specific source */
export function useBulkApprove() {
  const queryClient = useQueryClient();
  const approve = useApproveProposal();

  return useMutation({
    mutationFn: async ({
      sourceType,
      minConfidence,
    }: {
      sourceType?: string;
      minConfidence?: number;
    }) => {
      let query = supabase
        .from('data_proposals')
        .select('id')
        .eq('status', 'pending');

      if (sourceType) query = query.eq('source_type', sourceType);
      if (minConfidence) query = query.gte('confidence_score', minConfidence);

      const { data, error } = await query;
      if (error) throw error;

      let approved = 0;
      for (const row of data ?? []) {
        try {
          await approve.mutateAsync((row as { id: string }).id);
          approved++;
        } catch {
          // Skip individual failures, continue bulk
        }
      }
      return { approved };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROPOSALS_KEY });
    },
  });
}

// ============================================================
// Source type labels
// ============================================================

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  doc_scraper: 'Doctor of Credit',
  reddit_scraper: 'Reddit',
  issuer_rescrape: 'Issuer Rescrape',
  email_forward: 'Email Forward',
  user_submission: 'User Submission',
  manual: 'Manual Entry',
};

export const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  new_card: 'New Card',
  bonus_change: 'Bonus Change',
  fee_change: 'Fee Change',
  update_card: 'Card Update',
  new_deal: 'New Deal',
  retention_datapoint: 'Retention Data',
  application_update: 'Application Update',
  bonus_update: 'Bonus Update',
  fee_reminder: 'Fee Reminder',
  balance_update: 'Balance Update',
  statement_update: 'Statement',
  other: 'Other',
};
