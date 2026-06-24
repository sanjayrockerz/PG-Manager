// Bootstraps a platform admin account via the Supabase Admin API.
// Requires SUPABASE_SERVICE_ROLE_KEY (set in .env.local or the environment) —
// the anon key cannot create users. This is the supported path for hosted
// Supabase projects; supabase/migrations/20260607_platform_admin_bootstrap.sql
// is a fallback for environments with direct DB access.
//
// Usage: npm run bootstrap:admin
// Optional overrides: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npm run bootstrap:admin

import { supabase } from './_supabase';

const DEFAULT_EMAIL = 'admin@rentcare.com';

const email = process.env['ADMIN_EMAIL'] ?? DEFAULT_EMAIL;
const password = process.env['ADMIN_PASSWORD'];

async function main(): Promise<void> {
  if (!process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    console.error(
      '\nMissing SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Set it in .env.local (Project Settings → API → service_role key in the Supabase dashboard).\n' +
      'The anon key cannot create auth users.\n'
    );
    process.exit(1);
  }

  if (!password) {
    console.error(
      '\nMissing ADMIN_PASSWORD.\n' +
      "Run with ADMIN_PASSWORD='<a strong password>' npm run bootstrap:admin — never hardcode it in source.\n"
    );
    process.exit(1);
  }

  const { data: existingAdmins, error: lookupError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .in('role', ['platform_admin', 'admin', 'super_admin']);

  if (lookupError) {
    console.error('[error] Failed to check for existing platform admins:', lookupError.message);
    process.exit(1);
  }

  if (existingAdmins && existingAdmins.length > 0) {
    console.log(`Platform admin already exists (${existingAdmins.length} found):`);
    for (const admin of existingAdmins) {
      console.log(`  - ${admin.email} (role: ${admin.role}, profile id: ${admin.id})`);
    }
    console.log('\nSkipping bootstrap. Delete this profile/auth user first if you want to re-bootstrap.');
    return;
  }

  console.log(`No platform admin found. Creating one: ${email}`);

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let authUserId = created?.user?.id;

  if (createError) {
    if (createError.message.toLowerCase().includes('already')) {
      console.log('Auth user already exists — looking it up to link the profile.');
      const { data: page, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('[error] Failed to list users:', listError.message);
        process.exit(1);
      }
      authUserId = page.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
    } else {
      console.error('[error] Failed to create auth user:', createError.message);
      process.exit(1);
    }
  }

  if (!authUserId) {
    console.error('[error] Could not resolve an auth user id for', email);
    process.exit(1);
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: authUserId,
        email,
        full_name: 'Platform Administrator',
        role: 'platform_admin',
        pg_name: 'Platform Admin Console',
        city: 'Bengaluru',
      },
      { onConflict: 'id' }
    );

  if (profileError) {
    console.error('[error] Failed to upsert profile:', profileError.message);
    process.exit(1);
  }

  console.log('\nPlatform admin bootstrapped successfully.');
  console.log('--------------------------------------------');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role:     platform_admin`);
  console.log(`  Auth ID:  ${authUserId}`);
  console.log('--------------------------------------------');
  console.log('IMPORTANT: Sign in once and change the password immediately.');
}

main().catch((err) => {
  console.error('[error] Unexpected failure:', err);
  process.exit(1);
});
