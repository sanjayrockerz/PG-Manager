import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read env variables directly
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

async function main() {
  try {
    const sqlPath = path.resolve(__dirname, '..', 'supabase', 'migrations', '20260620_owner_email_templates.sql');
    console.log(`Reading SQL file from: ${sqlPath}`);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration script via RPC exec_sql...');
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('Error applying migration via RPC:', error);
      process.exit(1);
    }
    
    console.log('Migration applied successfully! Result:', data);
  } catch (err) {
    console.error('Error in execution:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
