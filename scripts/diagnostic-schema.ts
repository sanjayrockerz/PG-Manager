import { supabase } from './_supabase';

async function cols(table: string) {
  const { data, error } = await supabase.from(table).select('*').limit(1);
  if (error) { console.log(`  ${table}: ERROR ${error.message}`); return; }
  const row = (data ?? [])[0];
  if (!row) { console.log(`  ${table}: (empty, columns unknown from empty set)`); return; }
  console.log(`  ${table}: ${Object.keys(row).join(', ')}`);
  console.log(`    sample:`, JSON.stringify(row).slice(0, 200));
}

async function main() {
  console.log('\n── TABLE SCHEMAS ────────────────────────────────────');
  for (const t of ['rooms', 'beds', 'tenants', 'payments', 'properties', 'profiles', 'owner_subscriptions']) {
    await cols(t);
  }
}

main().catch(console.error);
