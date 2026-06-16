import pg from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = 'postgresql://postgres.krkzklxfczukvllhucsg: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@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

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
