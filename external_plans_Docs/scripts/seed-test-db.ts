import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedTestDatabase() {
  console.log('🌱 Seeding test database...');

  // ── Clean existing test data ──────────────────────────
  await supabase.from('retention_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('card_applications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('points_balances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('user_benefits').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('user_cards').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // ── Test Users ────────────────────────────────────────
  // These users must be pre-created in Supabase test project auth
  const TEST_USER_FREE    = process.env.TEST_USER_FREE_ID!;
  const TEST_USER_PRO     = process.env.TEST_USER_PRO_ID!;
  const TEST_USER_NEW     = process.env.TEST_USER_NEW_ID!;

  // ── Cards (use known IDs from your seeded catalog) ───
  const AMEX_PLATINUM_ID  = process.env.CARD_AMEX_PLATINUM_ID!;
  const CSR_ID            = process.env.CARD_CSR_ID!;
  const CSP_ID            = process.env.CARD_CSP_ID!;
  const AMEX_GOLD_ID      = process.env.CARD_AMEX_GOLD_ID!;
  const INK_PREFERRED_ID  = process.env.CARD_INK_PREFERRED_ID!;
  const FREEDOM_FLEX_ID   = process.env.CARD_FREEDOM_FLEX_ID!;

  // ── Pro user wallet ───────────────────────────────────
  await supabase.from('user_cards').insert([
    {
      user_id: TEST_USER_PRO,
      card_id: AMEX_PLATINUM_ID,
      last_four: '1234',
      opened_date: '2023-01-15',
    },
    {
      user_id: TEST_USER_PRO,
      card_id: CSR_ID,
      last_four: '5678',
      opened_date: '2022-03-10',
    },
    {
      user_id: TEST_USER_PRO,
      card_id: AMEX_GOLD_ID,
      last_four: '9012',
      opened_date: '2024-06-01',
    },
  ]);

  // ── Pro user applications (known 5/24 scenario) ──────
  // Result: 3 personal cards in last 24 months = 3/5
  await supabase.from('card_applications').insert([
    {
      user_id: TEST_USER_PRO,
      card_id: AMEX_PLATINUM_ID,
      issuer: 'American Express',
      card_type: 'personal',
      applied_date: '2023-01-14',
      status: 'approved',
      approved_date: '2023-01-15',
      signup_bonus_amount: 150000,
      signup_bonus_type: 'points',
      spend_requirement: 6000,
      spend_deadline: '2023-07-15',
      spend_achieved: true,
      spend_current: 6000,
      annual_fee: 695,
      annual_fee_due_date: '2026-01-15',
      year_one_waived: false,
      bonus_lifetime_burned: true,
      last_bonus_received: '2023-04-01',
    },
    {
      user_id: TEST_USER_PRO,
      card_id: CSR_ID,
      issuer: 'Chase',
      card_type: 'personal',
      applied_date: '2024-03-10',
      status: 'approved',
      approved_date: '2024-03-10',
      signup_bonus_amount: 60000,
      signup_bonus_type: 'points',
      spend_requirement: 4000,
      spend_deadline: '2024-09-10',
      spend_achieved: true,
      spend_current: 4000,
      annual_fee: 550,
      annual_fee_due_date: '2026-03-10',
      year_one_waived: false,
      last_bonus_received: '2024-06-15',
    },
    {
      user_id: TEST_USER_PRO,
      card_id: AMEX_GOLD_ID,
      issuer: 'American Express',
      card_type: 'personal',
      applied_date: '2024-06-01',
      status: 'approved',
      approved_date: '2024-06-01',
      signup_bonus_amount: 90000,
      signup_bonus_type: 'points',
      spend_requirement: 4000,
      spend_deadline: '2024-12-01',
      spend_achieved: false,
      spend_current: 2800,
      annual_fee: 250,
      annual_fee_due_date: '2025-06-01',
      year_one_waived: false,
    },
    // Business card — should NOT count toward 5/24
    {
      user_id: TEST_USER_PRO,
      card_id: INK_PREFERRED_ID,
      issuer: 'Chase',
      card_type: 'business',
      applied_date: '2024-09-15',
      status: 'approved',
      approved_date: '2024-09-15',
      signup_bonus_amount: 100000,
      signup_bonus_type: 'points',
      spend_requirement: 8000,
      spend_deadline: '2025-03-15',
      spend_achieved: true,
      spend_current: 8000,
      annual_fee: 95,
      annual_fee_due_date: '2025-09-15',
      year_one_waived: false,
    },
    // Old card — outside 24 months, should NOT count toward 5/24
    {
      user_id: TEST_USER_PRO,
      card_id: FREEDOM_FLEX_ID,
      issuer: 'Chase',
      card_type: 'personal',
      applied_date: '2022-01-10',
      status: 'approved',
      approved_date: '2022-01-10',
      signup_bonus_amount: 20000,
      signup_bonus_type: 'points',
      spend_requirement: 500,
      spend_deadline: '2022-04-10',
      spend_achieved: true,
      spend_current: 500,
      annual_fee: 0,
      year_one_waived: false,
    },
  ]);

  // ── Pro user points balances ──────────────────────────
  await supabase.from('points_balances').insert([
    { user_id: TEST_USER_PRO, program: 'Chase Ultimate Rewards', balance: 247000, last_updated: '2026-04-01' },
    { user_id: TEST_USER_PRO, program: 'Amex Membership Rewards', balance: 180000, last_updated: '2026-04-01' },
    { user_id: TEST_USER_PRO, program: 'World of Hyatt', balance: 94000, last_updated: '2026-04-01' },
    { user_id: TEST_USER_PRO, program: 'United MileagePlus', balance: 62000, last_updated: '2026-04-01' },
  ]);

  // ── Points valuations (stable test values) ────────────
  await supabase.from('points_valuations').upsert([
    { program: 'Chase Ultimate Rewards', cpp: 1.25, source: 'TPG' },
    { program: 'Amex Membership Rewards', cpp: 1.25, source: 'TPG' },
    { program: 'World of Hyatt', cpp: 1.50, source: 'TPG' },
    { program: 'United MileagePlus', cpp: 1.30, source: 'TPG' },
  ]);

  // ── Free user wallet (exactly 3 cards — at limit) ────
  await supabase.from('user_cards').insert([
    { user_id: TEST_USER_FREE, card_id: AMEX_PLATINUM_ID, last_four: '1111', opened_date: '2024-01-01' },
    { user_id: TEST_USER_FREE, card_id: CSR_ID, last_four: '2222', opened_date: '2024-02-01' },
    { user_id: TEST_USER_FREE, card_id: AMEX_GOLD_ID, last_four: '3333', opened_date: '2024-03-01' },
  ]);

  console.log('✅ Test database seeded successfully');
}

seedTestDatabase().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});