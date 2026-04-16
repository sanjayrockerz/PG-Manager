
  # PG Management

  PG Management is a Supabase-backed property management app with owner, tenant, and admin role flows.

  ## 1. Install

  Run:

  `npm install`

  ## 2. Configure environment

  Copy `.env.example` to `.env.local` and set:

  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SITE_URL` (recommended for OTP redirects in preview/production)

  ## 3. Configure Supabase

  1. Run `supabase/schema.sql` in Supabase SQL editor.
  2. Run `supabase/migrations/20260412_sync_tenant_payment_updates.sql`.
  3. Run `supabase/migrations/20260414_multi_owner_saas_expansion.sql`.
  2. Complete manual Storage, Realtime, and Auth setup from `supabase/README.md`.
  3. Seed bootstrap data using one of the paths in `supabase/README.md`.

  ## 4. Run locally

  `npm run dev`

  ## 5. Build check

  `npm run build`

  ## 6. Vercel production deployment

  1. Import this repo/project into Vercel.
  2. Set production branch to `main`.
  3. Add env vars for both Preview and Production:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
  4. Deploy.
  5. In Supabase Auth settings, ensure Site URL and redirect URLs include your Vercel domains.

  ### Current Production URLs

  - Primary alias: https://khush-project.vercel.app
  - Deployment URL: https://khush-project-j6qupk97f-moti-sanjay-ms-projects.vercel.app
  - Team alias: https://khush-project-moti-sanjay-ms-projects.vercel.app

  ### Current Validation Snapshot (April 12, 2026)

  - `npm run build`: pass
  - Production dependency audit (`npm audit --omit=dev`): pass (0 vulnerabilities)
  - Auth UX: modernized OTP login and signup screens with unchanged backend flow
  - Supabase OTP flow: configured in code with redirect support via `VITE_SITE_URL`/origin fallback

  ## Bootstrap OTP accounts

  For initial environment bootstrap, use these OTP users:

  - Owner: `owner.demo@pgmanager.app`
  - Tenant: `tenant.demo@pgmanager.app`
  - Admin: `admin.demo@pgmanager.app`

  OTP is delivered by Supabase Email auth, so there is no password to store in code.
  