-- Tenant auth-link seed step.
-- Prerequisite:
-- 1) Run seed_demo_owner.sql first.
-- 2) Create/login tenant.demo@pgmanager.app once so profile exists.

DO $$
DECLARE
  owner_user_id uuid;
  tenant_user_id uuid;

  seed_property_id uuid := '11111111-1111-4111-8111-111111111111';
  seed_room_101_id uuid := '22222222-2222-4222-8222-222222222101';
  seed_tenant_aarav_id uuid := '33333333-3333-4333-8333-333333333301';

  seed_payment_aarav_current_id uuid := '44444444-4444-4444-8444-444444444401';
  seed_payment_aarav_prev_id uuid := '44444444-4444-4444-8444-444444444402';
BEGIN
  SELECT id
  INTO owner_user_id
  FROM public.profiles
  WHERE lower(email) = lower('owner.demo@pgmanager.app')
  LIMIT 1;

  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Owner profile not found. Run owner auth/login first.';
  END IF;

  SELECT id
  INTO tenant_user_id
  FROM auth.users
  WHERE lower(email) = lower('tenant.demo@pgmanager.app')
  LIMIT 1;

  IF tenant_user_id IS NULL THEN
    RAISE EXCEPTION 'Tenant auth user not found. Create tenant.demo@pgmanager.app first.';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role, pg_name, city)
  VALUES (
    tenant_user_id,
    'tenant.demo@pgmanager.app',
    'Aarav Singh',
    '+919876500101',
    'tenant',
    'Khush Living',
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
    role = 'tenant',
    full_name = 'Aarav Singh',
    phone = '+919876500101',
    pg_name = 'Khush Living',
    city = 'Bengaluru',
    updated_at = now()
  WHERE id = tenant_user_id;

  UPDATE public.tenants
  SET
    owner_id = owner_user_id,
    property_id = seed_property_id,
    name = 'Aarav Singh',
    email = 'tenant.demo@pgmanager.app',
    phone = '+919876500101',
    room = '101',
    bed = 'A1',
    floor = 1,
    status = 'active',
    updated_at = now()
  WHERE id = seed_tenant_aarav_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seeded tenant row not found. Run seed_demo_owner.sql first.';
  END IF;

  UPDATE public.rooms
  SET
    tenant_id = seed_tenant_aarav_id,
    status = 'occupied',
    occupied_beds = greatest(occupied_beds, 1),
    updated_at = now()
  WHERE id = seed_room_101_id;

  UPDATE public.payments
  SET
    tenant_id = seed_tenant_aarav_id,
    tenant_name = 'Aarav Singh',
    property_id = seed_property_id,
    room = '101',
    updated_at = now()
  WHERE id IN (seed_payment_aarav_current_id, seed_payment_aarav_prev_id);

  UPDATE public.maintenance_tickets
  SET
    tenant_id = seed_tenant_aarav_id,
    tenant = 'Aarav Singh',
    property_id = seed_property_id,
    room = '101',
    phone = '+919876500101',
    updated_at = now()
  WHERE owner_id = owner_user_id
    AND tenant = 'Aarav Singh';

  RAISE NOTICE 'Tenant profile linked to seeded tenant id % (auth user id %)', seed_tenant_aarav_id, tenant_user_id;
END
$$;
