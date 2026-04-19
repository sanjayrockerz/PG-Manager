-- Additional synthetic demo data for owner.demo@pgmanager.app
-- Run this after seed_demo_owner.sql if you want richer UI data.

DO $$
DECLARE
  owner_user_id uuid;

  property_hsr_id uuid := '11111111-1111-4111-8111-111111111112';
  property_kor_id uuid := '11111111-1111-4111-8111-111111111113';

  room_hsr_101_id uuid := '22222222-2222-4222-8222-222222222301';
  room_hsr_102_id uuid := '22222222-2222-4222-8222-222222222302';
  room_hsr_201_id uuid := '22222222-2222-4222-8222-222222222303';

  room_kor_001_id uuid := '22222222-2222-4222-8222-222222222401';
  room_kor_002_id uuid := '22222222-2222-4222-8222-222222222402';
  room_kor_101_id uuid := '22222222-2222-4222-8222-222222222403';

  tenant_meera_id uuid := '33333333-3333-4333-8333-333333333401';
  tenant_karan_id uuid := '33333333-3333-4333-8333-333333333402';
  tenant_nisha_id uuid := '33333333-3333-4333-8333-333333333403';
  tenant_rohan_id uuid := '33333333-3333-4333-8333-333333333404';
BEGIN
  SELECT id
  INTO owner_user_id
  FROM auth.users
  WHERE lower(email) = lower('owner.demo@pgmanager.app')
  LIMIT 1;

  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Owner auth user not found. Create/login owner.demo@pgmanager.app first.';
  END IF;

  INSERT INTO public.properties (
    id,
    owner_id,
    name,
    address,
    city,
    state,
    pincode,
    floors,
    total_rooms,
    contact_name,
    contact_phone,
    contact_email,
    address_line1,
    locality,
    landmark,
    formatted_address
  )
  VALUES
    (
      property_hsr_id,
      owner_user_id,
      'Sunrise Habitat - HSR',
      '42, 19th Main Road, Sector 4, HSR Layout',
      'Bengaluru',
      'Karnataka',
      '560102',
      3,
      3,
      'Nikhil Reddy',
      '9845012345',
      'hsr.manager@khushliving.com',
      '42, 19th Main Road',
      'HSR Layout Sector 4',
      'Near BDA Complex',
      '42, 19th Main Road, Sector 4, HSR Layout, Bengaluru, Karnataka 560102'
    ),
    (
      property_kor_id,
      owner_user_id,
      'City Nest - Koramangala',
      '17, 5th Block, Koramangala',
      'Bengaluru',
      'Karnataka',
      '560095',
      2,
      3,
      'Ananya Rao',
      '9900123456',
      'kor.manager@khushliving.com',
      '17, 5th Block',
      'Koramangala',
      'Near Jyoti Nivas College',
      '17, 5th Block, Koramangala, Bengaluru, Karnataka 560095'
    )
  ON CONFLICT (id)
  DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    pincode = EXCLUDED.pincode,
    floors = EXCLUDED.floors,
    total_rooms = EXCLUDED.total_rooms,
    contact_name = EXCLUDED.contact_name,
    contact_phone = EXCLUDED.contact_phone,
    contact_email = EXCLUDED.contact_email,
    address_line1 = EXCLUDED.address_line1,
    locality = EXCLUDED.locality,
    landmark = EXCLUDED.landmark,
    formatted_address = EXCLUDED.formatted_address,
    updated_at = now();

  INSERT INTO public.rooms (
    id,
    property_id,
    number,
    floor,
    type,
    beds,
    rent,
    status,
    occupied_beds,
    tenant_id
  )
  VALUES
    (room_hsr_101_id, property_hsr_id, '101', 1, 'double', 2, 12500, 'occupied', 1, tenant_meera_id),
    (room_hsr_102_id, property_hsr_id, '102', 1, 'double', 2, 11800, 'occupied', 1, tenant_karan_id),
    (room_hsr_201_id, property_hsr_id, '201', 2, 'single', 1, 14500, 'vacant', 0, null),

    (room_kor_001_id, property_kor_id, '001', 0, 'single', 1, 13200, 'occupied', 1, tenant_nisha_id),
    (room_kor_002_id, property_kor_id, '002', 0, 'double', 2, 11200, 'occupied', 1, tenant_rohan_id),
    (room_kor_101_id, property_kor_id, '101', 1, 'triple', 3, 9800, 'vacant', 0, null)
  ON CONFLICT (id)
  DO UPDATE SET
    property_id = EXCLUDED.property_id,
    number = EXCLUDED.number,
    floor = EXCLUDED.floor,
    type = EXCLUDED.type,
    beds = EXCLUDED.beds,
    rent = EXCLUDED.rent,
    status = EXCLUDED.status,
    occupied_beds = EXCLUDED.occupied_beds,
    tenant_id = EXCLUDED.tenant_id,
    updated_at = now();

  INSERT INTO public.tenants (
    id,
    owner_id,
    property_id,
    name,
    phone,
    email,
    floor,
    room,
    bed,
    monthly_rent,
    security_deposit,
    rent_due_date,
    parent_name,
    parent_phone,
    id_type,
    id_number,
    join_date,
    status
  )
  VALUES
    (
      tenant_meera_id,
      owner_user_id,
      property_hsr_id,
      'Meera Sharma',
      '+919988776655',
      'meera.sharma.demo@pgmanager.app',
      1,
      '101',
      '1',
      12500,
      25000,
      5,
      'Sanjay Sharma',
      '+919988776601',
      'Aadhaar',
      '987654321012',
      current_date - interval '75 day',
      'active'
    ),
    (
      tenant_karan_id,
      owner_user_id,
      property_hsr_id,
      'Karan Malhotra',
      '+919876501234',
      'karan.m.demo@pgmanager.app',
      1,
      '102',
      '1',
      11800,
      23600,
      7,
      'Rakesh Malhotra',
      '+919876501200',
      'PAN',
      'ABCDE1234F',
      current_date - interval '48 day',
      'active'
    ),
    (
      tenant_nisha_id,
      owner_user_id,
      property_kor_id,
      'Nisha Verma',
      '+919812304567',
      'nisha.v.demo@pgmanager.app',
      0,
      '001',
      '1',
      13200,
      26400,
      3,
      'Mahesh Verma',
      '+919812304500',
      'Passport',
      'Z3456789',
      current_date - interval '96 day',
      'active'
    ),
    (
      tenant_rohan_id,
      owner_user_id,
      property_kor_id,
      'Rohan Dsouza',
      '+919765401234',
      'rohan.d.demo@pgmanager.app',
      0,
      '002',
      '2',
      11200,
      20000,
      10,
      'Anthony Dsouza',
      '+919765401200',
      'Driving License',
      'KA05-20240011234',
      current_date - interval '32 day',
      'active'
    )
  ON CONFLICT (id)
  DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    property_id = EXCLUDED.property_id,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    floor = EXCLUDED.floor,
    room = EXCLUDED.room,
    bed = EXCLUDED.bed,
    monthly_rent = EXCLUDED.monthly_rent,
    security_deposit = EXCLUDED.security_deposit,
    rent_due_date = EXCLUDED.rent_due_date,
    parent_name = EXCLUDED.parent_name,
    parent_phone = EXCLUDED.parent_phone,
    id_type = EXCLUDED.id_type,
    id_number = EXCLUDED.id_number,
    join_date = EXCLUDED.join_date,
    status = EXCLUDED.status,
    updated_at = now();

  UPDATE public.rooms SET tenant_id = tenant_meera_id, occupied_beds = 1, status = 'occupied' WHERE id = room_hsr_101_id;
  UPDATE public.rooms SET tenant_id = tenant_karan_id, occupied_beds = 1, status = 'occupied' WHERE id = room_hsr_102_id;
  UPDATE public.rooms SET tenant_id = tenant_nisha_id, occupied_beds = 1, status = 'occupied' WHERE id = room_kor_001_id;
  UPDATE public.rooms SET tenant_id = tenant_rohan_id, occupied_beds = 1, status = 'occupied' WHERE id = room_kor_002_id;
END
$$;
