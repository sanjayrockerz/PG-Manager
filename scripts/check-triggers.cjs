const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres: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@db.krkzklxfczukvllhucsg.supabase.co:5432/postgres' });
client.connect()
  .then(() => client.query("SELECT tgname, proname FROM pg_trigger JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid JOIN pg_class ON pg_class.oid = tgrelid WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');"))
  .then(res => { console.log(res.rows); client.end(); })
  .catch(err => { console.error(err); client.end(); });
