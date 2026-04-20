import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  DealPassportEntry,
  DealType,
  RewardsCurrency,
} from '@/lib/applicationTypes';
import { CURRENCY_LABELS } from '@/lib/applicationTypes';

const DEALS_KEY = ['deal_passport'] as const;
const STALE_MS = 10 * 60 * 1000; // 10 min

// ============================================================
// Types
// ============================================================

export interface PersonalizedDeal extends DealPassportEntry {
  is_relevant: boolean;
  relevance_reason: string | null;
  user_balance: number | null;
  value_added: number | null;
  days_left: number | null;
}

// ============================================================
// Queries
// ============================================================

/** Fetch all active deals */
export function useDeals() {
  return useQuery({
    queryKey: [...DEALS_KEY],
    queryFn: async (): Promise<DealPassportEntry[]> => {
      try {
        const { data, error } = await supabase
          .from('deal_passport')
          .select('*')
          .eq('active', true)
          .order('expiry_date', { ascending: true });

        if (error) throw error;
        return (data ?? []) as DealPassportEntry[];
      } catch {
        return getFallbackDeals();
      }
    },
    staleTime: STALE_MS,
  });
}

/** Personalize deals against user's holdings */
export function usePersonalizedDeals(
  userCurrencies: Set<string>,
  userBalances: Record<string, number>,
  userCardNames: string[],
) {
  const { data: deals = [] } = useDeals();

  return useQuery({
    queryKey: [...DEALS_KEY, 'personalized', [...userCurrencies].sort().join(',')],
    queryFn: (): PersonalizedDeal[] => {
      const now = new Date();
      return deals.map((deal) => {
        let isRelevant = false;
        let relevanceReason: string | null = null;
        let userBalance: number | null = null;
        let valueAdded: number | null = null;

        // Calculate days left
        let daysLeft: number | null = null;
        if (deal.expiry_date) {
          const expiry = new Date(deal.expiry_date);
          daysLeft = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }

        // Transfer bonus: relevant if user holds the source currency
        if (deal.deal_type === 'transfer_bonus' && deal.program_from) {
          const matchKey = findCurrencyKey(deal.program_from);
          if (matchKey && userCurrencies.has(matchKey)) {
            isRelevant = true;
            userBalance = userBalances[matchKey] ?? 0;
            if (userBalance > 0 && deal.bonus_pct) {
              valueAdded = Math.round(userBalance * (deal.bonus_pct / 100));
            }
            relevanceReason = `You hold ${userBalance?.toLocaleString() ?? 0} ${deal.program_from}`;
          }
        }

        // Elevated signup: relevant if user doesn't already have the card
        if (deal.deal_type === 'elevated_signup') {
          const cardName = deal.title.toLowerCase();
          const alreadyHas = userCardNames.some((n) => cardName.includes(n.toLowerCase()));
          if (!alreadyHas) {
            isRelevant = true;
            relevanceReason = 'You don\'t hold this card';
          }
        }

        // Limited offer / community report: always somewhat relevant
        if (deal.deal_type === 'limited_offer' || deal.deal_type === 'community_report') {
          // Check if related to a currency user holds
          if (deal.program_from || deal.program_to) {
            const key = findCurrencyKey(deal.program_from ?? deal.program_to ?? '');
            if (key && userCurrencies.has(key)) {
              isRelevant = true;
              relevanceReason = 'Related to your wallet';
            }
          }
        }

        return {
          ...deal,
          is_relevant: isRelevant,
          relevance_reason: relevanceReason,
          user_balance: userBalance,
          value_added: valueAdded,
          days_left: daysLeft,
        };
      });
    },
    enabled: deals.length > 0,
    staleTime: STALE_MS,
  });
}

// ============================================================
// Helpers
// ============================================================

