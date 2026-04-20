// Deno edge function — Auto-apply cron
// Schedule: Hourly
// Queries data_proposals WHERE status = 'auto_apply_pending' AND auto_apply_after < now()
// Applies proposed changes to target table, updates status.
// NEVER auto-applies retention data regardless of confidence.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Fetch eligible proposals
    const { data: proposals, error: fetchErr } = await supabase
      .from('data_proposals')
      .select('*')
      .eq('status', 'auto_apply_pending')
      .lt('auto_apply_after', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (fetchErr) throw fetchErr;
    if (!proposals || proposals.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No proposals to auto-apply', applied: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let applied = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const proposal of proposals) {
      // HARD RULE: Never auto-apply retention data
      if (proposal.proposal_type === 'retention_datapoint') {
        // Downgrade to pending for manual review
        await supabase
          .from('data_proposals')
          .update({ status: 'pending' })
          .eq('id', proposal.id);
        skipped++;
        continue;
      }

      try {
        // Apply change to target table
        if (proposal.target_table && proposal.target_row_id && proposal.proposed_change) {
          const { error: updateErr } = await supabase
            .from(proposal.target_table)
            .update(proposal.proposed_change)
            .eq('id', proposal.target_row_id);

          if (updateErr) {
            errors.push(`Proposal ${proposal.id}: ${updateErr.message}`);
            continue;
          }
        } else if (proposal.target_table && !proposal.target_row_id) {
          // New row insertion
          const { error: insertErr } = await supabase
            .from(proposal.target_table)
            .insert(proposal.proposed_change);

          if (insertErr) {
            errors.push(`Proposal ${proposal.id}: ${insertErr.message}`);
            continue;
          }
        }

        // Mark as auto-applied
        await supabase
          .from('data_proposals')
          .update({
            status: 'auto_applied',
            applied_at: new Date().toISOString(),
          })
          .eq('id', proposal.id);

        applied++;
      } catch (err) {
        errors.push(`Proposal ${proposal.id}: ${String(err)}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Auto-apply complete',
        applied,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
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
