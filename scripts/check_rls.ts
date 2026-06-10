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
  // Create an RPC function to read pg_policies
  await supabaseAdmin.rpc('exec_sql', { sql: `
    CREATE OR REPLACE FUNCTION get_all_policies()
    RETURNS json AS $$
    BEGIN
      RETURN (SELECT json_agg(row_to_json(p)) FROM pg_policies p WHERE schemaname = 'public' AND tablename = 'properties');
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  ` });

  const { data, error } = await supabaseAdmin.rpc('get_all_policies');
  console.log('Policies for properties:', JSON.stringify(data, null, 2));
}

run().catch(console.error);
