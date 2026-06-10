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

const client = createClient(url, anonKey);

// We want to test logging in as a demo user or admin user to verify what role the DB returns.
async function run() {
  console.log('Logging in as admin.demo@pgmanager.app (Demo2026)...');
  let login = await client.auth.signInWithPassword({
    email: 'admin.demo@pgmanager.app',
    password: 'RentCare#Demo2026!'
  });
  if (login.error) {
    console.log('  Failed:', login.error.message);
  }
  
  if (login.error) {
    console.log('Logging in as admin.demo@pgmanager.app (Admin2026)...');
    login = await client.auth.signInWithPassword({
      email: 'admin.demo@pgmanager.app',
      password: 'RentCare#Admin2026!'
    });
    if (login.error) {
      console.log('  Failed:', login.error.message);
    }
  }

  if (login.error) {
    console.log('Logging in as admin@rentcare.com...');
    login = await client.auth.signInWithPassword({
      email: 'admin@rentcare.com',
      password: 'RentCare#Admin2026!'
    });
    if (login.error) {
      console.log('  Failed:', login.error.message);
    }
  }

  if (login.error) {
    console.log('Logging in as owner.demo@pgmanager.app (Demo2026)...');
    login = await client.auth.signInWithPassword({
      email: 'owner.demo@pgmanager.app',
      password: 'RentCare#Demo2026!'
    });
    if (login.error) {
      console.log('  Failed:', login.error.message);
    }
  }

  if (login.error) {
    console.log('Logging in as owner.demo@pgmanager.app (Owner2026)...');
    login = await client.auth.signInWithPassword({
      email: 'owner.demo@pgmanager.app',
      password: 'RentCare#Owner2026!'
    });
    if (login.error) {
      console.log('  Failed:', login.error.message);
    }
  }

  if (login.error) {
    console.log('Failed to log in as admin:', login.error.message);
    return;
  }

  console.log('Successfully logged in! User ID:', login.data.user?.id);

  // Call current_user_role
  const { data: role, error: roleErr } = await client.rpc('current_user_role');
  console.log('RPC current_user_role:', roleErr ? roleErr.message : role);

  // Call current_user_is_admin
  const { data: isAdmin, error: adminErr } = await client.rpc('current_user_is_admin');
  console.log('RPC current_user_is_admin:', adminErr ? adminErr.message : isAdmin);

  // Call current_owner_scope_id
  const { data: scopeId, error: scopeErr } = await client.rpc('current_owner_scope_id');
  console.log('RPC current_owner_scope_id:', scopeErr ? scopeErr.message : scopeId);

  // Query profiles count
  const { data: profiles, error: profErr } = await client.from('profiles').select('id,email,role');
  if (profErr) {
    console.log('Failed to query profiles:', profErr.message);
  } else {
    console.log('Profiles returned:', profiles.length, 'rows');
    console.log(profiles);
  }

  await client.auth.signOut();
}

run().catch(console.error);
