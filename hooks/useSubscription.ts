import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getSubscription, isPro, type SubscriptionState } from '@/lib/subscription';

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [isProUser, setIsProUser] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [sub, pro] = await Promise.all([getSubscription(), isPro()]);
    setState(sub);
    setIsProUser(pro);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return { subscription: state, isPro: isProUser, loading, refresh };
}

export function useFeatureGate(feature: 'wallet' | 'reminders' | 'dashboard' | 'ai' | 'export' | 'roi'): boolean {
  const { isPro } = useSubscription();
  return isPro;
}
