import { supabase } from './supabase';

export type SubscriptionPlan = 'free' | 'pro';

export type SubscriptionState = {
  plan: SubscriptionPlan;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
};

const FREE_STATE: SubscriptionState = {
  plan: 'free',
  status: 'active',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  trialEnd: null,
};

export async function getSubscription(): Promise<SubscriptionState> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return FREE_STATE;

  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status, cancel_at_period_end, current_period_end, trial_end')
    .eq('user_id', session.user.id)
    .single();

  if (!data) return FREE_STATE;

  return {
    plan: (data.plan as SubscriptionPlan) ?? 'free',
    status: data.status ?? 'active',
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
    currentPeriodEnd: data.current_period_end ?? null,
    trialEnd: data.trial_end ?? null,
  };
}

export async function isPro(): Promise<boolean> {
  const sub = await getSubscription();
  if (sub.plan === 'pro' && (sub.status === 'active' || sub.status === 'trialing')) return true;
  if (sub.trialEnd && new Date(sub.trialEnd) > new Date()) return true;
  return false;
}

export const FREE_CARD_LIMIT = 3;          // vault cards (benefit tracking)
export const FREE_LEDGER_LIMIT = 5;        // application ledger entries
export const PRICING_MONTHLY_USD = 8.00;
export const PRICING_ANNUAL_USD  = 59.00;  // TBD — annual pricing not finalized
export const PRICING_TRIAL_DAYS  = 14;

export async function canAddCard(): Promise<boolean> {
  const pro = await isPro();
  if (pro) return true;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;

  const { count } = await supabase
    .from('user_cards')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id);

  return (count ?? 0) < FREE_CARD_LIMIT;
}

export async function createCheckoutSession(plan: 'monthly' | 'annual'): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { plan },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error || !data?.url) return null;
  return data.url as string;
}
