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
  console.log('--- SYNCING USER METADATA ---');
  
  // 1. Get all profiles
  const { data: profiles, error } = await supabaseAdmin.from('profiles').select('id, role');
  if (error) throw error;
  
  let updatedCount = 0;
  for (const profile of profiles || []) {
    if (!profile.role) continue;
    
    // Only update if it's admin, or we can update everyone
    // The issue affects any role that depends on auth.jwt()
    const { data: userAuth, error: authErr } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (authErr || !userAuth.user) continue;
    
    const currentMeta = userAuth.user.user_metadata || {};
    if (currentMeta.role !== profile.role) {
      console.log(`Updating ${profile.id} role to ${profile.role}`);
      await supabaseAdmin.auth.admin.updateUserById(profile.id, {
        user_metadata: { ...currentMeta, role: profile.role }
      });
      updatedCount++;
    }
  }
  
  console.log(`Synced ${updatedCount} users.`);
}

run().catch(console.error);
