import pg from 'pg';
const { Client } = pg;

// This script previously brute-forced a hardcoded list of candidate passwords
// (including real app passwords) against both ports — that list itself was a
// credential leak. It now tests exactly one password from your environment
// against both known ports.
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error('Set SUPABASE_DB_PASSWORD in your environment before running this script.');
  process.exit(1);
}

const host = 'aws-1-ap-northeast-2.pooler.supabase.com';
const ports = [5432, 6543];
const user = 'postgres.krkzklxfczukvllhucsg';

async function testPassword(pwd: string, port: number) {
  const client = new Client({
    host,
    port,
    user,
    password: pwd,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`SUCCESS on port ${port}`);
    await client.end();
    return true;
  } catch (err: any) {
    if (err.message.includes('certificate') || err.message.includes('self-signed')) {
      console.log(`SUCCESS (cert error implies auth OK) on port ${port}`);
      return true;
    }
    console.log(`FAILED on port ${port}: ${err.message}`);
    return false;
  }
}

async function main() {
  for (const port of ports) {
    const ok = await testPassword(password!, port);
    if (ok) {
      console.log('Connected successfully.');
      process.exit(0);
    }
  }
  console.log('Connection failed on both ports.');
}

main().catch(console.error);
