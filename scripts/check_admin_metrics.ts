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
    const key = trimmed.slice(0, equalsIdx);
    const value = trimmed.slice(equalsIdx + 1);
    env[key] = value;
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL']!;
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY']!;

if (!supabaseUrl) throw new Error('No URL');
if (!serviceRoleKey) throw new Error('No Key');

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('--- DB INTEGRITY AUDIT ---');

  const { count: dbOwners, error: err1 } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'owner');
    
  if (err1) console.error('Error fetching DB owners:', err1);
  else console.log(`[DB] True Owner Count: ${dbOwners}`);

  const { count: dbProperties } = await supabaseAdmin.from('properties').select('*', { count: 'exact', head: true });
  console.log(`[DB] True Properties Count: ${dbProperties}`);

  const { count: dbTenants } = await supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true });
  console.log(`[DB] True Tenants Count: ${dbTenants}`);
  
  const { data: ownersData } = await supabaseAdmin.from('profiles').select('id, email, is_suspended').eq('role', 'owner');
  const suspended = ownersData?.filter(o => o.is_suspended).length || 0;
  console.log(`[DB] Suspended Owners Count: ${suspended}`);
  
  console.log('Done.');
}

run().catch(console.error);
