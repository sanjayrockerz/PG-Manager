import { supabase } from './_supabase';

async function main() {
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id,room_number,capacity,status,property_id,room_type')
    .limit(20);

  console.log('\n── SAMPLE ROOMS ───────────────────────────────────');
  (rooms ?? []).forEach(r => console.log(`  ${r.id} | ${r.room_number} | cap=${r.capacity} | type=${r.room_type} | status=${r.status}`));

  // Check beds table columns
  const { data: beds, error: bedsErr } = await supabase.from('beds').select('*').limit(5);
  if (bedsErr) {
    console.log('\n  beds table error:', bedsErr.message);
  } else {
    console.log('\n── SAMPLE BEDS ─────────────────────────────────────');
    if (beds?.length === 0) {
      console.log('  (empty — no beds seeded)');
    } else {
      beds?.forEach(b => console.log(' ', JSON.stringify(b)));
    }
  }

  // Check tenants table for room assignments
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id,name,room_id,bed_id,status')
    .limit(10);
  console.log('\n── SAMPLE TENANTS ──────────────────────────────────');
  (tenants ?? []).forEach(t => console.log(`  ${t.name} | room=${t.room_id ?? 'null'} | bed=${t.bed_id ?? 'null'} | status=${t.status}`));
}

main().catch(console.error);
