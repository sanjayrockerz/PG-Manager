import pg from 'pg';
const { Client } = pg;

const password = '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';
const host = 'aws-1-ap-northeast-2.pooler.supabase.com';
const ports = [5432, 6543];
const users = ['postgres', 'postgres.krkzklxfczukvllhucsg'];

async function test(port: number, user: string) {
  const client = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`SUCCESS: port=${port}, user=${user}`);
    const res = await client.query('SELECT NOW()');
    console.log('Time:', res.rows[0]);
    await client.end();
    return true;
  } catch (err: any) {
    console.log(`FAILED: port=${port}, user=${user} - ${err.message}`);
    return false;
  }
}

async function main() {
  for (const port of ports) {
    for (const user of users) {
      await test(port, user);
    }
  }
}

main().catch(console.error);
