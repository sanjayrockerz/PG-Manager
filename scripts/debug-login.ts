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
  const email = process.env['DEBUG_LOGIN_EMAIL'];
  const password = process.env['DEBUG_LOGIN_PASSWORD'];
  if (!email || !password) {
    console.error('Set DEBUG_LOGIN_EMAIL and DEBUG_LOGIN_PASSWORD in your environment before running this script.');
    process.exit(1);
  }
  console.log(`Logging in as ${email} ...`);
  const login = await client.auth.signInWithPassword({ email, password });
  console.log('Login result:');
  console.dir(login, { depth: null });
}

run().catch(console.error);
