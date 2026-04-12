-- PG SaaS base schema (SQL-editor safe).
-- This file intentionally avoids ownership-restricted operations on
-- auth.users, storage.objects, and publication management.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  role text not null default 'owner' check (role in ('owner', 'admin', 'tenant', 'super_admin')),
  pg_name text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.owner_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  pg_rules jsonb not null default '[]'::jsonb,
  whatsapp_settings jsonb not null default jsonb_build_object(
    'welcomeMessage', jsonb_build_object('enabled', true, 'template', 'Welcome to {{pgName}}, {{tenantName}}.'),
    'rentReminder', jsonb_build_object('enabled', true, 'daysBeforeDue', 3, 'template', 'Rent reminder for {{month}}.'),
    'paymentConfirmation', jsonb_build_object('enabled', true, 'template', 'Payment received for {{month}}.'),
    'complaintUpdate', jsonb_build_object('enabled', true, 'notifyOnCreate', true, 'notifyOnProgress', true, 'notifyOnResolve', true)
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  address text not null,
  city text not null,
  state text not null,
  pincode text not null,
  floors int not null check (floors > 0),
  total_rooms int not null default 0,
  contact_name text not null,
  contact_phone text not null,
  contact_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  number text not null,
  floor int not null,
  type text not null check (type in ('single', 'double', 'triple')),
  beds int not null check (beds > 0),
  rent numeric(12,2) not null default 0,
  status text not null check (status in ('occupied', 'vacant', 'maintenance')),
  occupied_beds int not null default 0,
  tenant_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  phone text not null,
  email text not null,
  photo_url text,
  floor int not null,
  room text not null,
  bed text not null,
  monthly_rent numeric(12,2) not null,
  security_deposit numeric(12,2) not null default 0,
  rent_due_date int not null check (rent_due_date between 1 and 31),
  parent_name text not null,
  parent_phone text not null,
  id_type text not null,
  id_number text not null,
  id_document_url text,
  join_date date not null,
  status text not null check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  tenant_name text not null,
  room text not null,
  monthly_rent numeric(12,2) not null,
  extra_charges numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null,
  due_date date not null,
  paid_date date,
  status text not null check (status in ('paid', 'pending', 'overdue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_charges (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  type text not null,
  custom_type text,
  description text,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid,
  tenant text not null,
  property_id uuid not null references public.properties(id) on delete cascade,
  room text not null,
  issue text not null,
  description text not null,
  source text not null check (source in ('whatsapp', 'manual')),
  status text not null check (status in ('open', 'in-progress', 'resolved')),
  priority text not null check (priority in ('low', 'medium', 'high')),
  phone text,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maintenance_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  title text not null,
  content text not null,
  date date not null default current_date,
  category text not null check (category in ('maintenance', 'payment', 'rules', 'general')),
  is_pinned boolean not null default false,
  views int not null default 0,
  sent_via_whatsapp boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('payment', 'maintenance', 'tenant', 'announcement')),
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- NOTE:
-- Realtime publication setup is done in Supabase Dashboard (Database > Replication)
-- to avoid ownership errors from ALTER PUBLICATION in standard project workflows.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb;
  owner_settings_exists boolean;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  insert into public.profiles (id, email, full_name, phone, role, pg_name, city)
  values (
    new.id,
    new.email,
    coalesce(metadata ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    metadata ->> 'phone',
    coalesce(metadata ->> 'role', 'owner'),
    metadata ->> 'pgName',
    metadata ->> 'city'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    pg_name = coalesce(excluded.pg_name, public.profiles.pg_name),
    city = coalesce(excluded.city, public.profiles.city),
    updated_at = now();

  select exists (
    select 1 from public.owner_settings where owner_id = new.id
  ) into owner_settings_exists;

  if not owner_settings_exists then
    insert into public.owner_settings (owner_id)
    values (new.id);
  end if;

  return new;
end;
$$;

-- NOTE:
-- Trigger on auth.users is ownership-sensitive in some Supabase setups.
-- Create this trigger as a post-setup step only if your project role allows it.

create or replace function public.create_initial_payment_for_tenant()
returns trigger
language plpgsql
as $$
declare
  due_date_value date;
begin
  due_date_value := make_date(extract(year from current_date)::int, extract(month from current_date)::int, greatest(1, least(31, new.rent_due_date)));

  insert into public.payments (
    owner_id,
    tenant_id,
    property_id,
    tenant_name,
    room,
    monthly_rent,
    extra_charges,
    total_amount,
    due_date,
    status
  )
  values (
    new.owner_id,
    new.id,
    new.property_id,
    new.name,
    new.room,
    new.monthly_rent,
    0,
    new.monthly_rent,
    due_date_value,
    'pending'
  );

  return new;
end;
$$;

drop trigger if exists create_initial_payment_after_tenant_insert on public.tenants;
create trigger create_initial_payment_after_tenant_insert
after insert on public.tenants
for each row execute procedure public.create_initial_payment_for_tenant();

create or replace function public.sync_payment_totals_after_charge()
returns trigger
language plpgsql
as $$
begin
  update public.payments
  set
    extra_charges = coalesce((select sum(amount) from public.payment_charges where payment_id = new.payment_id), 0),
    total_amount = monthly_rent + coalesce((select sum(amount) from public.payment_charges where payment_id = new.payment_id), 0),
    updated_at = now()
  where id = new.payment_id;

  return new;
end;
$$;

drop trigger if exists sync_payment_totals_on_charge_insert on public.payment_charges;
create trigger sync_payment_totals_on_charge_insert
after insert on public.payment_charges
for each row execute procedure public.sync_payment_totals_after_charge();

-- Updated-at triggers
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();

drop trigger if exists owner_settings_updated_at on public.owner_settings;
create trigger owner_settings_updated_at before update on public.owner_settings for each row execute procedure public.set_updated_at();

drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at before update on public.properties for each row execute procedure public.set_updated_at();

drop trigger if exists rooms_updated_at on public.rooms;
create trigger rooms_updated_at before update on public.rooms for each row execute procedure public.set_updated_at();

drop trigger if exists tenants_updated_at on public.tenants;
create trigger tenants_updated_at before update on public.tenants for each row execute procedure public.set_updated_at();

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments for each row execute procedure public.set_updated_at();

drop trigger if exists maintenance_tickets_updated_at on public.maintenance_tickets;
create trigger maintenance_tickets_updated_at before update on public.maintenance_tickets for each row execute procedure public.set_updated_at();

drop trigger if exists announcements_updated_at on public.announcements;
create trigger announcements_updated_at before update on public.announcements for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.owner_settings enable row level security;
alter table public.properties enable row level security;
alter table public.rooms enable row level security;
alter table public.tenants enable row level security;
alter table public.payments enable row level security;
alter table public.payment_charges enable row level security;
alter table public.maintenance_tickets enable row level security;
alter table public.maintenance_notes enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'super_admin'), false);
$$;

create or replace function public.current_user_is_tenant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'tenant', false);
$$;

create or replace function public.current_user_matches_tenant(tenant_email text, tenant_phone text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'tenant'
      and (
        (coalesce(profile.email, '') <> '' and lower(profile.email) = lower(coalesce(tenant_email, '')))
        or (coalesce(profile.phone, '') <> '' and profile.phone = coalesce(tenant_phone, ''))
      )
  );
$$;

drop policy if exists profiles_owner_select on public.profiles;
drop policy if exists profiles_owner_update on public.profiles;
drop policy if exists profiles_self_insert on public.profiles;
drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_admin_select on public.profiles;
drop policy if exists profiles_anon_read_all on public.profiles;

create policy profiles_self_insert on public.profiles
for insert
with check (auth.uid() = id);

create policy profiles_self_select on public.profiles
for select
using (auth.uid() = id or public.current_user_is_admin());

create policy profiles_self_update on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists owner_settings_owner_all on public.owner_settings;
drop policy if exists owner_settings_admin_all on public.owner_settings;
drop policy if exists owner_settings_anon_all on public.owner_settings;
create policy owner_settings_owner_all on public.owner_settings
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy owner_settings_admin_all on public.owner_settings
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists properties_owner_all on public.properties;
drop policy if exists properties_admin_all on public.properties;
drop policy if exists properties_tenant_select on public.properties;
drop policy if exists properties_anon_all on public.properties;
create policy properties_owner_all on public.properties
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy properties_admin_all on public.properties
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy properties_tenant_select on public.properties
for select
using (
  exists (
    select 1
    from public.tenants tenant
    where tenant.property_id = properties.id
      and public.current_user_matches_tenant(tenant.email, tenant.phone)
  )
);

drop policy if exists rooms_owner_all on public.rooms;
drop policy if exists rooms_admin_all on public.rooms;
drop policy if exists rooms_tenant_select on public.rooms;
drop policy if exists rooms_anon_all on public.rooms;
create policy rooms_owner_all on public.rooms
for all
using (
  exists (
    select 1 from public.properties property
    where property.id = rooms.property_id
      and property.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.properties property
    where property.id = rooms.property_id
      and property.owner_id = auth.uid()
  )
);

create policy rooms_admin_all on public.rooms
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy rooms_tenant_select on public.rooms
for select
using (
  exists (
    select 1
    from public.tenants tenant
    join public.properties property on property.id = tenant.property_id
    where property.id = rooms.property_id
      and public.current_user_matches_tenant(tenant.email, tenant.phone)
  )
);

drop policy if exists tenants_owner_all on public.tenants;
drop policy if exists tenants_admin_all on public.tenants;
drop policy if exists tenants_tenant_select on public.tenants;
drop policy if exists tenants_anon_all on public.tenants;
create policy tenants_owner_all on public.tenants
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy tenants_admin_all on public.tenants
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy tenants_tenant_select on public.tenants
for select
using (public.current_user_matches_tenant(email, phone));

drop policy if exists payments_owner_all on public.payments;
drop policy if exists payments_admin_all on public.payments;
drop policy if exists payments_tenant_select on public.payments;
drop policy if exists payments_anon_all on public.payments;
create policy payments_owner_all on public.payments
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy payments_admin_all on public.payments
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy payments_tenant_select on public.payments
for select
using (
  exists (
    select 1
    from public.tenants tenant
    where tenant.id = payments.tenant_id
      and public.current_user_matches_tenant(tenant.email, tenant.phone)
  )
);

drop policy if exists payment_charges_owner_all on public.payment_charges;
drop policy if exists payment_charges_admin_all on public.payment_charges;
drop policy if exists payment_charges_tenant_select on public.payment_charges;
drop policy if exists payment_charges_anon_all on public.payment_charges;
create policy payment_charges_owner_all on public.payment_charges
for all
using (
  exists (
    select 1
    from public.payments payment
    where payment.id = payment_charges.payment_id
      and payment.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.payments payment
    where payment.id = payment_charges.payment_id
      and payment.owner_id = auth.uid()
  )
);

create policy payment_charges_admin_all on public.payment_charges
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy payment_charges_tenant_select on public.payment_charges
for select
using (
  exists (
    select 1
    from public.payments payment
    join public.tenants tenant on tenant.id = payment.tenant_id
    where payment.id = payment_charges.payment_id
      and public.current_user_matches_tenant(tenant.email, tenant.phone)
  )
);

drop policy if exists maintenance_owner_all on public.maintenance_tickets;
drop policy if exists maintenance_admin_all on public.maintenance_tickets;
drop policy if exists maintenance_tenant_select on public.maintenance_tickets;
drop policy if exists maintenance_tenant_insert on public.maintenance_tickets;
drop policy if exists maintenance_tickets_anon_all on public.maintenance_tickets;
create policy maintenance_owner_all on public.maintenance_tickets
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy maintenance_admin_all on public.maintenance_tickets
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy maintenance_tenant_select on public.maintenance_tickets
for select
using (
  exists (
    select 1
    from public.tenants tenant
    where tenant.id = maintenance_tickets.tenant_id
      and public.current_user_matches_tenant(tenant.email, tenant.phone)
  )
);

create policy maintenance_tenant_insert on public.maintenance_tickets
for insert
with check (
  public.current_user_is_tenant()
  and exists (
    select 1
    from public.tenants tenant
    where tenant.id = maintenance_tickets.tenant_id
      and tenant.owner_id = maintenance_tickets.owner_id
      and tenant.property_id = maintenance_tickets.property_id
      and public.current_user_matches_tenant(tenant.email, tenant.phone)
  )
);

drop policy if exists maintenance_notes_owner_all on public.maintenance_notes;
drop policy if exists maintenance_notes_admin_all on public.maintenance_notes;
drop policy if exists maintenance_notes_tenant_select on public.maintenance_notes;
drop policy if exists maintenance_notes_anon_all on public.maintenance_notes;
create policy maintenance_notes_owner_all on public.maintenance_notes
for all
using (
  exists (
    select 1
    from public.maintenance_tickets ticket
    where ticket.id = maintenance_notes.ticket_id
      and ticket.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.maintenance_tickets ticket
    where ticket.id = maintenance_notes.ticket_id
      and ticket.owner_id = auth.uid()
  )
);

create policy maintenance_notes_admin_all on public.maintenance_notes
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy maintenance_notes_tenant_select on public.maintenance_notes
for select
using (
  exists (
    select 1
    from public.maintenance_tickets ticket
    join public.tenants tenant on tenant.id = ticket.tenant_id
    where ticket.id = maintenance_notes.ticket_id
      and public.current_user_matches_tenant(tenant.email, tenant.phone)
  )
);

drop policy if exists announcements_owner_all on public.announcements;
drop policy if exists announcements_admin_all on public.announcements;
drop policy if exists announcements_tenant_select on public.announcements;
drop policy if exists announcements_anon_all on public.announcements;
create policy announcements_owner_all on public.announcements
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy announcements_admin_all on public.announcements
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

create policy announcements_tenant_select on public.announcements
for select
using (
  property_id is null
  or exists (
    select 1
    from public.tenants tenant
    where tenant.property_id = announcements.property_id
      and public.current_user_matches_tenant(tenant.email, tenant.phone)
  )
);

drop policy if exists notifications_owner_all on public.notifications;
drop policy if exists notifications_admin_all on public.notifications;
drop policy if exists notifications_anon_all on public.notifications;
create policy notifications_owner_all on public.notifications
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy notifications_admin_all on public.notifications
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- NOTE:
-- Storage bucket creation and storage.objects policies are applied via
-- Supabase Dashboard post-setup (Storage + Policies), because these operations
-- may require owner-level privileges depending on project role.
