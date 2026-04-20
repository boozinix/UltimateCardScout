// Deno edge function — Weekly summary email
// Schedule: Sunday 9pm PT
// Sends admin email via Resend with proposal summary + review link.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'zubair.nizami@yahoo.com';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://cardscout.app';
const FROM = 'CardScout <noreply@cardscout.app>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Email template ──────────────────────────────────────────────────────────

function buildSummaryEmail(stats: {
  pending: number;
  autoApplied: number;
  rejected: number;
  bySource: Record<string, number>;
  topProposals: Array<{ type: string; summary: string; confidence: number }>;
}): { subject: string; html: string } {
  const total = stats.pending;
  const subject = total > 0
    ? `CardScout: ${total} proposal${total === 1 ? '' : 's'} need${total === 1 ? 's' : ''} review`
    : 'CardScout: All clear — no proposals this week';

  const sourceRows = Object.entries(stats.bySource)
    .map(([src, count]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #E2DDD6;">${src}</td><td style="padding:6px 12px;border-bottom:1px solid #E2DDD6;text-align:right;">${count}</td></tr>`)
    .join('');

  const proposalRows = stats.topProposals
    .slice(0, 10)
    .map((p) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #E2DDD6;">${p.type}</td><td style="padding:6px 12px;border-bottom:1px solid #E2DDD6;">${p.summary}</td><td style="padding:6px 12px;border-bottom:1px solid #E2DDD6;text-align:right;">${(p.confidence * 100).toFixed(0)}%</td></tr>`)
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#FAFAF9;padding:32px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #E2DDD6;border-radius:12px;padding:32px;">
    <h1 style="font-size:24px;color:#1C1917;margin:0 0 8px;">Weekly Pipeline Summary</h1>
    <p style="color:#78716C;margin:0 0 24px;">Here's what happened this week in your automation pipeline.</p>

    <div style="display:flex;gap:16px;margin-bottom:24px;">
      <div style="flex:1;background:#DBEAFE;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#1B4FD8;">${stats.pending}</div>
        <div style="font-size:12px;color:#78716C;">Pending Review</div>
      </div>
      <div style="flex:1;background:#DCFCE7;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#166534;">${stats.autoApplied}</div>
        <div style="font-size:12px;color:#78716C;">Auto-Applied</div>
      </div>
      <div style="flex:1;background:#FFF1EE;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#C2410C;">${stats.rejected}</div>
        <div style="font-size:12px;color:#78716C;">Rejected</div>
      </div>
    </div>

    ${sourceRows ? `
    <h2 style="font-size:16px;color:#1C1917;margin:0 0 8px;">By Source</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead><tr><th style="text-align:left;padding:6px 12px;border-bottom:2px solid #E2DDD6;font-size:12px;color:#78716C;">Source</th><th style="text-align:right;padding:6px 12px;border-bottom:2px solid #E2DDD6;font-size:12px;color:#78716C;">Count</th></tr></thead>
      <tbody>${sourceRows}</tbody>
    </table>` : ''}

    ${proposalRows ? `
    <h2 style="font-size:16px;color:#1C1917;margin:0 0 8px;">Pending Proposals</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead><tr><th style="text-align:left;padding:6px 12px;border-bottom:2px solid #E2DDD6;font-size:12px;color:#78716C;">Type</th><th style="text-align:left;padding:6px 12px;border-bottom:2px solid #E2DDD6;font-size:12px;color:#78716C;">Summary</th><th style="text-align:right;padding:6px 12px;border-bottom:2px solid #E2DDD6;font-size:12px;color:#78716C;">Confidence</th></tr></thead>
      <tbody>${proposalRows}</tbody>
    </table>` : ''}

    <a href="${APP_URL}/admin/proposals" style="display:inline-block;background:#1B4FD8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Review Proposals</a>

    <p style="color:#78716C;font-size:12px;margin-top:24px;">CardScout Automation Pipeline — sent weekly on Sundays.</p>
  </div>
</body>
</html>`;

  return { subject, html };
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Count pending proposals
    const { count: pending } = await supabase
      .from('data_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Count auto-applied this week
    const { count: autoApplied } = await supabase
      .from('data_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'auto_applied')
      .gte('applied_at', oneWeekAgo);

    // Count rejected this week
    const { count: rejected } = await supabase
      .from('data_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected')
      .gte('reviewed_at', oneWeekAgo);

    // Get pending proposals by source
    const { data: pendingBySource } = await supabase
      .from('data_proposals')
      .select('source_type')
      .eq('status', 'pending');

    const bySource: Record<string, number> = {};
    for (const row of pendingBySource ?? []) {
      const src = (row as { source_type: string }).source_type;
      bySource[src] = (bySource[src] ?? 0) + 1;
    }

    // Get top pending proposals for preview
    const { data: topPending } = await supabase
      .from('data_proposals')
      .select('proposal_type, proposed_change, confidence_score')
      .eq('status', 'pending')
      .order('confidence_score', { ascending: false })
      .limit(10);

    const topProposals = (topPending ?? []).map((p: any) => ({
      type: p.proposal_type,
      summary: p.proposed_change?.summary ?? p.proposed_change?.card_name ?? 'Data update',
      confidence: p.confidence_score,
    }));

    const { subject, html } = buildSummaryEmail({
      pending: pending ?? 0,
      autoApplied: autoApplied ?? 0,
      rejected: rejected ?? 0,
      bySource,
      topProposals,
    });

    // Send via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: ADMIN_EMAIL, subject, html }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(
      JSON.stringify({
        message: 'Weekly summary sent',
        to: ADMIN_EMAIL,
        pending: pending ?? 0,
        autoApplied: autoApplied ?? 0,
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
