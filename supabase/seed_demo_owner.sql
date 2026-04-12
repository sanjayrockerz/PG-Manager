-- Demo seed (owner app data only).
-- Prerequisite: create/sign in with owner.demo@pgmanager.app once so a profile exists.

DO $$
DECLARE
  owner_user_id uuid;

  property_id uuid := '11111111-1111-4111-8111-111111111111';

  room_101_id uuid := '22222222-2222-4222-8222-222222222101';
  room_102_id uuid := '22222222-2222-4222-8222-222222222102';
  room_201_id uuid := '22222222-2222-4222-8222-222222222201';
  room_202_id uuid := '22222222-2222-4222-8222-222222222202';

  tenant_aarav_id uuid := '33333333-3333-4333-8333-333333333301';
  tenant_riya_id uuid := '33333333-3333-4333-8333-333333333302';

  payment_aarav_current_id uuid := '44444444-4444-4444-8444-444444444401';
  payment_aarav_prev_id uuid := '44444444-4444-4444-8444-444444444402';
  payment_riya_current_id uuid := '44444444-4444-4444-8444-444444444403';

  ticket_aarav_id uuid := '55555555-5555-4555-8555-555555555501';
  ticket_riya_id uuid := '55555555-5555-4555-8555-555555555502';

  note_1_id uuid := '66666666-6666-4666-8666-666666666601';
  note_2_id uuid := '66666666-6666-4666-8666-666666666602';

  ann_1_id uuid := '77777777-7777-4777-8777-777777777701';
  ann_2_id uuid := '77777777-7777-4777-8777-777777777702';
  ann_3_id uuid := '77777777-7777-4777-8777-777777777703';

  notif_1_id uuid := '88888888-8888-4888-8888-888888888801';
  notif_2_id uuid := '88888888-8888-4888-8888-888888888802';
  notif_3_id uuid := '88888888-8888-4888-8888-888888888803';
  notif_4_id uuid := '88888888-8888-4888-8888-888888888804';

  current_due_date date := (date_trunc('month', current_date) + interval '4 day')::date;
  previous_due_date date := (date_trunc('month', current_date) - interval '1 month' + interval '4 day')::date;
  previous_paid_date date := (date_trunc('month', current_date) - interval '1 month' + interval '2 day')::date;
