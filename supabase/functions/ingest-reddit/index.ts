// Deno edge function — Reddit scraper
// Schedule: Daily 7am PT
// Sources: r/CreditCards (flair: Data Point/News, >20 upvotes)
//          r/churning (flair: Data Point/Discussion, >15 upvotes)
// GPT-4o-mini classifies and extracts. Confidence default 0.65 (always manual review).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const USER_AGENT = 'CardScout/1.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Subreddit configs ───────────────────────────────────────────────────────

interface SubredditConfig {
  name: string;
  flairs: string[];
  minUpvotes: number;
}

const SUBREDDITS: SubredditConfig[] = [
  { name: 'CreditCards', flairs: ['Data Point', 'News'], minUpvotes: 20 },
  { name: 'churning', flairs: ['Data Point', 'Discussion'], minUpvotes: 15 },
];

// ── Types ───────────────────────────────────────────────────────────────────

type PostCategory =
  | 'transfer_bonus'
  | 'elevated_signup'
  | 'rule_change'
  | 'new_card'
  | 'retention_datapoint'
  | 'irrelevant';

interface ClassifiedPost {
  is_relevant: boolean;
  category: PostCategory;
  card_name: string | null;
  issuer: string | null;
  summary: string;
  structured_data: Record<string, unknown>;
}

// ── GPT classification ──────────────────────────────────────────────────────

async function classifyPost(
  title: string,
  body: string,
  url: string,
): Promise<ClassifiedPost> {
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
          content: `You classify Reddit posts about credit cards. Return JSON:
{
  "is_relevant": boolean,
  "category": "transfer_bonus" | "elevated_signup" | "rule_change" | "new_card" | "retention_datapoint" | "irrelevant",
  "card_name": string or null,
  "issuer": string or null (chase/amex/citi/capital_one/bank_of_america/us_bank/barclays/wells_fargo/discover/other),
  "summary": string (one-sentence summary),
  "structured_data": { any extracted data like bonus amounts, transfer rates, retention offers, etc. }
}
Only mark is_relevant=true if the post reports actionable credit card data: a new/changed offer, transfer bonus, rule change, retention data point, or new card launch. General questions, memes, or vague discussion are irrelevant.`,
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nBody: ${(body ?? '').slice(0, 3000)}\n\nURL: ${url}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? '{"is_relevant":false,"category":"irrelevant","card_name":null,"issuer":null,"summary":"","structured_data":{}}';
  return JSON.parse(content);
}

// ── Map category to proposal_type ───────────────────────────────────────────

function mapCategoryToProposalType(category: PostCategory): string {
  switch (category) {
    case 'transfer_bonus': return 'new_deal';
    case 'elevated_signup': return 'bonus_change';
    case 'rule_change': return 'update_card';
    case 'new_card': return 'new_card';
    case 'retention_datapoint': return 'retention_datapoint';
    default: return 'update_card';
  }
}

// ── Fetch subreddit posts ───────────────────────────────────────────────────

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  permalink: string;
  link_flair_text: string | null;
  ups: number;
  created_utc: number;
}

async function fetchSubreddit(config: SubredditConfig): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${config.name}/new.json?limit=100`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  if (!res.ok) {
    console.error(`Reddit fetch failed for r/${config.name}: ${res.status}`);
    return [];
  }

  const json = await res.json();
  const sevenDaysAgo = Date.now() / 1000 - 7 * 24 * 60 * 60;

  return (json.data?.children ?? [])
    .map((c: any) => c.data as RedditPost)
    .filter(
      (p: RedditPost) =>
        config.flairs.includes(p.link_flair_text ?? '') &&
        p.ups >= config.minUpvotes &&
        p.created_utc > sevenDaysAgo,
    );
}

// ── Main handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const config of SUBREDDITS) {
      const posts = await fetchSubreddit(config);

      for (const post of posts) {
        const fp = `reddit-${post.id}`;

        // Dedupe check
        const { data: existing } = await supabase
          .from('data_proposals')
          .select('id')
          .eq('source_fingerprint', fp)
          .limit(1);

        if (existing && existing.length > 0) {
          totalSkipped++;
          continue;
        }

        const classified = await classifyPost(
          post.title,
          post.selftext,
          `https://reddit.com${post.permalink}`,
        );

        if (!classified.is_relevant) {
          totalSkipped++;
          continue;
        }

        const proposalType = mapCategoryToProposalType(classified.category);

        await supabase.from('data_proposals').insert({
          source_type: 'reddit_scraper',
          source_url: `https://reddit.com${post.permalink}`,
          source_fingerprint: fp,
          proposal_type: proposalType,
          target_table: classified.category === 'new_deal' || classified.category === 'transfer_bonus'
            ? 'deal_passport'
            : 'cards',
          proposed_change: {
            ...classified.structured_data,
            card_name: classified.card_name,
            issuer: classified.issuer,
            summary: classified.summary,
            reddit_post_id: post.id,
            reddit_ups: post.ups,
            subreddit: config.name,
          },
          confidence_score: 0.65, // Reddit is signal, not source of truth — always manual review
          status: 'pending',
        });
        totalCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Reddit ingestion complete',
        created: totalCreated,
        skipped: totalSkipped,
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
