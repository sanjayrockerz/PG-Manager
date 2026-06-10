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
  console.log('Querying profiles (anon)...');
  const { data, error } = await client.from('profiles').select('*').limit(5);
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Profiles:', data);
  }

  console.log('Querying properties (anon)...');
  const { data: props, error: propsErr } = await client.from('properties').select('*').limit(5);
  if (propsErr) {
    console.log('Error:', propsErr);
  } else {
    console.log('Properties:', props);
  }
}

run().catch(console.error);
