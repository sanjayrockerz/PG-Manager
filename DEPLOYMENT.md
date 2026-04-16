# Production Deployment Checklist (Vercel + Supabase)

## Live Production (Current)

- Primary URL: https://khush-project.vercel.app
- Deployment URL: https://khush-project-j6qupk97f-moti-sanjay-ms-projects.vercel.app
- Team alias: https://khush-project-moti-sanjay-ms-projects.vercel.app

## 1. Supabase

1. Open SQL Editor.
2. Run `supabase/schema.sql`.
   - This includes `sync_payment_fields_on_tenant_update` trigger so tenant edits (name/room/rent/property) instantly reflect in Payments and Dashboard.
3. Run [supabase/migrations/20260412_sync_tenant_payment_updates.sql](supabase/migrations/20260412_sync_tenant_payment_updates.sql).
4. Run [supabase/migrations/20260414_multi_owner_saas_expansion.sql](supabase/migrations/20260414_multi_owner_saas_expansion.sql).
   - Adds multi-owner RBAC, owner scopes, subscriptions, support tickets, and normalized property address fields.
5. In Storage Dashboard:
   - Create bucket `tenant-files`.
   - Configure bucket policies in policy editor for read + authenticated owner-scoped write/update/delete.
6. In Database -> Replication Dashboard:
   - Enable realtime for `properties`, `rooms`, `tenants`, `payments`, `payment_charges`, `maintenance_tickets`, `maintenance_notes`, `announcements`, `notifications`.
   - Also enable realtime for `profiles`, `owner_user_property_scopes`, `owner_subscriptions`, `support_tickets`, `support_ticket_comments`.
7. In Auth settings:
   - Enable Email OTP.
   - Set Site URL to your Vercel production URL.
   - Add preview URL(s) to Redirect URLs if needed.

## 2. Seed bootstrap data

Choose one path:

### Path A: Owner + tenant + admin bootstrap
1. Login once with OTP as `owner.demo@pgmanager.app`.
2. Login once with OTP as `tenant.demo@pgmanager.app`.
3. Login once with OTP as `admin.demo@pgmanager.app`.
4. Run `supabase/seed_demo_owner.sql`.
5. Run `supabase/seed_demo_tenant_link.sql`.
6. Run `supabase/seed_demo_admin_link.sql`.

### Path B: Owner-only bootstrap
1. Login once with OTP as `owner.demo@pgmanager.app`.
2. Run `supabase/seed_demo_owner.sql`.

## 3. Vercel project configuration

1. Import repository in Vercel.
2. Set production branch to `main`.
3. Confirm build settings:
   - Framework preset: `Vite`
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: `build`
4. Add env vars to both Preview and Production:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL`
5. Deploy.

## 4. Post-deploy validation

1. Owner login works via OTP.
2. Owner screens load live data:
   - Dashboard
   - Properties
   - Tenants + Tenant Detail
   - Payments
   - Maintenance
   - Announcements
   - Settings
   - Notifications
   - Mobile Mockup
3. Tenant login works (Path A only):
   - Tenant Portal dashboard/profile/payments/maintenance/announcements
   - Tenant can submit maintenance request
4. Admin panel (if admin profile exists):
   - Dashboard/users/analytics/support load live tables
5. File uploads work for tenant documents bucket (`tenant-files`).

## 5. OTP sign-in flow

Use OTP sign-in live in front of client with:

- owner.demo@pgmanager.app
- tenant.demo@pgmanager.app
- admin.demo@pgmanager.app

No password is required. Supabase sends OTP to email.

## 6. Known non-blocking warning

`npm run build` may report large bundle chunk warnings from Vite. This does not block deployment.
