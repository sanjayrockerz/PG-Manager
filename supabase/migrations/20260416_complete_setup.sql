-- ================================================================
-- PG SaaS: COMPLETE DATABASE SETUP
-- File: 20260416_complete_setup.sql
--
-- Run this ONCE in Supabase SQL Editor.
-- This is the definitive, self-contained setup file.
-- It merges schema.sql + 20260414 + 20260416 into one idempotent script.
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.
-- ================================================================

-- ================================================================
-- SECTION 0: EXTENSIONS
-- ================================================================
create extension if not exists pgcrypto;

-- ================================================================
-- SECTION 1: CORE TABLES (Base Schema)
-- ================================================================

-- profiles: one row per auth user
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  role text not null default 'owner'
    check (role in ('owner', 'owner_manager', 'staff', 'tenant', 'platform_admin', 'admin', 'super_admin')),
  owner_scope_id uuid references public.profiles(id) on delete set null,
  pg_name text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Drop old role constraint if it still uses the base-schema enum (owner/admin/tenant/super_admin)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('owner', 'owner_manager', 'staff', 'tenant', 'platform_admin', 'admin', 'super_admin'));

-- Add owner_scope_id if it doesn't exist yet
alter table public.profiles
  add column if not exists owner_scope_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_profiles_owner_scope_id on public.profiles(owner_scope_id);

-- owner_settings: per-owner configuration
create table if not exists public.owner_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  pg_rules jsonb not null default '[]'::jsonb,
  whatsapp_settings jsonb not null default jsonb_build_object(
    'welcomeMessage',      jsonb_build_object('enabled', true, 'template', 'Welcome to {{pgName}}, {{tenantName}}.'),
    'rentReminder',        jsonb_build_object('enabled', true, 'daysBeforeDue', 3, 'template', 'Rent reminder for {{month}}.'),
    'paymentConfirmation', jsonb_build_object('enabled', true, 'template', 'Payment received for {{month}}.'),
    'complaintUpdate',     jsonb_build_object('enabled', true, 'notifyOnCreate', true, 'notifyOnProgress', true, 'notifyOnResolve', true, 'template', 'Complaint #{{ticketId}} update: {{status}}.')
  ),
  notifications jsonb not null default jsonb_build_object(
    'paymentNotifications', true,
    'maintenanceAlerts', true,
    'tenantUpdates', true,
    'emailNotifications', true
  ),
  security jsonb not null default jsonb_build_object('twoFactorAuthentication', false),
  payment_settings jsonb not null default jsonb_build_object('upiId', '', 'bankAccount', '', 'latePaymentFee', 0),
  additional_settings jsonb not null default jsonb_build_object('language', 'English', 'timezone', 'IST (UTC+5:30)', 'currency', 'INR (Rs)'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- properties
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  address text not null,
  address_line1 text,
  address_line2 text,
  locality text,
  landmark text,
  latitude double precision,
  longitude double precision,
  formatted_address text,
  city text not null,
  state text not null,
  pincode text not null,
  floors int not null check (floors > 0),
  total_rooms int not null default 0,
  contact_name text not null,
  contact_phone text not null,
  contact_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add address columns to properties if they don't exist (for existing tables)
alter table public.properties
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists locality text,
  add column if not exists landmark text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists formatted_address text;

-- rooms
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

-- tenants
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  phone text not null,
  email text not null default '',
  photo_url text,
  floor int not null,
  room text not null,
  bed text not null,
  monthly_rent numeric(12,2) not null,
  security_deposit numeric(12,2) not null default 0,
  rent_due_date int not null check (rent_due_date between 1 and 31),
  parent_name text not null default '',
  parent_phone text not null default '',
  id_type text not null default '',
  id_number text not null default '',
  id_document_url text,
  join_date date not null,
  status text not null check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- payments
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

-- payment_charges
create table if not exists public.payment_charges (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  type text not null,
  custom_type text,
  description text,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- maintenance_tickets
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

-- maintenance_notes
create table if not exists public.maintenance_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

-- announcements
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

-- notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('payment', 'maintenance', 'tenant', 'announcement')),
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ================================================================
-- SECTION 2: MULTI-OWNER SAAS TABLES
-- ================================================================

-- owner_user_property_scopes: member → property capability matrix
create table if not exists public.owner_user_property_scopes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  can_view boolean not null default true,
  can_manage_properties boolean not null default false,
  can_manage_tenants boolean not null default false,
  can_manage_payments boolean not null default false,
  can_manage_maintenance boolean not null default false,
  can_manage_announcements boolean not null default false,
  display_role text check (display_role in ('viewer', 'editor', 'manager')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, property_id)
);

-- Add new columns to existing scopes table if running over prior migration
alter table public.owner_user_property_scopes
  add column if not exists can_view boolean not null default true,
  add column if not exists display_role text check (display_role in ('viewer', 'editor', 'manager'));

create index if not exists idx_owner_user_property_scopes_owner_id   on public.owner_user_property_scopes(owner_id);
create index if not exists idx_owner_user_property_scopes_user_id    on public.owner_user_property_scopes(user_id);
create index if not exists idx_owner_user_property_scopes_property_id on public.owner_user_property_scopes(property_id);

-- owner_subscriptions
create table if not exists public.owner_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  plan_code text not null default 'starter',
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  amount numeric(12,2) not null default 0,
  currency text not null default 'INR',
  seats int not null default 1,
  started_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  renews_at timestamptz,
  last_payment_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_owner_subscriptions_owner_id on public.owner_subscriptions(owner_id);

