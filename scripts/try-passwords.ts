import pg from 'pg';
const { Client } = pg;

// This script previously brute-forced a hardcoded list of candidate passwords —
// that list itself was a credential leak. It now tests exactly one password,
// supplied via SUPABASE_DB_PASSWORD in your environment.
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error('Set SUPABASE_DB_PASSWORD in your environment before running this script.');
  process.exit(1);
}

const host = 'aws-1-ap-northeast-2.pooler.supabase.com';
const port = 6543;
const user = 'postgres.krkzklxfczukvllhucsg';
const database = 'postgres';

async function testPassword(pwd: string) {
  const connectionString = `postgresql://${user}:${encodeURIComponent(pwd)}@${host}:${port}/${database}`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('SUCCESS connecting with the supplied password.');
    const res = await client.query('SELECT NOW()');
    console.log('Database time:', res.rows[0]);
    await client.end();
    return true;
  } catch (err: any) {
    console.log(`FAILED - Error: ${err.message}`);
    return false;
  }
}

async function main() {
  await testPassword(password!);
}

main().catch(console.error);