BEGIN
  SELECT id
  INTO owner_user_id
  FROM auth.users
  WHERE lower(email) = lower('owner.demo@pgmanager.app')
  LIMIT 1;

  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Owner auth user not found. Create/login owner.demo@pgmanager.app first.';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role, pg_name, city)
  VALUES (
    owner_user_id,
    'owner.demo@pgmanager.app',
    'Demo Owner',
    '+919876500001',
    'owner',
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
    role = 'owner',
    full_name = 'Demo Owner',
    phone = '+919876500001',
    pg_name = 'Khush Living',
    city = 'Bengaluru',
    updated_at = now()
  WHERE id = owner_user_id;

  INSERT INTO public.owner_settings (owner_id, pg_rules, whatsapp_settings)
  VALUES (
    owner_user_id,
    '["Rent due by 5th of every month", "No loud noise after 10 PM", "Visitors allowed only in common area"]'::jsonb,
    jsonb_build_object(
      'welcomeMessage', jsonb_build_object('enabled', true, 'template', 'Welcome to {{pgName}}, {{tenantName}}.'),
      'rentReminder', jsonb_build_object('enabled', true, 'daysBeforeDue', 3, 'template', 'Rent reminder: {{amount}} due on {{dueDate}}.'),
      'paymentConfirmation', jsonb_build_object('enabled', true, 'template', 'Payment of {{amount}} received. Thank you!'),
      'complaintUpdate', jsonb_build_object('enabled', true, 'notifyOnCreate', true, 'notifyOnProgress', true, 'notifyOnResolve', true)
    )
  )
  ON CONFLICT (owner_id)
  DO UPDATE SET
    pg_rules = EXCLUDED.pg_rules,
    whatsapp_settings = EXCLUDED.whatsapp_settings,
    updated_at = now();

  DELETE FROM public.notifications WHERE owner_id = owner_user_id;
  DELETE FROM public.maintenance_notes
  WHERE ticket_id IN (
    SELECT id FROM public.maintenance_tickets WHERE owner_id = owner_user_id
  );
  DELETE FROM public.maintenance_tickets WHERE owner_id = owner_user_id;
  DELETE FROM public.payment_charges
  WHERE payment_id IN (
    SELECT id FROM public.payments WHERE owner_id = owner_user_id
  );
  DELETE FROM public.payments WHERE owner_id = owner_user_id;
  DELETE FROM public.tenants WHERE owner_id = owner_user_id;
  DELETE FROM public.rooms room
  WHERE room.property_id IN (
    SELECT property.id FROM public.properties property WHERE property.owner_id = owner_user_id
  );
  DELETE FROM public.announcements WHERE owner_id = owner_user_id;
  DELETE FROM public.properties WHERE owner_id = owner_user_id;

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
    contact_email
  )
  VALUES (
    property_id,
    owner_user_id,
    'Khush Living - Indiranagar',
    '12, 4th Main Road, Indiranagar',
    'Bengaluru',
    'Karnataka',
    '560038',
    2,
    4,
    'Demo Owner',
    '+919876500001',
    'owner.demo@pgmanager.app'
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
    (room_101_id, property_id, '101', 1, 'double', 2, 9500, 'occupied', 1, tenant_aarav_id),
    (room_102_id, property_id, '102', 1, 'double', 2, 9000, 'vacant', 0, null),
    (room_201_id, property_id, '201', 2, 'single', 1, 11000, 'occupied', 1, tenant_riya_id),
    (room_202_id, property_id, '202', 2, 'triple', 3, 8000, 'maintenance', 0, null)
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
      tenant_aarav_id,
      owner_user_id,
      property_id,
      'Aarav Singh',
      '+919876500101',
      'tenant.demo@pgmanager.app',
      1,
      '101',
      'A1',
      9500,
      19000,
      5,
      'Suresh Singh',
      '+919876500102',
      'Aadhaar',
      '1234-5678-9012',
      current_date - interval '50 day',
      'active'
    ),
    (
      tenant_riya_id,
      owner_user_id,
      property_id,
      'Riya Nair',
      '+919876500201',
      'riya.nair.demo@pgmanager.app',
      2,
      '201',
      'B1',
      11000,
      22000,
      5,
      'Pradeep Nair',
      '+919876500202',
      'Passport',
      'M3456789',
      current_date - interval '95 day',
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

  -- Trigger creates initial payments on tenant insert; replace with deterministic demo rows.
  DELETE FROM public.payment_charges
  WHERE payment_id IN (
    SELECT id FROM public.payments WHERE owner_id = owner_user_id
  );
  DELETE FROM public.payments WHERE owner_id = owner_user_id;

  INSERT INTO public.payments (
    id,
    owner_id,
    tenant_id,
    property_id,
    tenant_name,
    room,
    monthly_rent,
    extra_charges,
    total_amount,
    due_date,
    paid_date,
    status
  )
  VALUES
    (
      payment_aarav_current_id,
      owner_user_id,
      tenant_aarav_id,
      property_id,
      'Aarav Singh',
      '101',
      9500,
      500,
      10000,
      current_due_date,
      null,
      'pending'
    ),
    (
      payment_aarav_prev_id,
      owner_user_id,
      tenant_aarav_id,
      property_id,
      'Aarav Singh',
      '101',
      9500,
      0,
      9500,
      previous_due_date,
      previous_paid_date,
      'paid'
    ),
    (
      payment_riya_current_id,
      owner_user_id,
      tenant_riya_id,
      property_id,
      'Riya Nair',
      '201',
      11000,
      1000,
      12000,
      current_due_date,
      null,
      'overdue'
    )
  ON CONFLICT (id)
  DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    tenant_id = EXCLUDED.tenant_id,
    property_id = EXCLUDED.property_id,
    tenant_name = EXCLUDED.tenant_name,
    room = EXCLUDED.room,
    monthly_rent = EXCLUDED.monthly_rent,
    extra_charges = EXCLUDED.extra_charges,
    total_amount = EXCLUDED.total_amount,
    due_date = EXCLUDED.due_date,
    paid_date = EXCLUDED.paid_date,
    status = EXCLUDED.status,
    updated_at = now();

  INSERT INTO public.payment_charges (id, payment_id, type, custom_type, description, amount)
  VALUES
    ('99999999-9999-4999-8999-999999999901', payment_aarav_current_id, 'maintenance', null, 'AC servicing charge', 500),
    ('99999999-9999-4999-8999-999999999902', payment_riya_current_id, 'electricity', null, 'Extra electricity usage', 1000)
  ON CONFLICT (id)
  DO UPDATE SET
    payment_id = EXCLUDED.payment_id,
    type = EXCLUDED.type,
    custom_type = EXCLUDED.custom_type,
    description = EXCLUDED.description,
    amount = EXCLUDED.amount;

  UPDATE public.payments payment
  SET
    extra_charges = coalesce((
      SELECT sum(charge.amount) FROM public.payment_charges charge WHERE charge.payment_id = payment.id
    ), 0),
    total_amount = payment.monthly_rent + coalesce((
      SELECT sum(charge.amount) FROM public.payment_charges charge WHERE charge.payment_id = payment.id
    ), 0),
    updated_at = now()
  WHERE payment.owner_id = owner_user_id;

  INSERT INTO public.maintenance_tickets (
    id,
    owner_id,
    tenant_id,
    tenant,
    property_id,
    room,
    issue,
    description,
    source,
    status,
    priority,
    phone,
    date
  )
  VALUES
    (
      ticket_aarav_id,
      owner_user_id,
      tenant_aarav_id,
      'Aarav Singh',
      property_id,
      '101',
      'AC not cooling',
      'Room AC is running but not cooling enough since last night.',
      'manual',
      'in-progress',
      'high',
      '+919876500101',
      current_date - interval '3 day'
    ),
    (
      ticket_riya_id,
      owner_user_id,
      tenant_riya_id,
      'Riya Nair',
      property_id,
      '201',
      'Bathroom tap leaking',
      'Leak from sink tap, needs washer replacement.',
      'manual',
      'open',
      'medium',
      '+919876500201',
      current_date - interval '1 day'
    )
  ON CONFLICT (id)
  DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    tenant_id = EXCLUDED.tenant_id,
    tenant = EXCLUDED.tenant,
    property_id = EXCLUDED.property_id,
    room = EXCLUDED.room,
    issue = EXCLUDED.issue,
    description = EXCLUDED.description,
    source = EXCLUDED.source,
    status = EXCLUDED.status,
    priority = EXCLUDED.priority,
    phone = EXCLUDED.phone,
    date = EXCLUDED.date,
    updated_at = now();

  INSERT INTO public.maintenance_notes (id, ticket_id, note)
  VALUES
    (note_1_id, ticket_aarav_id, 'Technician assigned and visit scheduled by 4 PM.'),
    (note_2_id, ticket_aarav_id, 'Compressor check completed. Gas refill in progress.')
  ON CONFLICT (id)
  DO UPDATE SET
    ticket_id = EXCLUDED.ticket_id,
    note = EXCLUDED.note;

  INSERT INTO public.announcements (
    id,
    owner_id,
    property_id,
    title,
    content,
    date,
    category,
    is_pinned,
    views,
    sent_via_whatsapp
  )
  VALUES
    (
      ann_1_id,
      owner_user_id,
      property_id,
      'Water Tank Cleaning Schedule',
      'Water supply will be paused on Sunday from 10 AM to 1 PM for tank cleaning.',
      current_date,
      'maintenance',
      true,
      28,
      true
    ),
    (
      ann_2_id,
      owner_user_id,
      property_id,
      'Rent Reminder',
      'Please clear this month rent before 5th to avoid overdue status.',
      current_date - interval '2 day',
      'payment',
      true,
      34,
      true
    ),
    (
      ann_3_id,
      owner_user_id,
      null,
      'Common Area Cleanliness',
      'Keep kitchen and lounge clean after use. Repeated violations may attract fines.',
      current_date - interval '5 day',
      'rules',
      false,
      19,
      false
    )
  ON CONFLICT (id)
  DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    property_id = EXCLUDED.property_id,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    date = EXCLUDED.date,
    category = EXCLUDED.category,
    is_pinned = EXCLUDED.is_pinned,
    views = EXCLUDED.views,
    sent_via_whatsapp = EXCLUDED.sent_via_whatsapp,
    updated_at = now();

  INSERT INTO public.notifications (id, owner_id, type, title, message, read)
  VALUES
    (notif_1_id, owner_user_id, 'tenant', 'Tenant Added', 'Aarav Singh was added to Room 101.', false),
    (notif_2_id, owner_user_id, 'payment', 'Payment Pending', 'Aarav Singh has Rs 10,000 due this month.', false),
    (notif_3_id, owner_user_id, 'maintenance', 'Complaint Raised', 'Riya Nair reported a bathroom issue in Room 201.', false),
    (notif_4_id, owner_user_id, 'announcement', 'Announcement Published', 'Water tank cleaning notice has been posted.', true)
  ON CONFLICT (id)
  DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    type = EXCLUDED.type,
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    read = EXCLUDED.read;

  RAISE NOTICE 'Demo owner data seeded for owner id %', owner_user_id;
END
$$;
