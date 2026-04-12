-- Demo seed (admin role link).
-- Prerequisite: login once with admin.demo@pgmanager.app so profile exists.

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id
  INTO admin_user_id
  FROM auth.users
  WHERE lower(email) = lower('admin.demo@pgmanager.app')
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Admin auth user not found. Skipping admin link seed. Create admin.demo@pgmanager.app to enable admin login seed.';
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role, pg_name, city)
  VALUES (
    admin_user_id,
    'admin.demo@pgmanager.app',
    'Demo Admin',
    '+919876500301',
    'admin',
    'Platform Admin Console',
    'Bengaluru'
  )
  ON CONFLICT (id)
  DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    pg_name = EXCLUDED.pg_name,
    city = EXCLUDED.city,
    updated_at = now();

  UPDATE public.profiles
  SET
    role = 'admin',
    full_name = coalesce(nullif(full_name, ''), 'Demo Admin'),
    phone = coalesce(nullif(phone, ''), '+919876500301'),
    pg_name = coalesce(nullif(pg_name, ''), 'Platform Admin Console'),
    city = coalesce(nullif(city, ''), 'Bengaluru'),
    updated_at = now()
  WHERE id = admin_user_id;

  RAISE NOTICE 'Admin profile configured for auth user id %', admin_user_id;
END
$$;
