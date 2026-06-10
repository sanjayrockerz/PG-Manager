const pg = require('pg');
const fs = require('fs');
const path = require('path');
const { Client } = pg;

const connectionString = 'postgresql://postgres.krkzklxfczukvllhucsg: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@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260608_fix_admin_profiles.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Error connecting or querying:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
