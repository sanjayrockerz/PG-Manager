# Supabase Production Setup

This project is structured as a production-grade working model.

## A) SQL-safe schema steps (run in SQL Editor)

Run these files in order:

1. `supabase/schema.sql`
2. `supabase/migrations/20260412_sync_tenant_payment_updates.sql`
3. `supabase/migrations/20260414_multi_owner_saas_expansion.sql`
4. `supabase/seed_demo_owner.sql` (optional bootstrap data)
5. `supabase/seed_demo_tenant_link.sql` (optional tenant account link)
6. `supabase/seed_demo_admin_link.sql` (optional admin account link)

`schema.sql` includes only SQL-editor-safe application database objects:
- Core app tables
- Constraints
- App-owned triggers/functions
- RLS enablement and role-aware policies on public app tables

## B) Dashboard/manual Supabase steps

These are intentionally outside `schema.sql` due ownership restrictions in managed Supabase environments.

### 1) Storage setup (Dashboard)

In Supabase Dashboard:

1. Open Storage.
2. Create bucket: `tenant-files`
3. Set visibility according to your policy:
   - Public read for simpler file access paths
   - Private if you plan signed URL delivery end-to-end

Then configure Storage policies in Dashboard policy editor for `storage.objects`:
- Read policy for `tenant-files`
- Insert/update/delete policies constrained to authenticated user UID folder prefix

### 2) Realtime table enrollment (Dashboard)

In Supabase Dashboard:

1. Open Database -> Replication (Realtime).
2. Ensure these tables are enabled for realtime changes:
   - `profiles`
   - `properties`
   - `rooms`
   - `tenants`
   - `payments`
   - `payment_charges`
   - `maintenance_tickets`
   - `maintenance_notes`
   - `announcements`
   - `notifications`
   - `owner_user_property_scopes`
   - `owner_subscriptions`
   - `support_tickets`
   - `support_ticket_comments`

## C) Auth setup steps

In Supabase Dashboard -> Authentication:

1. Enable Email OTP provider.
2. Set Site URL to production domain.
3. Add all required redirect URLs (preview + production).
4. Verify outbound email behavior for OTP delivery.

## D) Optional auth.users trigger step

`schema.sql` defines `public.handle_new_auth_user()` but does not attach it to `auth.users` by default.

Reason: `auth.users` trigger creation can be ownership-restricted in some Supabase projects.

If your project role allows it, you may attach the trigger manually:

```sql
-- Optional only when your role has permission on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();
```

If you cannot attach this trigger, the app still works because profiles are upserted from application auth flow.

## E) Environment variables

Set in local and hosting environments:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL` (recommended for OTP redirect consistency)

## F) Idempotency notes

`schema.sql` is rerun-safe for:
- table creation (`create table if not exists`)
- function replacement (`create or replace function`)
- policy recreation (`drop policy if exists` + `create policy`)
- trigger recreation on app tables (`drop trigger if exists` + `create trigger`)
