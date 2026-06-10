import { exec } from 'child_process';
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

console.log(`Found password: "${pass}" (length: ${pass.length})`);
// Escape special characters for URI
const escapedPass = encodeURIComponent(pass);

const dbUrl = `postgresql://postgres.krkzklxfczukvllhucsg:${escapedPass}@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require`;

const cmd = `"${resolve(__dir, '..', '.tools', 'supabase', 'supabase.exe')}" db query "SELECT 1" --db-url "${dbUrl}"`;

console.log('Running command...');
exec(cmd, (err, stdout, stderr) => {
  console.log('STDOUT:', stdout);
  console.log('STDERR:', stderr);
  if (err) {
    console.error('Error:', err.message);
  }
});
