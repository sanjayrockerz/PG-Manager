import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Set SUPABASE_DB_PASSWORD in .env.local (never hardcode credentials here).
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error('Set SUPABASE_DB_PASSWORD in your environment before running this script.');
    process.exit(1);
  }
  // Pass configuration parameters individually to avoid connectionString overriding ssl config
  const client = new pg.Client({
    host: 'aws-1-ap-northeast-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.krkzklxfczukvllhucsg',
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    const sqlPath = path.resolve(__dirname, '..', 'supabase', 'migrations', '20260620_owner_email_templates.sql');
    console.log(`Reading SQL file from: ${sqlPath}`);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration script...');
    await client.query(sqlContent);
    console.log('Migration applied successfully!');

  } catch (err) {
    console.error('Error applying migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
