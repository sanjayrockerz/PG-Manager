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

// Verifies what role/scope RPCs return for a given account. Set DEBUG_LOGIN_EMAIL
// and DEBUG_LOGIN_PASSWORD in your environment — never hardcode credentials here.
async function run() {
  const email = process.env['DEBUG_LOGIN_EMAIL'];
  const password = process.env['DEBUG_LOGIN_PASSWORD'];
  if (!email || !password) {
    console.error('Set DEBUG_LOGIN_EMAIL and DEBUG_LOGIN_PASSWORD in your environment before running this script.');
    process.exit(1);
  }

  console.log(`Logging in as ${email}...`);
  const login = await client.auth.signInWithPassword({ email, password });

  if (login.error) {
    console.log('Failed to log in:', login.error.message);
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
