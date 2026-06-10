import { supabase } from './_supabase';

async function main() {
  // Check subscription duplicates
  const { data: subs } = await supabase
    .from('owner_subscriptions')
    .select('id,owner_id,status,plan_code,amount,created_at')
    .order('owner_id');

  console.log('\n── ALL SUBSCRIPTIONS ───────────────────────────────────────────');
  const byOwner = new Map<string, typeof subs>();
  (subs ?? []).forEach(s => {
    const arr = byOwner.get(s.owner_id) ?? [];
    arr.push(s);
    byOwner.set(s.owner_id, arr);
  });

  let dupeOwners = 0;
  byOwner.forEach((rows, ownerId) => {
    if (rows.length > 1) {
      dupeOwners++;
      console.log(`  OWNER ${ownerId} has ${rows.length} subscriptions:`);
      rows.forEach(r => console.log(`    id=${r.id} status=${r.status} plan=${r.plan_code} amount=${r.amount} created=${r.created_at}`));
    }
  });
  if (dupeOwners === 0) console.log('  No duplicate subscriptions found.');

  // Check owners without subscriptions
  const { data: owners } = await supabase.from('profiles').select('id,email').eq('role', 'owner');
  const ownerIds = new Set((owners ?? []).map(o => o.id));
  const subOwnerIds = new Set(byOwner.keys());
  const noSub = [...ownerIds].filter(id => !subOwnerIds.has(id));
  console.log(`\n  Owners without subscriptions: ${noSub.length}`);
  noSub.forEach(id => console.log(`    ${id}`));

  // Check scale plan
  const scaleSubs = (subs ?? []).filter(s => s.plan_code === 'scale');
  console.log(`\n  Subs with invalid plan 'scale': ${scaleSubs.length}`);
  scaleSubs.forEach(s => console.log(`    id=${s.id} owner=${s.owner_id}`));

  // Null email admin profiles
  const { data: admins } = await supabase
    .from('profiles')
    .select('id,email,role,created_at')
    .in('role', ['platform_admin', 'admin', 'super_admin']);
  const nullAdmins = (admins ?? []).filter(a => !a.email);
  console.log(`\n  Null-email admin profiles: ${nullAdmins.length}`);
  nullAdmins.forEach(a => console.log(`    id=${a.id} created=${a.created_at}`));
}

main().catch(console.error);
