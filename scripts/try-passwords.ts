import pg from 'pg';
const { Client } = pg;

const passwords = [
  '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',
  'RentCare#Admin2026!',
  'RentCare#Demo2026!',
  'RentCare#Owner2026!'
];

const host = 'aws-1-ap-northeast-2.pooler.supabase.com';
const port = 6543;
const user = 'postgres.krkzklxfczukvllhucsg';
const database = 'postgres';

async function testPassword(password: string) {
  const connectionString = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`SUCCESS with password: ${password}`);
    const res = await client.query('SELECT NOW()');
    console.log('Database time:', res.rows[0]);
    await client.end();
    return true;
  } catch (err: any) {
    console.log(`FAILED with password: ${password} - Error: ${err.message}`);
    return false;
  }
}

async function main() {
  for (const pass of passwords) {
    const success = await testPassword(pass);
    if (success) {
      console.log('Found working password!');
      break;
    }
  }
}

main().catch(console.error);
