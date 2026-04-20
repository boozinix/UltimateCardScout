// Deno edge function — Doctor of Credit scraper
// Schedule: Weekly cron, Mondays 6am PT
// Fetches DoC best-bonuses page, extracts card data via GPT-4o-mini,
// diffs against current catalog, writes to data_proposals.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const DOC_URL = 'https://www.doctorofcredit.com/best-current-credit-card-sign-up-bonuses/';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── GPT extraction ──────────────────────────────────────────────────────────

interface ExtractedCard {
  card_name: string;
  issuer: string;
  bonus_amount: number | null;
  bonus_currency: string | null;
  min_spend: number | null;
  spend_window_months: number | null;
  annual_fee: number | null;
  offer_url: string | null;
  notes: string | null;
}

async function gptExtractCards(htmlSnippet: string): Promise<ExtractedCard[]> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a credit card data extractor. Given HTML from Doctor of Credit's best bonuses page, extract every credit card offer into a JSON array. Return JSON: {"cards": [...]}. Each card object has: card_name (string), issuer (string: chase/amex/citi/capital_one/bank_of_america/us_bank/barclays/wells_fargo/discover/other), bonus_amount (number, the points/miles count), bonus_currency (string), min_spend (number, dollars), spend_window_months (number), annual_fee (number), offer_url (string or null), notes (string or null for special conditions). Return only valid JSON. If no cards found, return {"cards": []}.`,
        },
        {
          role: 'user',
          content: `Extract all credit card offers from this HTML:\n\n${htmlSnippet.slice(0, 30000)}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? '{"cards":[]}';
  const parsed = JSON.parse(content);
  return parsed.cards ?? [];
}

// ── Fuzzy matching ──────────────────────────────────────────────────────────

function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[®™©]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(
  extracted: ExtractedCard,
  catalogCards: Array<{ id: string; name: string; issuer: string }>,
): { id: string; name: string; issuer: string } | null {
  const norm = normalizeCardName(extracted.card_name);
  // Try exact name match first
  const exact = catalogCards.find(
    (c) => normalizeCardName(c.name) === norm,
  );
  if (exact) return exact;

  // Try partial match: extracted name contains catalog name or vice versa
  const partial = catalogCards.find((c) => {
    const cn = normalizeCardName(c.name);
    return norm.includes(cn) || cn.includes(norm);
  });
  if (partial) return partial;

  // Try issuer + last 2 words match
  const words = norm.split(' ');
  const tail = words.slice(-2).join(' ');
  if (tail.length > 3) {
    const issuerMatch = catalogCards.find((c) => {
      const cn = normalizeCardName(c.name);
      return cn.includes(tail) &&
        c.issuer?.toLowerCase() === extracted.issuer?.toLowerCase();
    });
    if (issuerMatch) return issuerMatch;
  }

  return null;
}

// ── Confidence scoring ──────────────────────────────────────────────────────

function calculateConfidence(
  changedFields: string[],
  isNewCard: boolean,
): number {
  if (isNewCard) return 0.75;
  if (changedFields.includes('issuer')) return 0.40;
  if (changedFields.every((f) => ['bonus_amount', 'min_spend', 'spend_window_months'].includes(f))) return 0.95;
  if (changedFields.includes('annual_fee')) return 0.92;
  return 0.80;
}

// ── Fingerprint ─────────────────────────────────────────────────────────────

function fingerprint(cardName: string, bonusAmount: number | null): string {
  return `doc-${normalizeCardName(cardName)}-${bonusAmount ?? 0}`;
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Fetch DoC page
    const html = await fetch(DOC_URL, {
      headers: { 'User-Agent': 'CardScout/1.0 (bonus-tracker)' },
    }).then((r) => r.text());

    if (!html || html.length < 1000) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch DoC page or page too short' }),
        { status: 502, headers: corsHeaders },
      );
    }

    // 2. Extract card data via GPT
    const extracted = await gptExtractCards(html);
    if (extracted.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No cards extracted', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Fetch current catalog for diff
    const { data: catalogRaw } = await supabase
      .from('cards')
      .select('id, name, issuer, signup_bonus, annual_fee, min_spend');
    const catalog = (catalogRaw ?? []) as Array<{
      id: string;
      name: string;
      issuer: string;
      signup_bonus: number;
      annual_fee: number;
      min_spend: number;
    }>;

    let created = 0;
    let skipped = 0;

    for (const card of extracted) {
      const fp = fingerprint(card.card_name, card.bonus_amount);

      // Dedupe: check if this fingerprint already exists as pending/auto_apply_pending
      const { data: existing } = await supabase
        .from('data_proposals')
        .select('id')
        .eq('source_fingerprint', fp)
        .in('status', ['pending', 'auto_apply_pending'])
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const match = fuzzyMatch(card, catalog);

      if (!match) {
        // New card — always manual review
        await supabase.from('data_proposals').insert({
          source_type: 'doc_scraper',
          source_url: DOC_URL,
          source_fingerprint: fp,
          proposal_type: 'new_card',
          target_table: 'cards',
          proposed_change: card,
          confidence_score: 0.75,
          status: 'pending',
        });
        created++;
      } else {
        // Existing card — diff
        const changes: Record<string, unknown> = {};
        const current: Record<string, unknown> = {};
        const changedFields: string[] = [];

        if (card.bonus_amount !== null && card.bonus_amount !== (match as any).signup_bonus) {
          changes.signup_bonus = card.bonus_amount;
          current.signup_bonus = (match as any).signup_bonus;
          changedFields.push('bonus_amount');
        }
        if (card.annual_fee !== null && card.annual_fee !== (match as any).annual_fee) {
          changes.annual_fee = card.annual_fee;
          current.annual_fee = (match as any).annual_fee;
          changedFields.push('annual_fee');
        }
        if (card.min_spend !== null && card.min_spend !== (match as any).min_spend) {
          changes.min_spend = card.min_spend;
          current.min_spend = (match as any).min_spend;
          changedFields.push('min_spend');
        }

        if (changedFields.length === 0) {
          skipped++;
          continue;
        }

        const confidence = calculateConfidence(changedFields, false);
        const proposalType = changedFields.includes('annual_fee') ? 'fee_change' : 'bonus_change';
        const autoApply = confidence > 0.9;

        await supabase.from('data_proposals').insert({
          source_type: 'doc_scraper',
          source_url: DOC_URL,
          source_fingerprint: fp,
          proposal_type: proposalType,
          target_table: 'cards',
          target_row_id: match.id,
          proposed_change: changes,
          current_value: current,
          confidence_score: confidence,
          status: autoApply ? 'auto_apply_pending' : 'pending',
          auto_apply_after: autoApply
            ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            : null,
        });
        created++;
      }
    }

    return new Response(
      JSON.stringify({ message: 'DoC ingestion complete', created, skipped, extracted: extracted.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders },
    );
  }
});