-- support_tickets
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  subject text not null,
  description text not null,
  category text not null default 'other' check (category in ('billing', 'technical', 'operations', 'tenant', 'other')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  visibility text not null default 'owner' check (visibility in ('owner', 'property', 'platform')),
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_owner_id   on public.support_tickets(owner_id);
create index if not exists idx_support_tickets_property_id on public.support_tickets(property_id);
create index if not exists idx_support_tickets_status     on public.support_tickets(status);
create index if not exists idx_support_tickets_created_by on public.support_tickets(created_by);

-- support_ticket_comments
create table if not exists public.support_ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  internal_note boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_ticket_comments_ticket_id on public.support_ticket_comments(ticket_id);
create index if not exists idx_support_ticket_comments_author_id on public.support_ticket_comments(author_id);

-- owner_invites: pending/accepted/revoked email invitations
create table if not exists public.owner_invites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  invited_email text not null,
  role text not null check (role in ('owner_manager', 'staff')),
  display_role text not null check (display_role in ('viewer', 'editor', 'manager')),
  property_ids uuid[] not null default '{}',
  capabilities jsonb not null default '{
    "can_manage_tenants": false,
    "can_manage_payments": false,
    "can_manage_maintenance": false,
    "can_manage_announcements": false
  }'::jsonb,
  token text not null default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_owner_invites_active_unique
  on public.owner_invites(owner_id, lower(invited_email))
  where status = 'pending';

create index if not exists idx_owner_invites_owner_id     on public.owner_invites(owner_id);
create index if not exists idx_owner_invites_invited_email on public.owner_invites(lower(invited_email));
create index if not exists idx_owner_invites_token        on public.owner_invites(token);
create index if not exists idx_owner_invites_status       on public.owner_invites(status);

-- ================================================================
-- SECTION 3: DATABASE CONSTRAINTS (validation)
-- ================================================================

-- Properties: pincode exactly 6 digits (Indian format)
alter table public.properties
  drop constraint if exists properties_pincode_format;
alter table public.properties
  add constraint properties_pincode_format
    check (pincode ~ '^\d{6}$');

-- Properties: contact_phone exactly 10 digits (Indian mobile, no country code stored)
alter table public.properties
  drop constraint if exists properties_contact_phone_format;
alter table public.properties
  add constraint properties_contact_phone_format
    check (contact_phone ~ '^\d{10}$');

-- Properties: email must be blank or valid format
alter table public.properties
  drop constraint if exists properties_contact_email_format;
alter table public.properties
  add constraint properties_contact_email_format
    check (contact_email = '' or contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Tenants: phone 10-15 digits with optional + prefix
alter table public.tenants
  drop constraint if exists tenants_phone_format;
alter table public.tenants
  add constraint tenants_phone_format
    check (phone = '' or phone ~ '^\+?\d{10,15}$');

-- Tenants: email blank or valid format
alter table public.tenants
  drop constraint if exists tenants_email_format;
alter table public.tenants
  add constraint tenants_email_format
    check (email = '' or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Tenants: parent_phone blank or valid
alter table public.tenants
  drop constraint if exists tenants_parent_phone_format;
alter table public.tenants
  add constraint tenants_parent_phone_format
    check (parent_phone = '' or parent_phone ~ '^\+?\d{10,15}$');

-- ================================================================
-- SECTION 4: HELPER FUNCTIONS
-- ================================================================

-- set_updated_at: trigger function for updated_at columns
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- current_user_role: returns the role of the authenticated user
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

-- current_user_is_admin: returns true for platform admin roles
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() in ('platform_admin', 'admin', 'super_admin'),
    false
  );
$$;

-- current_user_is_tenant
create or replace function public.current_user_is_tenant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'tenant', false);
$$;

-- current_owner_scope_id: resolves the owning user's id for the current session
create or replace function public.current_owner_scope_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when profile.role = 'owner' then profile.id
    when profile.role in ('owner_manager', 'staff') then profile.owner_scope_id
    else null
  end
  from public.profiles profile
  where profile.id = auth.uid();
$$;

-- current_user_matches_tenant: checks if the authenticated user matches a tenant record
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

