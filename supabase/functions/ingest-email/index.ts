// Deno edge function — Email forwarding ingest
// Webhook receiver for SendGrid Inbound Parse.
// Resolves user from alias, whitelists issuer domains,
// GPT-4o-mini classifies email type, creates data_proposals scoped to user.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Rate limiting (in-memory, resets on function cold start) ────────────────

const rateLimits = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 20; // per alias per hour
const WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(alias: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(alias);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimits.set(alias, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Whitelisted issuer domains ──────────────────────────────────────────────

const ISSUER_DOMAINS = [
  'chase.com',
  'notifications.chase.com',
  'americanexpress.com',
  'email.americanexpress.com',
  'citi.com',
  'citicards.com',
  'capitalone.com',
  'email.capitalone.com',
  'discover.com',
  'discovercard.com',
  'bankofamerica.com',
  'ealerts.bankofamerica.com',
  'usbank.com',
  'barclays.com',
  'bfrb.email.barclays.com',
  'wellsfargo.com',
  'bfrb.email.wellsfargo.com',
];

function isWhitelistedDomain(fromEmail: string): boolean {
  const domain = fromEmail.split('@')[1]?.toLowerCase() ?? '';
  return ISSUER_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
}

// ── GPT classification ──────────────────────────────────────────────────────

type EmailCategory =
  | 'application_approved'
  | 'application_denied'
  | 'bonus_achieved'
  | 'fee_reminder'
  | 'retention_offer'
  | 'balance_update'
  | 'statement'
  | 'other';

interface ClassifiedEmail {
  category: EmailCategory;
  confidence: number;
  card_name: string | null;
  issuer: string | null;
  structured_data: Record<string, unknown>;
  summary: string;
}

async function classifyEmail(
  from: string,
  subject: string,
  body: string,
): Promise<ClassifiedEmail> {
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
          content: `You classify credit card emails from issuers. Return JSON:
{
  "category": "application_approved" | "application_denied" | "bonus_achieved" | "fee_reminder" | "retention_offer" | "balance_update" | "statement" | "other",
  "confidence": number (0.0 to 1.0),
  "card_name": string or null (the specific card product name),
  "issuer": string or null (chase/amex/citi/capital_one/bank_of_america/us_bank/barclays/wells_fargo/discover/other),
  "structured_data": { any extracted data: credit_limit, bonus_amount, fee_amount, balance, statement_date, etc. },
  "summary": string (one-sentence summary of the email content)
}
Only extract data that is clearly stated. Do not infer or guess. For "other" or marketing emails, set confidence to 0.3 or below.`,
        },
        {
          role: 'user',
          content: `From: ${from}\nSubject: ${subject}\n\nBody:\n${body.slice(0, 5000)}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ??
    '{"category":"other","confidence":0,"card_name":null,"issuer":null,"structured_data":{},"summary":""}';
  return JSON.parse(content);
}

// ── Map category to proposal_type ───────────────────────────────────────────

function mapCategoryToProposalType(category: EmailCategory): string {
  switch (category) {
    case 'application_approved': return 'application_update';
    case 'application_denied': return 'application_update';
    case 'bonus_achieved': return 'bonus_update';
    case 'fee_reminder': return 'fee_reminder';
    case 'retention_offer': return 'retention_datapoint';
    case 'balance_update': return 'balance_update';
    case 'statement': return 'statement_update';
    default: return 'other';
  }
}

// ── Strip HTML from email body ──────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // SendGrid Inbound Parse sends multipart/form-data
    const formData = await req.formData();
    const to = formData.get('to') as string ?? '';
    const from = formData.get('from') as string ?? '';
    const subject = formData.get('subject') as string ?? '';
    const htmlBody = formData.get('html') as string ?? '';
    const textBody = formData.get('text') as string ?? '';

    // Extract alias from "to" field — format: "u_abc123@in.cardscout.app"
    const aliasMatch = to.match(/(u_[a-f0-9]{8})@/i);
    if (!aliasMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid recipient alias' }),
        { status: 400, headers: corsHeaders },
      );
    }
    const alias = aliasMatch[1];

    // Rate limit check
    if (!checkRateLimit(alias)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: corsHeaders },
      );
    }

    // Resolve user from alias
    const { data: aliasRow, error: aliasErr } = await supabase
      .from('user_email_aliases')
      .select('user_id')
      .eq('alias', alias)
      .single();

    if (aliasErr || !aliasRow) {
      return new Response(
        JSON.stringify({ error: 'Unknown alias' }),
        { status: 404, headers: corsHeaders },
      );
    }

    // Extract sender email address from "Name <email>" format
    const senderMatch = from.match(/<([^>]+)>/) ?? [null, from];
    const senderEmail = (senderMatch[1] ?? from).trim();

    // Whitelist check
    if (!isWhitelistedDomain(senderEmail)) {
      return new Response(
        JSON.stringify({ error: 'Sender domain not whitelisted', from: senderEmail }),
        { status: 403, headers: corsHeaders },
      );
    }

    // Parse body — prefer text, fall back to stripped HTML
    const body = textBody || stripHtml(htmlBody);
    if (!body || body.length < 20) {
      return new Response(
        JSON.stringify({ error: 'Email body too short or empty' }),
        { status: 422, headers: corsHeaders },
      );
    }

    // Classify via GPT-4o-mini
    const classified = await classifyEmail(senderEmail, subject, body);

    // Drop low-confidence or "other" silently
    if (classified.category === 'other' || classified.confidence < 0.4) {
      return new Response(
        JSON.stringify({ message: 'Dropped — low confidence or irrelevant', category: classified.category }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create proposal scoped to user
    const proposalType = mapCategoryToProposalType(classified.category);
    const isHighConfidence = classified.confidence > 0.85;

    // Retention data proposals NEVER auto-apply
    const isRetention = classified.category === 'retention_offer';
    const autoApply = isHighConfidence && !isRetention;

    const fp = `email-${alias}-${Date.now()}`;

    await supabase.from('data_proposals').insert({
      source_type: 'email_forward',
      source_url: null,
      source_fingerprint: fp,
      proposal_type: proposalType,
      target_table: proposalType === 'application_update' ? 'applications' : null,
      proposed_change: {
        ...classified.structured_data,
        card_name: classified.card_name,
        issuer: classified.issuer,
        summary: classified.summary,
        email_subject: subject,
        email_from: senderEmail,
        user_id: aliasRow.user_id,
      },
      confidence_score: classified.confidence,
      status: autoApply ? 'auto_apply_pending' : 'pending',
      auto_apply_after: autoApply
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null,
    });

    return new Response(
      JSON.stringify({
        message: 'Email processed',
        category: classified.category,
        confidence: classified.confidence,
        auto_apply: autoApply,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders },
    );
  }
});
