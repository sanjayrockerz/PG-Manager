import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Set SUPABASE_DB_URL in .env.local (never hardcode credentials here).
const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('Set SUPABASE_DB_URL in your environment before running this script.');
  process.exit(1);
}

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    const sqlPath = path.resolve(process.cwd(), 'supabase', 'migrations', '20260615_platform_email_templates.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying migration 20260615_platform_email_templates.sql...');
    await client.query(sqlContent);
    console.log('Migration applied successfully!');

  } catch (err) {
    console.error('Error connecting or querying:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
