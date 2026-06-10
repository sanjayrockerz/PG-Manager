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
  const email = `test.${Math.random().toString(36).substring(7)}@pgmanager.app`;
  console.log(`Signing up as ${email}...`);
  const result = await client.auth.signUp({
    email,
    password: 'TestPassword123!',
    options: {
      data: {
        role: 'owner',
        name: 'Test Signup User'
      }
    }
  });
  console.log('Signup result:');
  console.dir(result, { depth: null });
}

run().catch(console.error);
