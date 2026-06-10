// Applies phase1 data cleanup directly via service role key.
import { supabase } from './_supabase';

async function main() {
  console.log('\n── Fixing invalid plan code ────────────────────────');
  // Fix scale → starter
  const { data: planData, error: planErr } = await supabase
    .from('owner_subscriptions')
    .update({ plan_code: 'starter' })
    .not('plan_code', 'in', '("starter","growth","pro")')
    .select('id,owner_id,plan_code');
  if (planErr) console.log('  ERROR:', planErr.message);
  else console.log(`  Fixed ${planData?.length ?? 0} subscription(s) with invalid plan codes`);

  console.log('\n── Removing null-email ghost admin profiles ────────');
  // Only delete ghost profiles with no email — real admins always have emails
  const { data: deleted, error: delErr } = await supabase
    .from('profiles')
    .delete()
    .in('role', ['platform_admin', 'admin', 'super_admin'])
    .is('email', null)
    .select('id');
  if (delErr) console.log('  ERROR:', delErr.message);
  else console.log(`  Deleted ${deleted?.length ?? 0} null-email ghost admin profile(s)`);

  console.log('\n── Verifying final state ────────────────────────────');
  const { count: admins } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .in('role', ['platform_admin', 'admin', 'super_admin']);
  const { count: badPlans } = await supabase
    .from('owner_subscriptions')
    .select('*', { count: 'exact', head: true })
    .not('plan_code', 'in', '("starter","growth","pro")');
  console.log(`  Admin profiles remaining: ${admins}`);
  console.log(`  Invalid plan codes remaining: ${badPlans}`);
  console.log('\n  DONE\n');
}

main().catch(console.error);
