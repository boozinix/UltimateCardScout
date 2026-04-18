// Deno edge function — fetch a card URL, strip HTML, extract benefits via GPT-4o
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a credit card benefits extraction specialist. Given raw text from a credit card webpage, extract a structured list of card benefits.

For each benefit return:
- title: short benefit name (e.g. "Airline Fee Credit")
- description: 1-2 sentence explanation of how to use it
- value: annual USD value as a number, or null if not applicable
- frequency: one of "monthly" | "quarterly" | "semi-annual" | "annual" | "multi-year"
- category: one of "travel" | "dining" | "entertainment" | "fitness" | "hotel" | "shopping" | null
- reminder_default_days: how many days before period end to remind (e.g. 7 for monthly, 30 for annual)
- reset_logic: "calendar_year" | "account_anniversary" | "statement_credit" | null, or for multi-year: "4 years" etc.

Respond ONLY with a JSON array of benefit objects. No markdown, no explanation.`;

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

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

    // Gate behind paid — check subscription
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: sub } = await supabaseAdmin.from('subscriptions').select('plan, status').eq('user_id', user.id).single();
    if (!sub || (sub.plan !== 'pro') || (sub.status !== 'active' && sub.status !== 'trialing')) {
      return new Response(JSON.stringify({ error: 'Pro subscription required' }), { status: 403, headers: corsHeaders });
    }

    const { url, card_name, issuer } = await req.json() as { url: string; card_name: string; issuer: string };
    if (!url) return new Response(JSON.stringify({ error: 'url required' }), { status: 400, headers: corsHeaders });

    // Fetch page HTML
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CardScout/1.0)' },
    });
    if (!pageRes.ok) return new Response(JSON.stringify({ error: `Failed to fetch: ${pageRes.status}` }), { status: 422, headers: corsHeaders });

    const html = await pageRes.text();
    const text = stripHtml(html);

    // GPT-4o extraction
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Card: ${card_name} by ${issuer}\n\nPage content:\n${text}` },
        ],
        temperature: 0,
        max_tokens: 2000,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return new Response(JSON.stringify({ error: `OpenAI error: ${err}` }), { status: 502, headers: corsHeaders });
    }

    const openaiData = await openaiRes.json();
    const raw = openaiData.choices?.[0]?.message?.content ?? '[]';
    let benefits: unknown[];
    try {
      benefits = JSON.parse(raw);
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse GPT response', raw }), { status: 502, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ benefits }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
