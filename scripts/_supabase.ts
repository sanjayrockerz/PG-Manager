// Shared Supabase client for Node.js scripts.
// Reads credentials from .env.local if present, then falls back to process.env.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// Load .env.local without requiring dotenv as a dependency
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
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env file not found — rely on system env vars
  }
}

loadEnvFile(resolve(__dir, '..', '.env.local'));
loadEnvFile(resolve(__dir, '..', '.env'));

const url = process.env['VITE_SUPABASE_URL'] ?? process.env['SUPABASE_URL'] ?? '';
const key =
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ??
  process.env['VITE_SUPABASE_ANON_KEY'] ??
  process.env['SUPABASE_ANON_KEY'] ??
  '';

if (!url) {
  console.error(
    '\nMissing VITE_SUPABASE_URL.\n' +
    'Set it in .env.local or as an environment variable.\n'
  );
  process.exit(1);
}
if (!key) {
  console.error(
    '\nMissing Supabase key.\n' +
    'Set SUPABASE_SERVICE_ROLE_KEY (for full access) or VITE_SUPABASE_ANON_KEY in .env.local.\n'
  );
  process.exit(1);
}

if (!process.env['SUPABASE_SERVICE_ROLE_KEY']) {
  console.warn(
    '[warn] Using anon key. For service-level checks, set SUPABASE_SERVICE_ROLE_KEY.\n',
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
