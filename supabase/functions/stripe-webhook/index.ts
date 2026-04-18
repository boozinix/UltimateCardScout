// Deno edge function — handle Stripe webhook events
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

async function upsertSubscription(
  userId: string,
  stripeCustomerId: string,
  stripeSubId: string,
  plan: 'free' | 'pro',
  status: string,
  periodStart: string,
  periodEnd: string,
  cancelAtPeriodEnd: boolean,
  trialEnd: string | null,
) {
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubId,
    plan,
    status,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: cancelAtPeriodEnd,
    trial_end: trialEnd,
  }, { onConflict: 'user_id' });
}

serve(async (req) => {
  const sig = req.headers.get('stripe-signature') ?? '';
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '');
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  const isPro = (status: string) => status === 'active' || status === 'trialing';

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== 'subscription') return new Response('ok');
    const userId = session.metadata?.supabase_user_id ?? (session.subscription_data as any)?.metadata?.supabase_user_id;
    if (!userId) return new Response('no user id', { status: 400 });

    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
    await upsertSubscription(
      userId,
      session.customer as string,
      sub.id,
      isPro(sub.status) ? 'pro' : 'free',
      sub.status,
      new Date(sub.current_period_start * 1000).toISOString(),
      new Date(sub.current_period_end * 1000).toISOString(),
      sub.cancel_at_period_end,
      sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    );
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.supabase_user_id;
    if (!userId) return new Response('no user id', { status: 400 });
    await upsertSubscription(
      userId,
      sub.customer as string,
      sub.id,
      isPro(sub.status) ? 'pro' : 'free',
      sub.status,
      new Date(sub.current_period_start * 1000).toISOString(),
      new Date(sub.current_period_end * 1000).toISOString(),
      sub.cancel_at_period_end,
      sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    );
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.supabase_user_id;
    if (!userId) return new Response('no user id', { status: 400 });
    await supabase.from('subscriptions')
      .update({ plan: 'free', status: 'canceled', cancel_at_period_end: false })
      .eq('user_id', userId);
  }

  return new Response('ok');
});
