import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getSubscription, type SubscriptionState } from '@/lib/subscription';

const SUB_KEY = ['subscription'] as const;
const STALE_MS = 5 * 60 * 1000; // 5 minutes

export function useSubscription() {
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery<SubscriptionState>({
    queryKey: SUB_KEY,
    queryFn: getSubscription,
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
  });

  // Refetch on app foreground (mobile)
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: SUB_KEY });
      }
    });
    return () => listener.remove();
  }, [queryClient]);

  // Refetch on auth state change
  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: SUB_KEY });
    });
    return () => authSub.unsubscribe();
  }, [queryClient]);

  const isPro = subscription?.plan === 'pro' &&
    (subscription.status === 'active' || subscription.status === 'trialing');

  return {
    subscription: subscription ?? null,
    isPro,
    status: subscription?.status ?? 'inactive',
    trialEndsAt: subscription?.trialEnd ?? null,
    plan: subscription?.plan ?? 'free',
    isLoading,
    loading: isLoading,
    refresh: () => queryClient.invalidateQueries({ queryKey: SUB_KEY }),
  };
}

export function useFeatureGate(feature: 'wallet' | 'reminders' | 'dashboard' | 'ai' | 'export' | 'roi'): boolean {
  const { isPro } = useSubscription();
  return isPro;
}
