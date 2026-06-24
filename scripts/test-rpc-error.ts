import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const equalsIdx = trimmed.indexOf('=');
  if (equalsIdx !== -1) {
    env[trimmed.slice(0, equalsIdx)] = trimmed.slice(equalsIdx + 1);
  }
});

const supabaseAdmin = createClient(env['VITE_SUPABASE_URL']!, env['SUPABASE_SERVICE_ROLE_KEY']!);

async function run() {
  console.log('Calling exec_sql...');
  const { data: d1, error: e1 } = await supabaseAdmin.rpc('exec_sql', { sql: 'SELECT 1;' });
  console.log('exec_sql result:', d1, 'Error:', e1);

  console.log('Calling get_all_policies...');
  const { data: d2, error: e2 } = await supabaseAdmin.rpc('get_all_policies');
  console.log('get_all_policies result:', d2, 'Error:', e2);
}

run().catch(console.error);
