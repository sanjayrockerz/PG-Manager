import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.krkzklxfczukvllhucsg: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@db.krkzklxfczukvllhucsg.supabase.co:5432/postgres';

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    // Test a basic select
    const res = await client.query('SELECT NOW()');
    console.log('Database time:', res.rows[0]);

    // Let's query profiles count and roles
    const profilesRes = await client.query('SELECT role, count(*) FROM public.profiles GROUP BY role');
    console.log('Profiles by role:', profilesRes.rows);

    // Let's get list of active owners and their subscriptions
    const ownersRes = await client.query(`
      SELECT p.id, p.email, p.full_name, p.role, p.is_suspended, s.status, s.plan_code
      FROM public.profiles p
      LEFT JOIN public.owner_subscriptions s ON p.id = s.owner_id
      WHERE p.role = 'owner'
    `);
    console.log('Owners in DB:', ownersRes.rows);

  } catch (err) {
    console.error('Error connecting or querying:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
