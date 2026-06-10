import pg from 'pg';
const { Client } = pg;

const password = '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';
const hosts = [
  'aws-1-ap-northeast-2.pooler.supabase.com',
  'krkzklxfczukvllhucsg.supabase.co',
];
const ports = [5432, 6543];
const users = ['postgres', 'postgres.krkzklxfczukvllhucsg'];

async function test(host: string, port: number, user: string) {
  const connectionString = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/postgres?sslmode=require`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`SUCCESS: host=${host}, port=${port}, user=${user}`);
    const res = await client.query('SELECT NOW()');
    console.log('Time:', res.rows[0]);
    await client.end();
    return true;
  } catch (err: any) {
    console.log(`FAILED: host=${host}, port=${port}, user=${user} - ${err.message}`);
    return false;
  }
}

async function main() {
  for (const host of hosts) {
    for (const port of ports) {
      for (const user of users) {
        await test(host, port, user);
      }
    }
  }
}

main().catch(console.error);
