// Deno edge function — send transactional emails via Resend
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = 'CardScout <noreply@cardscout.app>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type EmailType = 'welcome' | 'trial_expiring' | 'renewal_failed';

function buildEmail(type: EmailType, data: Record<string, string>): { subject: string; html: string } {
  switch (type) {
    case 'welcome':
      return {
        subject: 'Welcome to CardScout — your 14-day trial has started',
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1C1917">
            <h1 style="font-size:28px;letter-spacing:-0.5px">Welcome to CardScout Pro.</h1>
            <p style="font-size:15px;line-height:1.6;color:#78716C">
              Your 14-day free trial has started. You now have access to unlimited card tracking,
              benefit reminders, and the Insights dashboard.
            </p>
            <p style="font-size:15px;line-height:1.6;color:#78716C">
              Your trial ends on <strong style="color:#1C1917">${data.trialEnd}</strong>.
            </p>
            <a href="https://cardscout.app" style="display:inline-block;margin-top:24px;background:#1C1917;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-family:system-ui,sans-serif;font-size:13px;letter-spacing:0.5px">
              OPEN CARDSCOUT
            </a>
            <p style="font-size:12px;color:#78716C;margin-top:32px">
              Questions? Reply to this email — we read every one.
            </p>
          </div>
        `,
      };
    case 'trial_expiring':
      return {
        subject: 'Your CardScout Pro trial ends in 3 days',
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1C1917">
            <h1 style="font-size:24px;letter-spacing:-0.3px">Your trial ends in 3 days.</h1>
            <p style="font-size:15px;line-height:1.6;color:#78716C">
              To keep your unlimited card tracking, benefit reminders, and Insights dashboard,
              subscribe before <strong style="color:#1C1917">${data.trialEnd}</strong>.
            </p>
            <a href="${data.checkoutUrl}" style="display:inline-block;margin-top:24px;background:#1C1917;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-family:system-ui,sans-serif;font-size:13px;letter-spacing:0.5px">
              KEEP PRO — $6.99/MO
            </a>
          </div>
        `,
      };
    case 'renewal_failed':
      return {
        subject: 'CardScout: payment failed — update your card',
        html: `
          <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1C1917">
            <h1 style="font-size:24px;letter-spacing:-0.3px">Payment failed.</h1>
            <p style="font-size:15px;line-height:1.6;color:#78716C">
              We couldn't process your CardScout Pro renewal. Please update your payment method
              to keep access to your wallet and reminders.
            </p>
            <a href="${data.portalUrl}" style="display:inline-block;margin-top:24px;background:#C2410C;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-family:system-ui,sans-serif;font-size:13px;letter-spacing:0.5px">
              UPDATE PAYMENT METHOD
            </a>
          </div>
        `,
      };
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { type, userId, data } = await req.json() as {
      type: EmailType;
      userId: string;
      data: Record<string, string>;
    };

    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const email = userData.user?.email;
    if (!email) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });

    const { subject, html } = buildEmail(type, data ?? {});
    await sendEmail(email, subject, html);

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
