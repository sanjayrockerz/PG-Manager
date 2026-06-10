-- Platform admin bootstrap.
-- Creates a single platform_admin auth user + profile if none exists yet.
-- Idempotent: skips entirely when any profile already has a platform-admin role
-- (platform_admin / admin / super_admin).
--
-- Default credentials (CHANGE THE PASSWORD AFTER FIRST LOGIN):
--   email:    admin@rentcare.com
--   password: RentCare#Admin2026!
--
-- Prefer running `npm run bootstrap:admin` instead, which uses the Supabase
-- Admin API (requires SUPABASE_SERVICE_ROLE_KEY) and is the supported path for
-- hosted projects where direct auth.users writes may be restricted. This
-- migration exists as a fallback for environments with direct DB access
-- (e.g. local Supabase / self-hosted).

DO $$
DECLARE
  existing_count int;
  admin_id uuid;
  default_email text := 'admin@rentcare.com';
  default_password text := 'RentCare#Admin2026!';
BEGIN
  SELECT count(*) INTO existing_count
  FROM public.profiles
  WHERE role IN ('platform_admin', 'admin', 'super_admin');

  IF existing_count > 0 THEN
    RAISE NOTICE 'Platform admin already present (% profile(s) found). Skipping bootstrap.', existing_count;
    RETURN;
  END IF;

  SELECT id INTO admin_id FROM auth.users WHERE lower(email) = lower(default_email) LIMIT 1;

  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id, 'authenticated', 'authenticated',
      default_email,
      crypt(default_password, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}', '{}',
      now(), now(), '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), admin_id, admin_id::text,
      jsonb_build_object('sub', admin_id::text, 'email', default_email),
      'email', now(), now(), now()
    );
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, pg_name, city)
  VALUES (admin_id, default_email, 'Platform Administrator', 'platform_admin', 'Platform Admin Console', 'Bengaluru')
  ON CONFLICT (id) DO UPDATE SET
    role = 'platform_admin',
    email = EXCLUDED.email,
    updated_at = now();

  RAISE NOTICE 'Bootstrapped platform admin % (auth user id=%)', default_email, admin_id;
END
$$;
