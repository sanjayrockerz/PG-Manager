import pg from 'pg';
const { Client } = pg;

// Set SUPABASE_DB_URL in .env.local (never hardcode credentials here).
const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('Set SUPABASE_DB_URL in your environment before running this script.');
  process.exit(1);
}

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Time:', res.rows[0]);
    await client.end();
  } catch (err: any) {
    console.log('Connection failed:', err.message);
  }
}

main().catch(console.error);
