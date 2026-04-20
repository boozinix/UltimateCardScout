import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupTestDatabase() {
  console.log('🧹 Cleaning up test database...');

  const tables = [
    'retention_logs',
    'card_applications',
    'points_balances',
    'user_benefits',
    'user_cards',
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error(`❌ Failed to clean ${table}:`, error.message);
    } else {
      console.log(`  ✓ Cleaned ${table}`);
    }
  }

  console.log('✅ Test database cleanup complete');
}

cleanupTestDatabase().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});