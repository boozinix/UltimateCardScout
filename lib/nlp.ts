/**
 * Converts a free-text user prompt into the Answers shape the scoring engine expects.
 * Ported from cc-recommender/app/lib/promptToAnswers.ts
 */
import type { Answers } from './scoring';

export type PromptResult =
  | { ok: true; answers: Answers }
  | { ok: false; error: string };

const GOALS = ['Travel', 'Cashback', 'Bonus', 'Everyday'] as const;

function anyWord(words: string[]): RegExp {
  return new RegExp(`\\b(${words.join('|')})\\b`, 'i');
}

export function promptToAnswers(prompt: string): PromptResult {
  const text = prompt.trim();
  if (!text) {
    return { ok: false, error: "Please enter what kind of card you're looking for." };
  }

  const lower = text.toLowerCase();
  const answers: Answers = getDefaultAnswers();
  let matchedSomething = false;

  const businessWords = ['business', 'biz', 'company', 'work', 'corporate', 'self-employed', 'llc', 'sole prop'];
  if (anyWord(businessWords).test(lower)) {
    answers.card_mode = 'business';
    matchedSomething = true;
  }

  const travelWords = [
    'travel', 'flight', 'flights', 'fly', 'flying', 'airfare', 'airline', 'airlines',
    'hotel', 'hotels', 'trip', 'trips', 'vacation', 'vacations', 'miles', 'points', 'reward', 'rewards',
    'lounge', 'airport', 'abroad', 'international', 'overseas', 'holiday', 'holidays',
    'cruise', 'cruises', 'flight rewards', 'travel rewards', 'travel card', 'frequent flyer',
    'traveling', 'traveler', 'travelling', 'traveller', 'jetset', 'jet set',
  ];
  const cashbackWords = [
    'cashback', 'cash back', 'cash-back', '2%', '3%', '1.5%', 'flat rate', 'percent back',
    'money back', 'rebate', 'cash rewards', 'dining', 'restaurants', 'restaurant', 'food',
    'takeout', 'delivery', 'groceries', 'grocery', 'supermarket', 'costco', 'walmart', 'target',
    'gas', 'fuel', 'transit', 'commuting', 'rideshare', 'uber', 'lyft',
  ];
  const bonusWords = [
    'bonus', 'signup', 'sign up', 'sign-up', 'welcome offer', 'welcome bonus',
    'intro bonus', 'introductory', 'new card bonus', 'sub', 'best bonus', 'big bonus',
    'high bonus', 'statement credit',
  ];
  const everydayWords = [
    'everyday', 'every day', 'daily', 'general', 'simple', 'no category',
    'all-purpose', 'all purpose', 'flexible', 'one card', 'single card', 'unlimited',
    'catch-all', 'general spending', 'daily driver', 'main card',
  ];

  const goalHits: Array<{ goal: typeof GOALS[number]; index: number }> = [];
  const travelMatch = lower.match(anyWord(travelWords));
  if (travelMatch) goalHits.push({ goal: 'Travel', index: travelMatch.index ?? 0 });
  const cashbackMatch = lower.match(anyWord(cashbackWords));
  if (cashbackMatch) goalHits.push({ goal: 'Cashback', index: cashbackMatch.index ?? 0 });
  const bonusMatch = lower.match(anyWord(bonusWords));
  if (bonusMatch) goalHits.push({ goal: 'Bonus', index: bonusMatch.index ?? 0 });
  const everydayMatch = lower.match(anyWord(everydayWords));
  if (everydayMatch) goalHits.push({ goal: 'Everyday', index: everydayMatch.index ?? 0 });

  const rewardsOnly = /(higher|best|max|more|great|good|better)\s*(rewards?|points?|miles?)?/i.test(text) && goalHits.length === 0;
  if (rewardsOnly) {
    answers.primary_goal_ranked = ['Travel', 'Bonus', 'Cashback', 'Everyday'];
    matchedSomething = true;
  } else if (goalHits.length > 0) {
    goalHits.sort((a, b) => a.index - b.index);
    const ordered = goalHits.map((h) => h.goal);
    const rest = GOALS.filter((g) => !ordered.includes(g));
    answers.primary_goal_ranked = [...ordered, ...rest];
    matchedSomething = true;
  }

  const noFeePhrases = [
    /no\s+annual\s+fee/, /\$0\s+annual\s+fee/, /0\s+annual\s+fee/,
    /no\s+fee\b/, /zero\s+fee/, /free\s+card/, /\bno\s+af\b/, /waived/,
  ];
  const lowFeeWords = ['cheap', 'budget', 'low cost', 'minimal fee', 'affordable', 'low fee'];
  const highFeeWords = ['premium', 'luxury', 'lounge', "don't care", "doesn't matter", 'high fee', 'ok with fee', 'fine with fee', 'any fee', 'worth the fee'];
  const midFeeWords = ['mid', 'medium', 'moderate', 'reasonable fee'];

  let feeSetByPhrase = false;
  let spendSetByPhrase = false;

  if (noFeePhrases.some((p) => p.test(lower)) || lower.includes('zero fee') || lower.includes('free annual')) {
    answers.annual_fee_tolerance = 'None';
    matchedSomething = true;
    feeSetByPhrase = true;
  } else if (anyWord(lowFeeWords).test(lower) || /\bunder\s*\$?\s*100\b/.test(lower) || lower.includes('low fee') || lower.includes('cheap card')) {
    answers.annual_fee_tolerance = 'Low';
    matchedSomething = true;
    feeSetByPhrase = true;
  } else if (anyWord(highFeeWords).test(lower)) {
    answers.annual_fee_tolerance = 'High';
    matchedSomething = true;
    feeSetByPhrase = true;
  } else if (anyWord(midFeeWords).test(lower)) {
    answers.annual_fee_tolerance = 'Medium';
    matchedSomething = true;
    feeSetByPhrase = true;
  } else if (goalHits.some((h) => h.goal === 'Travel') || rewardsOnly) {
    answers.annual_fee_tolerance = 'Medium';
  }

  const highSpendPat = /\b(high spend|5k|5000|above 5|5,?000|large spend|big spend)\b/;
  const medSpendPat = /\b(1k|1000|2k|2000|3k|3000|4k|4000|1,?000|2,?000|3,?000|4,?000)\b/;
  if (/\b(bonus|signup|welcome)\b/.test(lower) && !/\b(don't|do not|no bonus|skip bonus)\b/.test(lower)) {
    if (highSpendPat.test(lower)) {
      answers.spend_comfort = 'High';
    } else if (medSpendPat.test(lower)) {
      answers.spend_comfort = 'Medium';
    } else {
      answers.spend_comfort = 'Medium';
    }
    matchedSomething = true;
    spendSetByPhrase = true;
  }

  const airlineMap: Array<{ keys: string[]; value: string }> = [
    { keys: ['united', 'ua', 'mileageplus'], value: 'United' },
    { keys: ['american', 'aa', 'aadvantage', 'american airlines'], value: 'American' },
    { keys: ['delta', 'skymiles', 'sky miles'], value: 'Delta' },
    { keys: ['southwest', 'rapid rewards', 'wn', 'swa'], value: 'Southwest' },
    { keys: ['jetblue', 'jet blue', 'trueblue', 'true blue'], value: 'JetBlue' },
    { keys: ['alaska', 'alaska airlines', 'mileage plan'], value: 'Alaska' },
    { keys: ['frontier', 'flyfrontier'], value: 'Frontier' },
    { keys: ['spirit', 'spirit airlines', 'free spirit'], value: 'Spirit' },
    { keys: ['breeze', 'breeze airways', 'breezepoints'], value: 'Breeze' },
  ];
  for (const { keys, value } of airlineMap) {
    if (keys.some((k) => lower.includes(k))) {
      answers.travel_rewards_type = 'Airline';
      answers.preferred_airline = value;
      matchedSomething = true;
      break;
    }
  }

  const hotelMap: Array<{ keys: string[]; value: string }> = [
    { keys: ['marriott', 'bonvoy', 'ritz', 'sheraton', 'westin', 'w hotel', 'st regis'], value: 'Marriott' },
    { keys: ['hilton', 'honors', 'hampton', 'doubletree', 'waldorf'], value: 'Hilton' },
    { keys: ['hyatt', 'world of hyatt', 'hyatt place', 'hyatt house'], value: 'Hyatt' },
    { keys: ['ihg', 'holiday inn', 'intercontinental', 'crowne plaza', 'kimpton'], value: 'IHG' },
    { keys: ['wyndham', 'wyndham rewards'], value: 'Wyndham' },
    { keys: ['choice', 'choice hotels', 'comfort inn', 'quality inn', 'cambria'], value: 'Choice' },
    { keys: ['expedia', 'one key', 'onekey', 'hotels.com', 'vrbo'], value: 'Expedia' },
  ];
  for (const { keys, value } of hotelMap) {
    if (keys.some((k) => lower.includes(k))) {
      answers.travel_rewards_type = 'Hotel';
      answers.preferred_hotel = value;
      matchedSomething = true;
      break;
    }
  }

  if (!answers.preferred_airline && /airline\s*miles|airline\s*points|airline\s+rewards/.test(lower)) {
    answers.travel_rewards_type = 'Airline';
    matchedSomething = true;
  }
  if (!answers.preferred_hotel && /\bhotel\s*(points|cards?|rewards?)?\b|\bhotel\s+points\b/.test(lower)) {
    answers.travel_rewards_type = 'Hotel';
    matchedSomething = true;
  }

  if (/\b(premium|luxury|lounge|first class|business class|priority pass)\b/.test(lower)) {
    answers.travel_tier_preference = 'Premium';
    matchedSomething = true;
  } else if (/\b(mid-tier|mid tier|affordable travel|cheap travel|economy|basic travel)\b/.test(lower)) {
    answers.travel_tier_preference = 'Mid-tier';
    matchedSomething = true;
  } else if (Array.isArray(answers.primary_goal_ranked) && (answers.primary_goal_ranked as string[])[0] === 'Travel') {
    answers.travel_tier_preference = 'No preference';
  }

  if (/\b(frequent|weekly|often|a lot|heavy|regular)\b/.test(lower) && goalHits.some((h) => h.goal === 'Travel')) {
    answers.travel_frequency = 'High';
  } else if (/\b(occasional|sometimes|few times|rarely|once in a while)\b/.test(lower)) {
    answers.travel_frequency = 'Low';
  }

  if (/\bno\s+foreign\s+transaction\s+fee\b/.test(lower) ||
      /\bno\s+foreign\s+fee\b/.test(lower) ||
      /\bno\s+fx\b/.test(lower) ||
      /\bforeign\s+transaction\s+fee\b/.test(lower) ||
      /\boverseas\s+spending\b/.test(lower)) {
    answers.needs_no_foreign_fee = 'Yes';
    matchedSomething = true;
  }

  if (/\b(0%|zero)\s*apr\b/.test(lower) ||
      /\bintro(ductory)?\s*apr\b/.test(lower) ||
      /\bbalance\s*transfer\b/.test(lower) ||
      /\bcarry\s*(a\s*)?balance\b/.test(lower) ||
      /\bno\s*interest\b/.test(lower) ||
      /\bdebt\b/.test(lower)) {
    answers.needs_0_apr = 'Yes';
    matchedSomething = true;
  }

  const primary = Array.isArray(answers.primary_goal_ranked) ? (answers.primary_goal_ranked as string[])[0] : undefined;
  if (primary === 'Cashback') {
    if (!feeSetByPhrase) answers.annual_fee_tolerance = 'None';
    if (!spendSetByPhrase) answers.spend_comfort = 'None';
  } else if (primary === 'Travel') {
    if (!feeSetByPhrase) answers.annual_fee_tolerance = 'Medium';
    if (!spendSetByPhrase) answers.spend_comfort = 'Medium';
  } else if (primary === 'Bonus') {
    if (!feeSetByPhrase) answers.annual_fee_tolerance = 'Medium';
    if (!spendSetByPhrase) answers.spend_comfort = 'High';
  } else if (primary === 'Everyday') {
    if (!feeSetByPhrase) answers.annual_fee_tolerance = 'None';
    if (!spendSetByPhrase) answers.spend_comfort = 'Low';
  }

  if (!matchedSomething) {
    return {
      ok: false,
      error: "We couldn't understand that. Try describing what you want (e.g. travel rewards, cashback, no annual fee) or use the quiz below.",
    };
  }

  return { ok: true, answers };
}

function getDefaultAnswers(): Answers {
  return {
    card_mode: 'personal',
    primary_goal_ranked: ['Travel', 'Cashback', 'Bonus', 'Everyday'],
    annual_fee_tolerance: 'Medium',
    spend_comfort: 'Medium',
  };
}
