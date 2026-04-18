/**
 * 0/1 knapsack to maximize signup bonuses given a spend budget.
 * Ported from cc-recommender/app/lib/spendAllocation.ts
 */

export interface CardForAllocation {
  card_name: string;
  minimum_spend_amount?: string;
  estimated_bonus_value_usd?: string;
  annual_fee?: string;
  issuer?: string;
  [key: string]: unknown;
}

function parseMinSpend(raw: string | undefined): number {
  if (!raw || !raw.trim()) return 0;
  const n = parseInt(raw.replace(/[$,]/g, '').trim(), 10);
  return Number.isNaN(n) ? 0 : n;
}

function parseBonus(raw: string | undefined): number {
  if (!raw || !raw.trim()) return 0;
  const n = parseInt(raw.replace(/[$,]/g, '').trim(), 10);
  return Number.isNaN(n) ? 0 : n;
}

function parseAnnualFee(raw: string | undefined): number {
  if (!raw || !raw.trim()) return 0;
  const n = parseInt(raw.replace(/[$,]/g, '').trim(), 10);
  return Number.isNaN(n) ? 0 : n;
}

export type OptimizationMode = 'gross' | 'net';

export interface AllocationItem {
  card: CardForAllocation;
  minSpend: number;
  bonus: number;
}

export interface OptimalPlan {
  chosenCards: CardForAllocation[];
  totalBonus: number;
  allocation: AllocationItem[];
  totalSpendUsed: number;
}

const MAX_CARDS_PER_BANK = 2;

function getBank(card: CardForAllocation): string {
  return String(card.issuer ?? '').trim().toLowerCase();
}

function buildItems(
  cards: CardForAllocation[],
  mode: OptimizationMode = 'gross',
): { weight: number; value: number; index: number; bank: string }[] {
  const items: { weight: number; value: number; index: number; bank: string }[] = [];
  cards.forEach((card, index) => {
    const weight = parseMinSpend(card.minimum_spend_amount);
    const bonus = parseBonus(card.estimated_bonus_value_usd);
    const fee = parseAnnualFee(card.annual_fee);
    const value = mode === 'net' ? Math.max(0, bonus - fee) : bonus;
    if (weight > 0 && value > 0) items.push({ weight, value, index, bank: getBank(card) });
  });
  return items;
}

function knapsackMaxValue(
  items: { weight: number; value: number; index: number; bank: string }[],
  capacity: number,
  maxItems: number,
): { totalValue: number; chosenIndices: number[] } {
  const maxK = Math.min(maxItems, items.length);
  if (maxK <= 0 || capacity <= 0) return { totalValue: 0, chosenIndices: [] };

  function makeGrid(): number[][] {
    const grid: number[][] = [];
    for (let w = 0; w <= capacity; w++) grid[w] = Array(maxK + 1).fill(0);
    return grid;
  }
  function makePathGrid(): number[][][] {
    const grid: number[][][] = [];
    for (let w = 0; w <= capacity; w++) {
      grid[w] = [];
      for (let k = 0; k <= maxK; k++) grid[w][k] = [];
    }
    return grid;
  }

  function countSameBankInPath(pathIndices: number[], itemBank: string): number {
    return pathIndices.filter((idx) => {
      const it = items.find((x) => x.index === idx);
      return it?.bank === itemBank;
    }).length;
  }

  let dp = makeGrid();
  let path = makePathGrid();

  for (let i = 0; i < items.length; i++) {
    const { weight, value, index: cardIndex, bank } = items[i];
    const nextDp = makeGrid();
    const nextPath = makePathGrid();
    for (let w = 0; w <= capacity; w++) {
      for (let k = 0; k <= maxK; k++) {
        nextDp[w][k] = dp[w][k];
        nextPath[w][k] = path[w][k].slice();
        if (w >= weight && k >= 1) {
          const prevPath = path[w - weight][k - 1];
          if (countSameBankInPath(prevPath, bank) >= MAX_CARDS_PER_BANK) continue;
          const prevVal = dp[w - weight][k - 1];
          const candidate = prevVal + value;
          if (candidate > nextDp[w][k]) {
            nextDp[w][k] = candidate;
            nextPath[w][k] = [...prevPath, cardIndex];
          }
        }
      }
    }
    dp = nextDp;
    path = nextPath;
  }

  const chosenIndices = path[capacity][maxK].slice(0, maxItems);
  const totalValue = chosenIndices.reduce((sum, idx) => sum + (items.find((it) => it.index === idx)?.value ?? 0), 0);
  return { totalValue, chosenIndices };
}

function dedupeCardsByName(cards: CardForAllocation[]): CardForAllocation[] {
  const byName = new Map<string, CardForAllocation>();
  for (const card of cards) {
    const name = (card.card_name || '').trim();
    if (!name) continue;
    const existing = byName.get(name);
    const bonus = parseBonus(card.estimated_bonus_value_usd);
    const existingBonus = existing ? parseBonus(existing.estimated_bonus_value_usd) : 0;
    if (!existing || bonus > existingBonus) byName.set(name, card);
  }
  return Array.from(byName.values());
}

export function computeOptimalPlan(
  cards: CardForAllocation[],
  budgetDollars: number,
  maxCards: number,
  mode: OptimizationMode = 'gross',
): OptimalPlan {
  const capacity = Math.floor(Math.max(0, budgetDollars));
  const maxItems = Math.max(1, Math.min(maxCards, 20));

  const deduped = dedupeCardsByName(cards);
  const items = buildItems(deduped, mode);
  const { chosenIndices } = knapsackMaxValue(items, capacity, maxItems);

  const chosenCards: CardForAllocation[] = [];
  const allocation: AllocationItem[] = [];
  let totalSpendUsed = 0;
  const seenCardName = new Set<string>();

  chosenIndices.forEach((index) => {
    const card = deduped[index];
    const name = (card.card_name || '').trim();
    if (seenCardName.has(name)) return;
    seenCardName.add(name);
    const minSpend = parseMinSpend(card.minimum_spend_amount);
    const bonus = parseBonus(card.estimated_bonus_value_usd);
    chosenCards.push(card);
    allocation.push({ card, minSpend, bonus });
    totalSpendUsed += minSpend;
  });

  const actualBonus = allocation.reduce((sum, a) => sum + a.bonus, 0);

  return { chosenCards, totalBonus: actualBonus, allocation, totalSpendUsed };
}
