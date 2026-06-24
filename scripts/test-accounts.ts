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

// Set TEST_ACCOUNTS_JSON in your environment to a JSON array of
// {"email":"...","password":"..."} objects — never hardcode real credentials here.
const testUsersRaw = process.env['TEST_ACCOUNTS_JSON'];
if (!testUsersRaw) {
  console.error('Set TEST_ACCOUNTS_JSON (a JSON array of {email,password}) before running this script.');
  process.exit(1);
}
const testUsers: { email: string; password: string }[] = JSON.parse(testUsersRaw);

async function run() {
  for (const user of testUsers) {
    console.log(`Testing ${user.email} with password: ${user.password}`);
    const { data, error } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });
    if (error) {
      console.log(`  Result: FAILED - ${error.message}`);
    } else {
      console.log(`  Result: SUCCESS`);
      console.log(`    User ID: ${data.user?.id}`);
      console.log(`    Role (Metadata): ${data.user?.user_metadata?.role}`);
      
      // Select profile
      const { data: profile, error: profileErr } = await client
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .maybeSingle();
        
      if (profileErr) {
        console.log(`    Profile error: ${profileErr.message}`);
      } else {
        console.log(`    Profile:`, profile);
      }
      
      await client.auth.signOut();
    }
  }
}

run().catch(console.error);
