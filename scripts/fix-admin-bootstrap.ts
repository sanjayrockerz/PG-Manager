// Fixes the admin bootstrap blockage and creates the platform admin user.
//
// Problem: Old migration scripts created ghost platform_admin profiles with
// null emails. The bootstrap-admin.ts script sees those and skips, so the
// real admin@rentcare.com user is never created.
//
// This script:
//   1. Deletes ghost platform_admin profiles (null/empty email, no auth user)
//   2. Creates admin@rentcare.com via the Admin API with email_confirm: true
//   3. Upserts the profile with role = platform_admin
//
// Usage:  npm run fix:admin-bootstrap
// Or:     npx tsx scripts/fix-admin-bootstrap.ts

import { supabase } from './_supabase';

const TARGET_EMAIL = process.env['ADMIN_EMAIL'] ?? 'admin@rentcare.com';
const TARGET_PASSWORD = process.env['ADMIN_PASSWORD'] ?? 'RentCare#Admin2026!';

async function main(): Promise<void> {
  if (!process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    console.error(
      '\nMissing SUPABASE_SERVICE_ROLE_KEY in .env.local.\n' +
      'Get it from: Supabase Dashboard → Project Settings → API → service_role key\n',
    );
    process.exit(1);
  }

  console.log('Step 1 — scanning for ghost platform_admin profiles...');

  const { data: adminProfiles, error: scanError } = await supabase
    .from('profiles')
    .select('id,email,role')
    .in('role', ['platform_admin', 'admin', 'super_admin']);

  if (scanError) {
    console.error('[error] Failed to scan profiles:', scanError.message);
    process.exit(1);
  }

  const ghosts = (adminProfiles ?? []).filter(
    (p) => !p.email || p.email.trim() === '',
  );

  const realAdmins = (adminProfiles ?? []).filter(
    (p) => p.email && p.email.trim() !== '',
  );

  console.log(`  Found ${adminProfiles?.length ?? 0} platform_admin profile(s)`);
  console.log(`  Ghost profiles (no email): ${ghosts.length}`);
  console.log(`  Real admin profiles: ${realAdmins.length}`);

  if (ghosts.length > 0) {
    console.log('\nStep 2 — deleting ghost profiles...');
    const ghostIds = ghosts.map((g) => g.id);
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .in('id', ghostIds);

    if (deleteError) {
      console.error('[error] Failed to delete ghost profiles:', deleteError.message);
      process.exit(1);
    }
    console.log(`  Deleted ${ghostIds.length} ghost profile(s).`);
  } else {
    console.log('Step 2 — no ghost profiles to delete. Skipping.');
  }

  // Check if the target admin already exists after cleanup
  const { data: existingAdmin } = await supabase
    .from('profiles')
    .select('id,email,role')
    .eq('email', TARGET_EMAIL.toLowerCase())
    .maybeSingle();

  if (existingAdmin) {
    console.log(`\nAdmin profile already exists for ${TARGET_EMAIL} (id: ${existingAdmin.id})`);
    console.log('Nothing to do — try logging in with the existing credentials.');
    console.log(`  Email:    ${TARGET_EMAIL}`);
    console.log(`  Password: ${TARGET_PASSWORD}`);
    return;
  }

  console.log(`\nStep 3 — creating auth user for ${TARGET_EMAIL}...`);

  // First check if an auth user already exists (may have been created by migration)
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('[error] Failed to list auth users:', listError.message);
    process.exit(1);
  }

  let authUserId: string | undefined = userList.users.find(
    (u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase(),
  )?.id;

  if (authUserId) {
    console.log(`  Auth user already exists (id: ${authUserId}). Updating password...`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, {
      password: TARGET_PASSWORD,
      email_confirm: true,
    });
    if (updateError) {
      console.warn('[warn] Could not update password:', updateError.message);
    }
  } else {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: TARGET_EMAIL,
      password: TARGET_PASSWORD,
      email_confirm: true,
    });

    if (createError) {
      console.error('[error] Failed to create auth user:', createError.message);
      process.exit(1);
    }
    authUserId = created.user?.id;
  }

  if (!authUserId) {
    console.error('[error] Could not resolve auth user id.');
    process.exit(1);
  }

  console.log(`  Auth user ready (id: ${authUserId})`);

  console.log('\nStep 4 — upserting platform_admin profile...');
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: authUserId,
        email: TARGET_EMAIL.toLowerCase(),
        full_name: 'Platform Administrator',
        role: 'platform_admin',
        pg_name: 'Platform Admin Console',
        city: 'Bengaluru',
      },
      { onConflict: 'id' },
    );

  if (profileError) {
    console.error('[error] Failed to upsert profile:', profileError.message);
    process.exit(1);
  }

  console.log('\n✓ Platform admin bootstrapped successfully!');
  console.log('────────────────────────────────────────────');
  console.log(`  Email:    ${TARGET_EMAIL}`);
  console.log(`  Password: ${TARGET_PASSWORD}`);
  console.log(`  Role:     platform_admin`);
  console.log(`  Auth ID:  ${authUserId}`);
  console.log('────────────────────────────────────────────');
  console.log('Go to the app → Select "Admin" portal → Sign in with the above credentials.');
  console.log('IMPORTANT: Change the password after your first login.');
}

main().catch((err) => {
  console.error('[error] Unexpected failure:', err);
  process.exit(1);
});
