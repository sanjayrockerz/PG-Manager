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

async function run() {
  console.log('Calling current_user_role (anon)...');
  const { data: role, error: roleErr } = await client.rpc('current_user_role');
  console.log('  Result:', roleErr ? roleErr.message : role);

  console.log('Calling current_user_is_admin (anon)...');
  const { data: isAdmin, error: adminErr } = await client.rpc('current_user_is_admin');
  console.log('  Result:', adminErr ? adminErr.message : isAdmin);

  console.log('Calling current_owner_scope_id (anon)...');
  const { data: scopeId, error: scopeErr } = await client.rpc('current_owner_scope_id');
  console.log('  Result:', scopeErr ? scopeErr.message : scopeId);
}

run().catch(console.error);