/** Find currency key from program name (fuzzy) */
function findCurrencyKey(programName: string): RewardsCurrency | null {
  const lower = programName.toLowerCase();
  for (const [key, label] of Object.entries(CURRENCY_LABELS)) {
    if (lower.includes(label.toLowerCase()) || label.toLowerCase().includes(lower)) {
      return key as RewardsCurrency;
    }
  }
  // Common aliases
  if (lower.includes('ultimate rewards') || lower.includes('ur')) return 'chase_ur';
  if (lower.includes('membership rewards') || lower.includes('mr')) return 'amex_mr';
  if (lower.includes('thankyou') || lower.includes('typ')) return 'citi_typ';
  if (lower.includes('hyatt')) return 'hyatt_points';
  if (lower.includes('marriott') || lower.includes('bonvoy')) return 'marriott_points';
  if (lower.includes('hilton')) return 'hilton_points';
  if (lower.includes('united')) return 'united_miles';
  if (lower.includes('delta') || lower.includes('skymiles')) return 'delta_miles';
  if (lower.includes('southwest')) return 'southwest_points';
  if (lower.includes('alaska')) return 'alaska_miles';
  if (lower.includes('american') || lower.includes('aadvantage')) return 'american_miles';
  return null;
}

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  transfer_bonus: 'Transfer Bonus',
  elevated_signup: 'Elevated Signup',
  limited_offer: 'Limited Offer',
  community_report: 'Community Report',
};

export const DEAL_TYPE_ICONS: Record<DealType, string> = {
  transfer_bonus: 'ArrowRightLeft',
  elevated_signup: 'TrendingUp',
  limited_offer: 'Clock',
  community_report: 'Users',
};

// ============================================================
// Fallback deals (demo data when Supabase unreachable)
// ============================================================

function getFallbackDeals(): DealPassportEntry[] {
  const now = new Date();
  const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return [
    {
      id: 'fb-deal-1',
      deal_type: 'transfer_bonus',
      title: 'Chase UR → World of Hyatt +30%',
      description: 'Transfer Chase Ultimate Rewards to World of Hyatt at a 30% bonus. 10,000 UR → 13,000 Hyatt points.',
      program_from: 'Chase Ultimate Rewards',
      program_to: 'World of Hyatt',
      bonus_pct: 30,
      card_id: null,
      expiry_date: inDays(28),
      source_url: 'https://www.doctorofcredit.com',
      active: true,
      created_at: now.toISOString(),
    },
    {
      id: 'fb-deal-2',
      deal_type: 'elevated_signup',
      title: 'Chase Sapphire Preferred — 80,000 UR',
      description: 'Elevated signup bonus: 80,000 Ultimate Rewards (normally 60,000). $4,000 spend in 3 months.',
      program_from: null,
      program_to: 'Chase Ultimate Rewards',
      bonus_pct: null,
      card_id: null,
      expiry_date: inDays(14),
      source_url: null,
      active: true,
      created_at: now.toISOString(),
    },
    {
      id: 'fb-deal-3',
      deal_type: 'transfer_bonus',
      title: 'Amex MR → Delta SkyMiles +25%',
      description: 'Transfer Amex Membership Rewards to Delta SkyMiles at a 25% bonus.',
      program_from: 'Amex Membership Rewards',
      program_to: 'Delta SkyMiles',
      bonus_pct: 25,
      card_id: null,
      expiry_date: inDays(7),
      source_url: null,
      active: true,
      created_at: now.toISOString(),
    },
    {
      id: 'fb-deal-4',
      deal_type: 'community_report',
      title: 'Amex Platinum retention: 55,000 MR offer',
      description: 'Multiple data points of 55,000 MR retention offer for Amex Platinum cardholders after 1+ year.',
      program_from: 'Amex Membership Rewards',
      program_to: null,
      bonus_pct: null,
      card_id: null,
      expiry_date: null,
      source_url: 'https://reddit.com/r/churning',
      active: true,
      created_at: now.toISOString(),
    },
    {
      id: 'fb-deal-5',
      deal_type: 'limited_offer',
      title: 'Capital One Venture X — 90,000 miles',
      description: 'Limited-time elevated offer: 90,000 Capital One miles. $4,000 spend in 3 months.',
      program_from: null,
      program_to: 'Capital One Miles',
      bonus_pct: null,
      card_id: null,
      expiry_date: inDays(21),
      source_url: null,
      active: true,
      created_at: now.toISOString(),
    },
  ];
}
