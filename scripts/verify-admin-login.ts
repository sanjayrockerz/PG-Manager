// Verifies platform-admin login the same way the app does:
// supabase.auth.signInWithPassword + profiles.role gate (AuthContext.tsx).
// Uses only the publishable anon key — safe to run without service-role access.
//
// Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run verify:admin-login

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath: string): void {
  try {
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {
    // ignore
  }
}

loadEnvFile(resolve(__dir, '..', '.env.local'));

const url = process.env['VITE_SUPABASE_URL'] ?? '';
const anonKey = process.env['VITE_SUPABASE_ANON_KEY'] ?? '';
const email = process.env['ADMIN_EMAIL'] ?? 'admin@rentcare.com';
const password = process.env['ADMIN_PASSWORD'] ?? 'RentCare#Admin2026!';

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const PLATFORM_ADMIN_ROLES = ['platform_admin', 'admin', 'super_admin'];

async function main(): Promise<void> {
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log(`Attempting signInWithPassword for ${email} ...`);
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    console.log('\nADMIN ACCOUNT REPORT');
    console.log('--------------------------------');
    console.log(`Email:                    ${email}`);
    console.log('Role:                     unknown (auth failed)');
    console.log('Exists in auth.users:     unknown (cannot verify without service-role access)');
    console.log('Exists in profiles:       unknown (cannot verify without service-role access)');
    console.log(`Can login:                NO (${error?.message ?? 'no session returned'})`);
    console.log('Admin portal accessible:  NO');
    process.exit(1);
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, email, role')
    .eq('id', data.user.id)
    .maybeSingle();

  const role = profile?.role ?? null;
  const isPlatformAdmin = PLATFORM_ADMIN_ROLES.includes(role ?? '');

  console.log('\nADMIN ACCOUNT REPORT');
  console.log('--------------------------------');
  console.log(`Email:                    ${data.user.email}`);
  console.log(`Role:                     ${role ?? '(no profile row found)'}`);
  console.log(`Profile id:               ${profile?.id ?? 'n/a'}`);
  console.log(`Auth user id:             ${data.user.id}`);
  console.log('Exists in auth.users:     YES (signed in successfully)');
  console.log(`Exists in profiles:       ${profile ? 'YES' : `NO (${profileError?.message ?? 'no row'})`}`);
  console.log('Can login:                YES');
  console.log(`Admin portal accessible:  ${isPlatformAdmin ? 'YES' : 'NO (role is not a platform-admin role)'}`);

  await client.auth.signOut();
}

main().catch((err) => {
  console.error('[error] Unexpected failure:', err);
  process.exit(1);
});
