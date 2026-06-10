import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

function getToken() {
  const content = readFileSync(resolve(__dir, '..', '.env.setup'), 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('SUPABASE_ACCESS_TOKEN=')) {
      return trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

const token = getToken();
if (!token) {
  console.log('No token found');
  process.exit(1);
}

console.log(`Found token: "${token}" (length: ${token.length})`);

async function run() {
  const res = await fetch('https://api.supabase.com/v1/projects', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

run().catch(console.error);
