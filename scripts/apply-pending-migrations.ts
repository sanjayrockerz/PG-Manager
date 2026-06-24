import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

function getPass() {
  const content = readFileSync(resolve(__dir, '..', '.env.setup'), 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('SUPABASE_DB_PASSWORD=')) {
      return trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

const pass = getPass();
if (!pass) {
  console.log('No pass found');
  process.exit(1);
}

const escapedPass = encodeURIComponent(pass);
const dbUrl = `postgresql://postgres.krkzklxfczukvllhucsg:${escapedPass}@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require`;

const migrations = [
  '20260619_plans_coupons_and_offers.sql',
  '20260620_owner_email_templates.sql',
];

const cliPath = resolve(__dir, '..', '.tools', 'supabase', 'supabase.exe');

for (const migration of migrations) {
  const sqlPath = resolve(__dir, '..', 'supabase', 'migrations', migration);
  const cmd = `"${cliPath}" db query -f "${sqlPath}" --db-url "${dbUrl}"`;
  console.log(`\nApplying ${migration}...`);
  try {
    const out = execSync(cmd, { encoding: 'utf8' });
    console.log('STDOUT:', out);
  } catch (err: any) {
    console.error(`Error applying ${migration}:`, err.message);
    if (err.stdout) console.log('STDOUT:', err.stdout);
    if (err.stderr) console.log('STDERR:', err.stderr);
    process.exit(1);
  }
}

console.log('\nAll pending migrations applied successfully!');