-- current_user_has_property_scope: checks if user can access a specific property
create or replace function public.current_user_has_property_scope(property_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_admin()
    or exists (
      select 1
      from public.properties property
      where property.id = property_uuid
        and property.owner_id = public.current_owner_scope_id()
        and (
          public.current_user_role() = 'owner'
          or exists (
            select 1
            from public.owner_user_property_scopes scope
            where scope.user_id = auth.uid()
              and scope.owner_id = property.owner_id
              and scope.property_id = property.id
          )
        )
    );
$$;

-- current_user_has_property_capability: checks if user has a specific capability on a property
create or replace function public.current_user_has_property_capability(property_uuid uuid, capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_admin()
    or exists (
      select 1
      from public.properties property
      where property.id = property_uuid
        and property.owner_id = public.current_owner_scope_id()
        and (
          public.current_user_role() = 'owner'
          or exists (
            select 1
            from public.owner_user_property_scopes scope
            where scope.user_id = auth.uid()
              and scope.owner_id = property.owner_id
              and scope.property_id = property.id
              and case capability
                when 'properties'   then scope.can_manage_properties
                when 'tenants'      then scope.can_manage_tenants
                when 'payments'     then scope.can_manage_payments
                when 'maintenance'  then scope.can_manage_maintenance
                when 'announcements' then scope.can_manage_announcements
                else false
              end
          )
        )
    );
$$;

-- accept_pending_invite: for users who already have an account and receive an invite
create or replace function public.accept_pending_invite(p_user_id uuid, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_invite record;
  prop_id uuid;
begin
  select * into pending_invite
  from public.owner_invites
  where lower(invited_email) = lower(p_email)
    and status = 'pending'
    and expires_at > now()
  order by invited_at desc
  limit 1;

  if pending_invite.id is null then
    return jsonb_build_object('success', false, 'reason', 'no_pending_invite');
  end if;

  update public.profiles
  set
    role = pending_invite.role,
    owner_scope_id = pending_invite.owner_id,
    updated_at = now()
  where id = p_user_id;

  foreach prop_id in array pending_invite.property_ids loop
    insert into public.owner_user_property_scopes (
      owner_id, user_id, property_id,
      can_view, can_manage_properties,
      can_manage_tenants, can_manage_payments,
      can_manage_maintenance, can_manage_announcements,
      display_role
    ) values (
      pending_invite.owner_id, p_user_id, prop_id,
      true, false,
      coalesce((pending_invite.capabilities->>'can_manage_tenants')::boolean, false),
      coalesce((pending_invite.capabilities->>'can_manage_payments')::boolean, false),
      coalesce((pending_invite.capabilities->>'can_manage_maintenance')::boolean, false),
      coalesce((pending_invite.capabilities->>'can_manage_announcements')::boolean, false),
      pending_invite.display_role
    )
    on conflict (user_id, property_id) do update set
      can_view = true,
      can_manage_tenants = excluded.can_manage_tenants,
      can_manage_payments = excluded.can_manage_payments,
      can_manage_maintenance = excluded.can_manage_maintenance,
      can_manage_announcements = excluded.can_manage_announcements,
      display_role = excluded.display_role,
      updated_at = now();
  end loop;

  update public.owner_invites
  set status = 'accepted', accepted_at = now(), accepted_by = p_user_id
  where id = pending_invite.id;

  return jsonb_build_object('success', true, 'owner_id', pending_invite.owner_id, 'role', pending_invite.role);
end;
$$;

-- ================================================================
-- SECTION 5: handle_new_auth_user TRIGGER FUNCTION
-- (creates profile, owner_settings, subscription, and accepts pending invites)
-- ================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb;
  resolved_role text;
  owner_settings_exists boolean;
  pending_invite record;
  prop_id uuid;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  resolved_role := coalesce(metadata->>'role', 'owner');

  -- Validate role value
  if resolved_role not in ('owner', 'owner_manager', 'staff', 'tenant', 'platform_admin', 'admin', 'super_admin') then
    resolved_role := 'owner';
  end if;

  -- Check for a pending invite matching this email
  select * into pending_invite
  from public.owner_invites
  where lower(invited_email) = lower(new.email)
    and status = 'pending'
    and expires_at > now()
  order by invited_at desc
  limit 1;

  -- If invite found, the role is set by the invite
  if pending_invite.id is not null then
    resolved_role := pending_invite.role;
  end if;

  -- Upsert the profile
  insert into public.profiles (id, email, full_name, phone, role, pg_name, city, owner_scope_id)
  values (
    new.id,
    new.email,
    coalesce(metadata->>'name', split_part(coalesce(new.email, ''), '@', 1)),
    metadata->>'phone',
    resolved_role,
    metadata->>'pgName',
    metadata->>'city',
    case
      when resolved_role = 'owner' then new.id
      when pending_invite.id is not null then pending_invite.owner_id
      else null
    end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    role = case
      when pending_invite.id is not null then pending_invite.role
      else coalesce(public.profiles.role, excluded.role)
    end,
    owner_scope_id = case
      when pending_invite.id is not null then pending_invite.owner_id
      when coalesce(public.profiles.role, excluded.role) = 'owner' then public.profiles.id
      else coalesce(public.profiles.owner_scope_id, excluded.owner_scope_id)
    end,
    pg_name = coalesce(excluded.pg_name, public.profiles.pg_name),
    city = coalesce(excluded.city, public.profiles.city),
    updated_at = now();

  -- For owners only: create owner_settings and subscription
  if resolved_role = 'owner' then
    select exists (
      select 1 from public.owner_settings where owner_id = new.id
    ) into owner_settings_exists;

    if not owner_settings_exists then
      insert into public.owner_settings (owner_id) values (new.id);
    end if;

    insert into public.owner_subscriptions (
      owner_id, plan_code, status, billing_cycle, amount, currency, seats, trial_ends_at, renews_at
    ) values (
      new.id, 'starter', 'trialing', 'monthly', 0, 'INR', 1,
      now() + interval '14 day',
      now() + interval '1 month'
    )
    on conflict (owner_id) do nothing;
  end if;

  -- If a pending invite matched: create property scope rows and accept the invite
  if pending_invite.id is not null then
    foreach prop_id in array pending_invite.property_ids loop
      insert into public.owner_user_property_scopes (
        owner_id, user_id, property_id,
        can_view, can_manage_properties,
        can_manage_tenants, can_manage_payments,
        can_manage_maintenance, can_manage_announcements,
        display_role
      ) values (
        pending_invite.owner_id, new.id, prop_id,
        true, false,
        coalesce((pending_invite.capabilities->>'can_manage_tenants')::boolean, false),
        coalesce((pending_invite.capabilities->>'can_manage_payments')::boolean, false),
        coalesce((pending_invite.capabilities->>'can_manage_maintenance')::boolean, false),
        coalesce((pending_invite.capabilities->>'can_manage_announcements')::boolean, false),
        pending_invite.display_role
      )
      on conflict (user_id, property_id) do update set
        can_view = true,
        can_manage_tenants = excluded.can_manage_tenants,
        can_manage_payments = excluded.can_manage_payments,
        can_manage_maintenance = excluded.can_manage_maintenance,
        can_manage_announcements = excluded.can_manage_announcements,
        display_role = excluded.display_role,
        updated_at = now();
    end loop;

    update public.owner_invites
    set status = 'accepted', accepted_at = now(), accepted_by = new.id
    where id = pending_invite.id;
  end if;

  return new;
end;
$$;

-- Attach the trigger to auth.users (requires sufficient privilege in Supabase)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- ================================================================
-- SECTION 6: OTHER TRIGGERS
-- ================================================================

-- updated_at triggers for all mutable tables
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists owner_settings_updated_at on public.owner_settings;
create trigger owner_settings_updated_at before update on public.owner_settings
  for each row execute procedure public.set_updated_at();

drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at before update on public.properties
  for each row execute procedure public.set_updated_at();

drop trigger if exists rooms_updated_at on public.rooms;
create trigger rooms_updated_at before update on public.rooms
  for each row execute procedure public.set_updated_at();

drop trigger if exists tenants_updated_at on public.tenants;
create trigger tenants_updated_at before update on public.tenants
  for each row execute procedure public.set_updated_at();

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments
  for each row execute procedure public.set_updated_at();

drop trigger if exists maintenance_tickets_updated_at on public.maintenance_tickets;
create trigger maintenance_tickets_updated_at before update on public.maintenance_tickets
  for each row execute procedure public.set_updated_at();

drop trigger if exists announcements_updated_at on public.announcements;
create trigger announcements_updated_at before update on public.announcements
  for each row execute procedure public.set_updated_at();

drop trigger if exists owner_user_property_scopes_updated_at on public.owner_user_property_scopes;
create trigger owner_user_property_scopes_updated_at before update on public.owner_user_property_scopes
  for each row execute procedure public.set_updated_at();

drop trigger if exists owner_subscriptions_updated_at on public.owner_subscriptions;
create trigger owner_subscriptions_updated_at before update on public.owner_subscriptions
  for each row execute procedure public.set_updated_at();

drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute procedure public.set_updated_at();

drop trigger if exists owner_invites_updated_at on public.owner_invites;
create trigger owner_invites_updated_at before update on public.owner_invites
  for each row execute procedure public.set_updated_at();

-- Auto-create initial payment when a tenant is added
create or replace function public.create_initial_payment_for_tenant()
returns trigger
language plpgsql
as $$
declare
  due_date_value date;
begin
  due_date_value := make_date(
    extract(year from current_date)::int,
    extract(month from current_date)::int,
    greatest(1, least(28, new.rent_due_date))
  );

  insert into public.payments (
    owner_id, tenant_id, property_id,
    tenant_name, room, monthly_rent,
    extra_charges, total_amount, due_date, status
  ) values (
    new.owner_id, new.id, new.property_id,
    new.name, new.room, new.monthly_rent,
    0, new.monthly_rent, due_date_value, 'pending'
  );

  return new;
end;
$$;

drop trigger if exists create_initial_payment_after_tenant_insert on public.tenants;
create trigger create_initial_payment_after_tenant_insert
after insert on public.tenants
for each row execute procedure public.create_initial_payment_for_tenant();

-- Sync payment totals when charges are added
create or replace function public.sync_payment_totals_after_charge()
returns trigger
language plpgsql
as $$
begin
  update public.payments
  set
    extra_charges = coalesce((
      select sum(amount) from public.payment_charges where payment_id = new.payment_id
    ), 0),
    total_amount = monthly_rent + coalesce((
      select sum(amount) from public.payment_charges where payment_id = new.payment_id
    ), 0),
    updated_at = now()
  where id = new.payment_id;
  return new;
end;
$$;

drop trigger if exists sync_payment_totals_on_charge_insert on public.payment_charges;
create trigger sync_payment_totals_on_charge_insert
after insert on public.payment_charges
for each row execute procedure public.sync_payment_totals_after_charge();

-- Sync payment fields when tenant is updated
create or replace function public.sync_payment_fields_after_tenant_update()
returns trigger
language plpgsql
as $$
begin
  update public.payments
  set
    tenant_name = new.name,
    room = new.room,
    property_id = new.property_id,
    monthly_rent = new.monthly_rent,
    total_amount = new.monthly_rent + coalesce(extra_charges, 0),
    updated_at = now()
  where tenant_id = new.id;
  return new;
end;
$$;

drop trigger if exists sync_payment_fields_on_tenant_update on public.tenants;
create trigger sync_payment_fields_on_tenant_update
after update of name, room, monthly_rent, property_id on public.tenants
for each row execute procedure public.sync_payment_fields_after_tenant_update();

-- ================================================================
-- SECTION 7: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ================================================================
alter table public.profiles                    enable row level security;
alter table public.owner_settings              enable row level security;
alter table public.properties                  enable row level security;
alter table public.rooms                       enable row level security;
alter table public.tenants                     enable row level security;
alter table public.payments                    enable row level security;
alter table public.payment_charges             enable row level security;
alter table public.maintenance_tickets         enable row level security;
alter table public.maintenance_notes           enable row level security;
alter table public.announcements               enable row level security;
alter table public.notifications               enable row level security;
alter table public.owner_user_property_scopes  enable row level security;
alter table public.owner_subscriptions         enable row level security;
alter table public.support_tickets             enable row level security;
alter table public.support_ticket_comments     enable row level security;
alter table public.owner_invites               enable row level security;

-- ================================================================
-- SECTION 8: ROW LEVEL SECURITY POLICIES
-- Drop all old policies before re-creating (clean slate every run)
-- ================================================================

-- ── profiles ──────────────────────────────────────────────────────
drop policy if exists profiles_self_insert              on public.profiles;
drop policy if exists profiles_self_select              on public.profiles;
drop policy if exists profiles_self_update              on public.profiles;
drop policy if exists profiles_owner_select             on public.profiles;
drop policy if exists profiles_owner_update             on public.profiles;
drop policy if exists profiles_admin_select             on public.profiles;
drop policy if exists profiles_anon_read_all            on public.profiles;

create policy profiles_self_insert on public.profiles
  for insert with check (auth.uid() = id);

create policy profiles_self_select on public.profiles
  for select using (
    auth.uid() = id
    or public.current_user_is_admin()
    or (
      public.current_owner_scope_id() is not null
      and (
        profiles.id = public.current_owner_scope_id()
        or profiles.owner_scope_id = public.current_owner_scope_id()
      )
    )
  );

create policy profiles_self_update on public.profiles
  for update
  using (
    auth.uid() = id
    or public.current_user_is_admin()
    or (
      public.current_user_role() = 'owner'
      and profiles.owner_scope_id = public.current_owner_scope_id()
    )
  )
  with check (
    auth.uid() = id
    or public.current_user_is_admin()
    or (
      public.current_user_role() = 'owner'
      and profiles.owner_scope_id = public.current_owner_scope_id()
    )
  );

-- ── owner_settings ────────────────────────────────────────────────
drop policy if exists owner_settings_owner_all        on public.owner_settings;
drop policy if exists owner_settings_owner_scope_select on public.owner_settings;
drop policy if exists owner_settings_admin_all        on public.owner_settings;
drop policy if exists owner_settings_anon_all         on public.owner_settings;

create policy owner_settings_owner_all on public.owner_settings
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy owner_settings_owner_scope_select on public.owner_settings
  for select using (owner_id = public.current_owner_scope_id());

create policy owner_settings_admin_all on public.owner_settings
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ── properties ────────────────────────────────────────────────────
drop policy if exists properties_owner_all    on public.properties;
drop policy if exists properties_owner_select on public.properties;
drop policy if exists properties_owner_manage on public.properties;
drop policy if exists properties_admin_all    on public.properties;
drop policy if exists properties_tenant_select on public.properties;
drop policy if exists properties_anon_all     on public.properties;

create policy properties_owner_select on public.properties
  for select using (
    owner_id = public.current_owner_scope_id()
    and (
      public.current_user_role() = 'owner'
      or public.current_user_has_property_scope(properties.id)
    )
  );

create policy properties_owner_manage on public.properties
  for all
  using (
    owner_id = public.current_owner_scope_id()
    and public.current_user_role() = 'owner'
  )
  with check (
    owner_id = public.current_owner_scope_id()
    and public.current_user_role() = 'owner'
  );

create policy properties_admin_all on public.properties
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy properties_tenant_select on public.properties
  for select using (
    exists (
      select 1 from public.tenants tenant
      where tenant.property_id = properties.id
        and public.current_user_matches_tenant(tenant.email, tenant.phone)
    )
  );

-- ── rooms ─────────────────────────────────────────────────────────
drop policy if exists rooms_owner_all    on public.rooms;
drop policy if exists rooms_owner_select on public.rooms;
drop policy if exists rooms_owner_manage on public.rooms;
drop policy if exists rooms_admin_all    on public.rooms;
drop policy if exists rooms_tenant_select on public.rooms;
drop policy if exists rooms_anon_all     on public.rooms;

create policy rooms_owner_select on public.rooms
  for select using (public.current_user_has_property_scope(rooms.property_id));

create policy rooms_owner_manage on public.rooms
  for all
  using (public.current_user_has_property_capability(rooms.property_id, 'properties'))
  with check (public.current_user_has_property_capability(rooms.property_id, 'properties'));

create policy rooms_admin_all on public.rooms
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy rooms_tenant_select on public.rooms
  for select using (
    exists (
      select 1 from public.tenants tenant
      where tenant.property_id = rooms.property_id
        and public.current_user_matches_tenant(tenant.email, tenant.phone)
    )
  );

-- ── tenants ───────────────────────────────────────────────────────
drop policy if exists tenants_owner_all    on public.tenants;
drop policy if exists tenants_owner_select on public.tenants;
drop policy if exists tenants_owner_manage on public.tenants;
drop policy if exists tenants_admin_all    on public.tenants;
drop policy if exists tenants_tenant_select on public.tenants;
drop policy if exists tenants_anon_all     on public.tenants;

create policy tenants_owner_select on public.tenants
  for select using (
    owner_id = public.current_owner_scope_id()
    and (
      public.current_user_role() = 'owner'
      or public.current_user_has_property_scope(tenants.property_id)
    )
  );

create policy tenants_owner_manage on public.tenants
  for all
  using (
    owner_id = public.current_owner_scope_id()
    and public.current_user_has_property_capability(tenants.property_id, 'tenants')
  )
  with check (
    owner_id = public.current_owner_scope_id()
    and public.current_user_has_property_capability(tenants.property_id, 'tenants')
  );

create policy tenants_admin_all on public.tenants
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy tenants_tenant_select on public.tenants
  for select using (public.current_user_matches_tenant(email, phone));

-- ── payments ──────────────────────────────────────────────────────
drop policy if exists payments_owner_all    on public.payments;
drop policy if exists payments_owner_select on public.payments;
drop policy if exists payments_owner_manage on public.payments;
drop policy if exists payments_admin_all    on public.payments;
drop policy if exists payments_tenant_select on public.payments;
drop policy if exists payments_anon_all     on public.payments;

create policy payments_owner_select on public.payments
  for select using (
    owner_id = public.current_owner_scope_id()
    and (
      public.current_user_role() = 'owner'
      or public.current_user_has_property_scope(payments.property_id)
    )
  );

create policy payments_owner_manage on public.payments
  for all
  using (
    owner_id = public.current_owner_scope_id()
    and public.current_user_has_property_capability(payments.property_id, 'payments')
  )
  with check (
    owner_id = public.current_owner_scope_id()
    and public.current_user_has_property_capability(payments.property_id, 'payments')
  );

create policy payments_admin_all on public.payments
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy payments_tenant_select on public.payments
  for select using (
    exists (
      select 1 from public.tenants tenant
      where tenant.id = payments.tenant_id
        and public.current_user_matches_tenant(tenant.email, tenant.phone)
    )
  );

-- ── payment_charges ───────────────────────────────────────────────
drop policy if exists payment_charges_owner_all    on public.payment_charges;
drop policy if exists payment_charges_owner_select on public.payment_charges;
drop policy if exists payment_charges_owner_manage on public.payment_charges;
drop policy if exists payment_charges_admin_all    on public.payment_charges;
drop policy if exists payment_charges_tenant_select on public.payment_charges;
drop policy if exists payment_charges_anon_all     on public.payment_charges;

create policy payment_charges_owner_select on public.payment_charges
  for select using (
    exists (
      select 1 from public.payments payment
      where payment.id = payment_charges.payment_id
        and payment.owner_id = public.current_owner_scope_id()
        and (
          public.current_user_role() = 'owner'
          or public.current_user_has_property_scope(payment.property_id)
        )
    )
  );

create policy payment_charges_owner_manage on public.payment_charges
  for all
  using (
    exists (
      select 1 from public.payments payment
      where payment.id = payment_charges.payment_id
        and payment.owner_id = public.current_owner_scope_id()
        and public.current_user_has_property_capability(payment.property_id, 'payments')
    )
  )
  with check (
    exists (
      select 1 from public.payments payment
      where payment.id = payment_charges.payment_id
        and payment.owner_id = public.current_owner_scope_id()
        and public.current_user_has_property_capability(payment.property_id, 'payments')
    )
  );

create policy payment_charges_admin_all on public.payment_charges
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy payment_charges_tenant_select on public.payment_charges
  for select using (
    exists (
      select 1 from public.payments payment
      join public.tenants tenant on tenant.id = payment.tenant_id
      where payment.id = payment_charges.payment_id
        and public.current_user_matches_tenant(tenant.email, tenant.phone)
    )
  );

-- ── maintenance_tickets ───────────────────────────────────────────
drop policy if exists maintenance_owner_all    on public.maintenance_tickets;
drop policy if exists maintenance_owner_select on public.maintenance_tickets;
drop policy if exists maintenance_owner_manage on public.maintenance_tickets;
drop policy if exists maintenance_admin_all    on public.maintenance_tickets;
drop policy if exists maintenance_tenant_select on public.maintenance_tickets;
drop policy if exists maintenance_tenant_insert on public.maintenance_tickets;
drop policy if exists maintenance_tickets_anon_all on public.maintenance_tickets;

create policy maintenance_owner_select on public.maintenance_tickets
  for select using (
    owner_id = public.current_owner_scope_id()
    and (
      public.current_user_role() = 'owner'
      or public.current_user_has_property_scope(maintenance_tickets.property_id)
    )
  );

create policy maintenance_owner_manage on public.maintenance_tickets
  for all
  using (
    owner_id = public.current_owner_scope_id()
    and public.current_user_has_property_capability(maintenance_tickets.property_id, 'maintenance')
  )
  with check (
    owner_id = public.current_owner_scope_id()
    and public.current_user_has_property_capability(maintenance_tickets.property_id, 'maintenance')
  );

create policy maintenance_admin_all on public.maintenance_tickets
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy maintenance_tenant_select on public.maintenance_tickets
  for select using (
    exists (
      select 1 from public.tenants tenant
      where tenant.id = maintenance_tickets.tenant_id
        and public.current_user_matches_tenant(tenant.email, tenant.phone)
    )
  );

create policy maintenance_tenant_insert on public.maintenance_tickets
  for insert with check (
    public.current_user_role() = 'tenant'
    and exists (
      select 1 from public.tenants tenant
      where tenant.id = maintenance_tickets.tenant_id
        and tenant.owner_id = maintenance_tickets.owner_id
        and tenant.property_id = maintenance_tickets.property_id
        and public.current_user_matches_tenant(tenant.email, tenant.phone)
    )
  );

-- ── maintenance_notes ─────────────────────────────────────────────
drop policy if exists maintenance_notes_owner_all    on public.maintenance_notes;
drop policy if exists maintenance_notes_owner_select on public.maintenance_notes;
drop policy if exists maintenance_notes_owner_manage on public.maintenance_notes;
drop policy if exists maintenance_notes_admin_all    on public.maintenance_notes;
drop policy if exists maintenance_notes_tenant_select on public.maintenance_notes;
drop policy if exists maintenance_notes_anon_all     on public.maintenance_notes;

create policy maintenance_notes_owner_select on public.maintenance_notes
  for select using (
    exists (
      select 1 from public.maintenance_tickets ticket
      where ticket.id = maintenance_notes.ticket_id
        and ticket.owner_id = public.current_owner_scope_id()
        and (
          public.current_user_role() = 'owner'
          or public.current_user_has_property_scope(ticket.property_id)
        )
    )
  );

create policy maintenance_notes_owner_manage on public.maintenance_notes
  for all
  using (
    exists (
      select 1 from public.maintenance_tickets ticket
      where ticket.id = maintenance_notes.ticket_id
        and ticket.owner_id = public.current_owner_scope_id()
        and public.current_user_has_property_capability(ticket.property_id, 'maintenance')
    )
  )
  with check (
    exists (
      select 1 from public.maintenance_tickets ticket
      where ticket.id = maintenance_notes.ticket_id
        and ticket.owner_id = public.current_owner_scope_id()
        and public.current_user_has_property_capability(ticket.property_id, 'maintenance')
    )
  );

create policy maintenance_notes_admin_all on public.maintenance_notes
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy maintenance_notes_tenant_select on public.maintenance_notes
  for select using (
    exists (
      select 1 from public.maintenance_tickets ticket
      join public.tenants tenant on tenant.id = ticket.tenant_id
      where ticket.id = maintenance_notes.ticket_id
        and public.current_user_matches_tenant(tenant.email, tenant.phone)
    )
  );

-- ── announcements ─────────────────────────────────────────────────
drop policy if exists announcements_owner_all    on public.announcements;
drop policy if exists announcements_owner_select on public.announcements;
drop policy if exists announcements_owner_manage on public.announcements;
drop policy if exists announcements_admin_all    on public.announcements;
drop policy if exists announcements_tenant_select on public.announcements;
drop policy if exists announcements_anon_all     on public.announcements;

create policy announcements_owner_select on public.announcements
  for select using (
    owner_id = public.current_owner_scope_id()
    and (
      property_id is null
      or public.current_user_role() = 'owner'
      or public.current_user_has_property_scope(announcements.property_id)
    )
  );

create policy announcements_owner_manage on public.announcements
  for all
  using (
    owner_id = public.current_owner_scope_id()
    and (
      public.current_user_role() = 'owner'
      or (
        announcements.property_id is not null
        and public.current_user_has_property_capability(announcements.property_id, 'announcements')
      )
    )
  )
  with check (
    owner_id = public.current_owner_scope_id()
    and (
      public.current_user_role() = 'owner'
      or (
        announcements.property_id is not null
        and public.current_user_has_property_capability(announcements.property_id, 'announcements')
      )
    )
  );

create policy announcements_admin_all on public.announcements
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy announcements_tenant_select on public.announcements
  for select using (
    property_id is null
    or exists (
      select 1 from public.tenants tenant
      where tenant.property_id = announcements.property_id
        and public.current_user_matches_tenant(tenant.email, tenant.phone)
    )
  );

-- ── notifications ─────────────────────────────────────────────────
drop policy if exists notifications_owner_all        on public.notifications;
drop policy if exists notifications_owner_scope_all  on public.notifications;
drop policy if exists notifications_admin_all        on public.notifications;
drop policy if exists notifications_anon_all         on public.notifications;

-- Owner-only (not scoped to members)
create policy notifications_owner_only on public.notifications
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy notifications_admin_all on public.notifications
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ── owner_user_property_scopes ────────────────────────────────────
drop policy if exists owner_user_property_scopes_owner_all   on public.owner_user_property_scopes;
drop policy if exists owner_user_property_scopes_self_select on public.owner_user_property_scopes;
drop policy if exists owner_user_property_scopes_admin_all   on public.owner_user_property_scopes;

create policy owner_user_property_scopes_owner_all on public.owner_user_property_scopes
  for all
  using (
    owner_id = public.current_owner_scope_id()
    and public.current_user_role() = 'owner'
  )
  with check (
    owner_id = public.current_owner_scope_id()
    and public.current_user_role() = 'owner'
  );

create policy owner_user_property_scopes_self_select on public.owner_user_property_scopes
  for select using (
    user_id = auth.uid()
    or owner_id = public.current_owner_scope_id()
  );

create policy owner_user_property_scopes_admin_all on public.owner_user_property_scopes
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ── owner_subscriptions ───────────────────────────────────────────
drop policy if exists owner_subscriptions_owner_all         on public.owner_subscriptions;
drop policy if exists owner_subscriptions_owner_scope_select on public.owner_subscriptions;
drop policy if exists owner_subscriptions_admin_all          on public.owner_subscriptions;

create policy owner_subscriptions_owner_all on public.owner_subscriptions
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy owner_subscriptions_owner_scope_select on public.owner_subscriptions
  for select using (owner_id = public.current_owner_scope_id());

create policy owner_subscriptions_admin_all on public.owner_subscriptions
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ── support_tickets ───────────────────────────────────────────────
drop policy if exists support_tickets_owner_scope_select on public.support_tickets;
drop policy if exists support_tickets_owner_scope_insert on public.support_tickets;
drop policy if exists support_tickets_owner_scope_update on public.support_tickets;
drop policy if exists support_tickets_admin_all          on public.support_tickets;

create policy support_tickets_owner_scope_select on public.support_tickets
  for select using (
    owner_id = public.current_owner_scope_id()
    and (
      public.current_user_role() = 'owner'
      or property_id is null
      or public.current_user_has_property_scope(property_id)
    )
  );

create policy support_tickets_owner_scope_insert on public.support_tickets
  for insert with check (
    owner_id = public.current_owner_scope_id()
    and created_by = auth.uid()
    and (
      public.current_user_role() = 'owner'
      or property_id is null
      or public.current_user_has_property_scope(property_id)
    )
  );

create policy support_tickets_owner_scope_update on public.support_tickets
  for update
  using (
    owner_id = public.current_owner_scope_id()
    and (
      public.current_user_role() = 'owner'
      or (
        property_id is not null
        and public.current_user_has_property_capability(property_id, 'maintenance')
      )
    )
  )
  with check (
    owner_id = public.current_owner_scope_id()
    and (
      public.current_user_role() = 'owner'
      or (
        property_id is not null
        and public.current_user_has_property_capability(property_id, 'maintenance')
      )
    )
  );

create policy support_tickets_admin_all on public.support_tickets
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ── support_ticket_comments ───────────────────────────────────────
drop policy if exists support_ticket_comments_owner_scope_select on public.support_ticket_comments;
drop policy if exists support_ticket_comments_owner_scope_insert on public.support_ticket_comments;
drop policy if exists support_ticket_comments_admin_all          on public.support_ticket_comments;

create policy support_ticket_comments_owner_scope_select on public.support_ticket_comments
  for select using (
    exists (
      select 1 from public.support_tickets ticket
      where ticket.id = support_ticket_comments.ticket_id
        and ticket.owner_id = public.current_owner_scope_id()
        and (
          public.current_user_role() = 'owner'
          or ticket.property_id is null
          or public.current_user_has_property_scope(ticket.property_id)
        )
    )
  );

create policy support_ticket_comments_owner_scope_insert on public.support_ticket_comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.support_tickets ticket
      where ticket.id = support_ticket_comments.ticket_id
        and ticket.owner_id = public.current_owner_scope_id()
        and (
          public.current_user_role() = 'owner'
          or ticket.property_id is null
          or public.current_user_has_property_scope(ticket.property_id)
        )
    )
  );

create policy support_ticket_comments_admin_all on public.support_ticket_comments
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ── owner_invites ─────────────────────────────────────────────────
drop policy if exists owner_invites_owner_all   on public.owner_invites;
drop policy if exists owner_invites_self_select on public.owner_invites;
drop policy if exists owner_invites_admin_all   on public.owner_invites;

create policy owner_invites_owner_all on public.owner_invites
  for all
  using (
    owner_id = auth.uid()
    and public.current_user_role() = 'owner'
  )
  with check (
    owner_id = auth.uid()
    and public.current_user_role() = 'owner'
  );

-- Invited user can see their own pending invite
create policy owner_invites_self_select on public.owner_invites
  for select using (
    lower(invited_email) = lower(
      coalesce(
        (select email from public.profiles where id = auth.uid()),
        ''
      )
    )
  );

create policy owner_invites_admin_all on public.owner_invites
  for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ================================================================
-- SECTION 9: DATA BACKFILL / CONSISTENCY FIXES
-- ================================================================

-- Ensure owner_scope_id = id for all existing owner profiles
update public.profiles
set owner_scope_id = id
where role = 'owner' and owner_scope_id is null;

-- Backfill address_line1 for existing properties that have address but no address_line1
update public.properties
set
  address_line1 = coalesce(address_line1, address),
  locality = coalesce(locality, city),
  formatted_address = coalesce(
    formatted_address,
    concat_ws(', ', address, city, state, pincode)
  )
where
  address_line1 is null
  or locality is null
  or formatted_address is null;

-- Bootstrap subscriptions for existing owners who don't have one
insert into public.owner_subscriptions (
  owner_id, plan_code, status, billing_cycle, amount, currency, seats, trial_ends_at, renews_at
)
select
  p.id, 'starter', 'trialing', 'monthly', 0, 'INR', 1,
  now() + interval '14 day',
  now() + interval '1 month'
from public.profiles p
where p.role = 'owner'
  and not exists (
    select 1 from public.owner_subscriptions s where s.owner_id = p.id
  );

-- Bootstrap owner_settings for existing owners who don't have settings
insert into public.owner_settings (owner_id)
select p.id
from public.profiles p
where p.role = 'owner'
  and not exists (
    select 1 from public.owner_settings s where s.owner_id = p.id
  );

-- Mark any stale pending invites as expired
update public.owner_invites
set status = 'expired'
where status = 'pending'
  and expires_at < now();

-- ================================================================
-- END OF COMPLETE SETUP MIGRATION
-- ================================================================
