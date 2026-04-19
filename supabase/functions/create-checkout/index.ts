// Deno edge function — create Stripe Checkout session
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const PRICE_IDS: Record<string, string> = {
  monthly: Deno.env.get('STRIPE_PRICE_ID_MONTHLY') ?? '',
  annual:  Deno.env.get('STRIPE_PRICE_ID_ANNUAL')  ?? '',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { plan } = await req.json() as { plan: 'monthly' | 'annual' };
    const priceId = PRICE_IDS[plan];
    if (!priceId) return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400, headers: corsHeaders });

    const appUrl = Deno.env.get('APP_URL') ?? 'https://cardscout.app';

    // Reuse or create Stripe customer
    const { data: subRow } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).single();
    let customerId: string | undefined = subRow?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } });
      customerId = customer.id;
      // Store customer ID for future lookups
      await supabase.from('subscriptions').upsert(
        { user_id: user.id, stripe_customer_id: customerId, plan: 'free', status: 'incomplete' },
        { onConflict: 'user_id' },
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { supabase_user_id: user.id },
      },
      success_url: `${appUrl}/settings?upgrade=success`,
      cancel_url:  `${appUrl}/settings?upgrade=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
