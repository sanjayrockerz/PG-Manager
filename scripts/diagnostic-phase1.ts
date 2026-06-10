// Phase 1 Platform Integrity Diagnostic — uses service role key for unrestricted reads.
// Usage: npx tsx scripts/diagnostic-phase1.ts

import { supabase } from './_supabase';

async function main(): Promise<void> {
  console.log('\n=== PHASE 1 — PLATFORM INTEGRITY DIAGNOSTIC ===\n');

  // 1. Counts
  const [ownersRes, propertiesRes, tenantsRes, roomsRes, bedsRes, paymentsRes, subsRes, ticketsRes] = await Promise.all([
    supabase.from('profiles').select('id,email,role,is_suspended', { count: 'exact' }).eq('role', 'owner'),
    supabase.from('properties').select('id,owner_id,name', { count: 'exact' }),
    supabase.from('tenants').select('id,owner_id,status', { count: 'exact' }),
    supabase.from('rooms').select('id,status', { count: 'exact' }),
    supabase.from('beds').select('id', { count: 'exact', head: true }),
    supabase.from('payments').select('id,status,total_amount,paid_date,due_date', { count: 'exact' }),
    supabase.from('owner_subscriptions').select('id,owner_id,status,plan_code,amount', { count: 'exact' }),
    supabase.from('support_tickets').select('id,status,priority', { count: 'exact' }),
  ]);

  // 2. Admin accounts
  const adminsRes = await supabase
    .from('profiles')
    .select('id,email,role')
    .in('role', ['platform_admin', 'admin', 'super_admin']);

  console.log('── CORE COUNTS ─────────────────────────────');
  console.log(`  Owners:            ${ownersRes.count ?? 'ERROR: ' + ownersRes.error?.message}`);
  console.log(`  Properties:        ${propertiesRes.count ?? 'ERROR: ' + propertiesRes.error?.message}`);
  console.log(`  Tenants:           ${tenantsRes.count ?? 'ERROR: ' + tenantsRes.error?.message}`);
  console.log(`  Rooms:             ${roomsRes.count ?? 'ERROR: ' + roomsRes.error?.message}`);
  console.log(`  Beds:              ${bedsRes.count ?? 'ERROR: ' + bedsRes.error?.message}`);
  console.log(`  Payments:          ${paymentsRes.count ?? 'ERROR: ' + paymentsRes.error?.message}`);
  console.log(`  Subscriptions:     ${subsRes.count ?? 'ERROR: ' + subsRes.error?.message}`);
  console.log(`  Support Tickets:   ${ticketsRes.count ?? 'ERROR: ' + ticketsRes.error?.message}`);

  // 3. Subscription breakdown
  if (subsRes.data) {
    const statuses = subsRes.data.reduce<Record<string,number>>((acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc; }, {});
    const plans = subsRes.data.reduce<Record<string,number>>((acc, s) => { acc[s.plan_code] = (acc[s.plan_code] ?? 0) + 1; return acc; }, {});
    console.log('\n── SUBSCRIPTION BREAKDOWN ──────────────────');
    console.log('  By status:', statuses);
    console.log('  By plan:  ', plans);
  }

  // 4. MRR calculation
  if (paymentsRes.data) {
    const now = new Date();
    const thisMonth = paymentsRes.data.filter(p => {
      if (p.status !== 'paid') return false;
      const ref = p.paid_date ? new Date(p.paid_date) : new Date(p.due_date);
      return ref.getMonth() === now.getMonth() && ref.getFullYear() === now.getFullYear();
    });
    const mrr = thisMonth.reduce((sum, p) => sum + Number(p.total_amount), 0);
    const allPaid = paymentsRes.data.filter(p => p.status === 'paid');
    const totalRevenue = allPaid.reduce((sum, p) => sum + Number(p.total_amount), 0);
    console.log('\n── MRR / REVENUE ───────────────────────────');
    console.log(`  MRR (paid this month): Rs ${mrr.toLocaleString('en-IN')}`);
    console.log(`  Total all-time paid:   Rs ${totalRevenue.toLocaleString('en-IN')}`);
    console.log(`  Paid payments:         ${allPaid.length} / ${paymentsRes.data.length} total`);
  }

  // 5. Tenant status breakdown
  if (tenantsRes.data) {
    const statuses = tenantsRes.data.reduce<Record<string,number>>((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; }, {});
    console.log('\n── TENANT STATUS BREAKDOWN ─────────────────');
    Object.entries(statuses).sort((a,b) => b[1]-a[1]).forEach(([s,n]) => console.log(`  ${s.padEnd(25)} ${n}`));
  }

  // 6. Support tickets
  if (ticketsRes.data) {
    const open = ticketsRes.data.filter(t => t.status === 'open').length;
    const urgent = ticketsRes.data.filter(t => t.priority === 'urgent').length;
    console.log('\n── SUPPORT TICKETS ─────────────────────────');
    console.log(`  Open:   ${open}`);
    console.log(`  Urgent: ${urgent}`);
  }

  // 7. Room occupancy
  if (roomsRes.data) {
    const occupied = roomsRes.data.filter(r => r.status === 'occupied').length;
    const total = roomsRes.data.length;
    console.log('\n── OCCUPANCY ───────────────────────────────');
    console.log(`  Occupied rooms: ${occupied} / ${total} (${total > 0 ? Math.round((occupied/total)*100) : 0}%)`);
  }

  // 8. Admin accounts
  console.log('\n── ADMIN ACCOUNTS ──────────────────────────');
  if (adminsRes.error) {
    console.log('  ERROR:', adminsRes.error.message);
  } else {
    (adminsRes.data ?? []).forEach(a => console.log(`  ${(a.email ?? '(null)').padEnd(45)} role: ${a.role}`));
  }

  // 9. RLS check — verify service role can see all vs anon
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env['VITE_SUPABASE_URL'] ?? '';
  const anon = process.env['VITE_SUPABASE_ANON_KEY'] ?? '';
  const anonClient = createClient(url, anon, { auth: { persistSession: false } });
  const anonOwners = await anonClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'owner');
  console.log('\n── RLS VERIFICATION ────────────────────────');
  console.log(`  Owners via service role: ${ownersRes.count}`);
  console.log(`  Owners via anon key:     ${anonOwners.count ?? 'blocked'} ${anonOwners.error ? '(RLS blocking — correct!)' : ''}`);

  console.log('\n=== DIAGNOSTIC COMPLETE ===\n');
}

main().catch(err => { console.error('[fatal]', err); process.exit(1); });
