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

const supabaseUrl = env['VITE_SUPABASE_URL']!;
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY']!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: adminProfiles } = await supabaseAdmin.from('profiles').select('*').in('role', ['platform_admin', 'admin', 'super_admin']);
  console.log('Admin profiles:', adminProfiles?.length);
  
  if (adminProfiles && adminProfiles.length > 0) {
    for (const p of adminProfiles) {
      const { data: userAuth, error } = await supabaseAdmin.auth.admin.getUserById(p.id);
      if (error) console.log(`Error for ${p.id}:`, error.message);
      else console.log(`Admin user ${p.id} metadata:`, userAuth.user.user_metadata);
    }
  }
}

run().catch(console.error);
