import { supabase } from './_supabase';

async function main() {
  // Use count: exact to see if rooms exist
  const { count: roomCount, error: e1 } = await supabase.from('rooms').select('*', { count: 'exact', head: true });
  console.log('Rooms count (head):', roomCount, 'error:', e1?.message);

  const { data: rooms, error: e2 } = await supabase.from('rooms').select('id,room_number,capacity,status,property_id').limit(5);
  console.log('Rooms data:', rooms?.length, 'error:', e2?.message);
  rooms?.forEach(r => console.log('  ', JSON.stringify(r)));

  // Check beds table structure
  const { data: bedsSchema, error: e3 } = await supabase.rpc('pg_catalog.current_schema');
  console.log('Schema:', bedsSchema, e3?.message);

  // Try raw beds select
  const { data: beds, error: e4 } = await supabase.from('beds').select('id,room_id,bed_label,is_occupied').limit(5);
  console.log('Beds data:', beds?.length, 'error:', e4?.message);

  // Tenants
  const { data: tenants, error: e5 } = await supabase.from('tenants').select('id,name,status,room_id,bed_id').limit(5);
  console.log('Tenants:', tenants?.length, 'error:', e5?.message);
  tenants?.forEach(t => console.log('  ', JSON.stringify(t)));
}

main().catch(console.error);
