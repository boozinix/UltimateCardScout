/**
 * Ingest cards.csv into Supabase cards table.
 * Run: npm run ingest
 * Idempotent: upserts on (name, issuer). Never drops user data.
 * Application links preserved as raw issuer URLs — no transformation.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const GRADIENT_MAP: Record<string, string> = {
  'amex': 'amexPlatinum',
  'american express': 'amexPlatinum',
  'chase': 'chaseSapphire',
  'capital one': 'capitalVenture',
};

function getGradientKey(issuer: string, cardName: string): string {
  const name = cardName.toLowerCase();
  const iss = issuer.toLowerCase();
  if (name.includes('platinum') || name.includes('gold')) return 'amexPlatinum';
  if (name.includes('sapphire')) return 'chaseSapphire';
  if (name.includes('venture')) return 'capitalVenture';
  if (name.includes('gold')) return 'amexGold';
  return GRADIENT_MAP[iss] ?? 'default';
}

interface CsvRow {
  card_name: string;
  issuer: string;
  card_type: string;
  annual_fee: string;
  reward_model: string;
  rewards_type: string;
  card_family: string;
  signup_bonus: string;
  signup_bonus_type: string;
  estimated_bonus_value_usd: string;
  minimum_spend_amount: string;
  spend_time_frame: string;
  cashback_rate_display: string;
  cashback_rate_effective: string;
  gas_rate: string;
  grocery_rate: string;
  restaurant_rate: string;
  travel_airline_rate: string;
  travel_hotel_rate: string;
  travel_portal_rate: string;
  other_rate: string;
  lounge: string;
  ge_tsa_precheck: string;
  transfer_partners: string;
  foreign_tx_fee: string;
  ftf: string;
  intro_apr_purchase: string;
  best_for: string;
  pros: string;
  cons: string;
  bank_rules: string;
  application_link: string;
  special_feature_1: string;
  special_feature_2: string;
  credit_score_quantity: string;
  credit_score_quality: string;
  [key: string]: string;
}

function parseAnnualFee(raw: string): number {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/[$,]/g, '').trim());
  return isNaN(n) ? 0 : Math.round(n);
}

async function main() {
  const csvPath = path.resolve(__dirname, '../data/cards.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`cards.csv not found at ${csvPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const { data, errors } = Papa.parse<CsvRow>(raw, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    console.warn(`CSV parse warnings: ${errors.length} rows had issues`);
  }

  console.log(`Parsed ${data.length} cards from CSV`);

  const rows = data
    .filter((r) => r.card_name?.trim())
    .map((r) => ({
      name: r.card_name.trim(),
      issuer: r.issuer?.trim() ?? '',
      card_type: r.card_type?.trim() || 'personal',
      annual_fee: parseAnnualFee(r.annual_fee),
      reward_model: r.reward_model?.trim() || null,
      rewards_type: r.rewards_type?.trim() || null,
      card_family: r.card_family?.trim() || null,
      signup_bonus: r.signup_bonus?.trim() || null,
      signup_bonus_type: r.signup_bonus_type?.trim() || null,
      estimated_bonus_value_usd: r.estimated_bonus_value_usd?.trim() || null,
      minimum_spend_amount: r.minimum_spend_amount?.trim() || null,
      spend_time_frame: r.spend_time_frame?.trim() || null,
      cashback_rate_display: r.cashback_rate_display?.trim() || null,
      cashback_rate_effective: r.cashback_rate_effective?.trim() || null,
      gas_rate: r.gas_rate?.trim() || null,
      grocery_rate: r.grocery_rate?.trim() || null,
      restaurant_rate: r.restaurant_rate?.trim() || null,
      travel_airline_rate: r.travel_airline_rate?.trim() || null,
      travel_hotel_rate: r.travel_hotel_rate?.trim() || null,
      travel_portal_rate: r.travel_portal_rate?.trim() || null,
      other_rate: r.other_rate?.trim() || null,
      lounge: r.lounge?.trim() || null,
      ge_tsa_precheck: r.ge_tsa_precheck?.trim() || null,
      transfer_partners: r.transfer_partners?.trim() || null,
      foreign_tx_fee: r.foreign_tx_fee?.trim() || null,
      ftf: r.ftf?.trim() || null,
      intro_apr_purchase: r.intro_apr_purchase?.trim() || null,
      best_for: r.best_for?.trim() || null,
      pros: r.pros?.trim() || null,
      cons: r.cons?.trim() || null,
      bank_rules: r.bank_rules?.trim() || null,
      application_link: r.application_link?.trim() || null,
      special_feature_1: r.special_feature_1?.trim() || null,
      special_feature_2: r.special_feature_2?.trim() || null,
      credit_score_quantity: r.credit_score_quantity?.trim() || null,
      credit_score_quality: r.credit_score_quality?.trim() || null,
      gradient_key: getGradientKey(r.issuer ?? '', r.card_name ?? ''),
      is_active: true,
    }));

  let upserted = 0;
  let failed = 0;
  const BATCH = 50;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('cards')
      .upsert(batch, { onConflict: 'name,issuer', ignoreDuplicates: false });

    if (error) {
      console.error(`Batch ${i / BATCH + 1} failed:`, error.message);
      failed += batch.length;
    } else {
      upserted += batch.length;
    }
  }

  console.log(`Done. Upserted: ${upserted}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
