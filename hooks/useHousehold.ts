import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { HouseholdMember } from '@/lib/applicationTypes';
import { MAX_HOUSEHOLD_MEMBERS } from '@/lib/applicationTypes';

const HOUSEHOLD_KEY = ['household'] as const;
const SETUP_COMPLETE_KEY = 'household_setup_complete';
const STALE_MS = 5 * 60 * 1000;

// ============================================================
// Queries
// ============================================================

export function useHousehold() {
  return useQuery({
    queryKey: [...HOUSEHOLD_KEY],
    queryFn: async (): Promise<HouseholdMember[]> => {
      try {
        const { data, error } = await supabase
          .from('household_members')
          .select('*')
          .order('role', { ascending: true })
          .order('created_at', { ascending: true });

        if (error) throw error;
        return (data ?? []) as HouseholdMember[];
      } catch {
        return [];
      }
    },
    staleTime: STALE_MS,
  });
}

export function useHouseholdSetupComplete() {
  return useQuery({
    queryKey: ['household_setup_complete'],
    queryFn: async (): Promise<boolean> => {
      const val = await AsyncStorage.getItem(SETUP_COMPLETE_KEY);
      return val === 'true';
    },
    staleTime: Infinity,
  });
}

// ============================================================
// Mutations
// ============================================================

type CreateMemberInput = {
  name: string;
  role: 'primary' | 'partner' | 'other';
};

export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMemberInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Enforce household cap
      const existing = queryClient.getQueryData<HouseholdMember[]>(HOUSEHOLD_KEY);
      if (existing && existing.length >= MAX_HOUSEHOLD_MEMBERS) {
        throw new Error(`Household is limited to ${MAX_HOUSEHOLD_MEMBERS} members`);
      }

      const { data, error } = await supabase
        .from('household_members')
        .insert({ ...input, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as HouseholdMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEY });
    },
  });
}

type UpdateMemberInput = {
  id: string;
  name?: string;
  role?: 'primary' | 'partner' | 'other';
};

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateMemberInput) => {
      const { data, error } = await supabase
        .from('household_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as HouseholdMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEY });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEY });
    },
  });
}

export function useMarkHouseholdSetupComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await AsyncStorage.setItem(SETUP_COMPLETE_KEY, 'true');
    },
    onSuccess: () => {
      queryClient.setQueryData(['household_setup_complete'], true);
    },
  });
}
