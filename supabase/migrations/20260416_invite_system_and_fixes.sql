-- ============================================================
-- PG SaaS: Invite system, validation fixes, and RLS corrections
-- Migration: 20260416_invite_system_and_fixes.sql
-- Run once in Supabase SQL Editor.
-- ============================================================

-- SECTION 1: owner_invites table
-- ============================================================
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

create index if not exists idx_owner_invites_owner_id on public.owner_invites(owner_id);
create index if not exists idx_owner_invites_invited_email on public.owner_invites(lower(invited_email));
create index if not exists idx_owner_invites_token on public.owner_invites(token);
create index if not exists idx_owner_invites_status on public.owner_invites(status);

drop trigger if exists owner_invites_updated_at on public.owner_invites;
create trigger owner_invites_updated_at
before update on public.owner_invites
for each row execute procedure public.set_updated_at();

-- SECTION 2: Add can_view and display_role to property scopes
-- ============================================================
alter table public.owner_user_property_scopes
  add column if not exists can_view boolean not null default true,
  add column if not exists display_role text check (display_role in ('viewer', 'editor', 'manager'));

-- Set can_view = true for all existing scope rows
update public.owner_user_property_scopes
set can_view = true
where can_view is null or can_view = false;

-- SECTION 3: Database constraint fixes on properties table
-- ============================================================
-- Indian pincode: exactly 6 digits
alter table public.properties
  drop constraint if exists properties_pincode_format;
alter table public.properties
  add constraint properties_pincode_format
    check (pincode ~ '^\d{6}$');

-- Contact phone: 10 digits (Indian mobile without country code)
alter table public.properties
  drop constraint if exists properties_contact_phone_format;
alter table public.properties
  add constraint properties_contact_phone_format
    check (contact_phone ~ '^\d{10}$');

-- Email: allow empty or valid format
alter table public.properties
  drop constraint if exists properties_contact_email_format;
alter table public.properties
  add constraint properties_contact_email_format
    check (contact_email = '' or contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Property name: not blank, max 200
alter table public.properties
  drop constraint if exists properties_name_length;
alter table public.properties
  add constraint properties_name_length
    check (length(trim(name)) between 1 and 200);

-- City and State non-blank
alter table public.properties
  drop constraint if exists properties_city_notempty;
alter table public.properties
  add constraint properties_city_notempty
    check (length(trim(city)) > 0);

alter table public.properties
  drop constraint if exists properties_state_notempty;
alter table public.properties
  add constraint properties_state_notempty
    check (length(trim(state)) > 0);

-- SECTION 4: Tenant validation constraints
-- ============================================================
alter table public.tenants
  drop constraint if exists tenants_phone_format;
alter table public.tenants
  add constraint tenants_phone_format
    check (phone ~ '^\+?\d{10,15}$');

alter table public.tenants
  drop constraint if exists tenants_email_format;
alter table public.tenants
  add constraint tenants_email_format
    check (email = '' or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

alter table public.tenants
  drop constraint if exists tenants_parent_phone_format;
alter table public.tenants
  add constraint tenants_parent_phone_format
    check (parent_phone ~ '^\+?\d{10,15}$');

-- SECTION 5: Fix notifications RLS — restrict to owner only
-- ============================================================
drop policy if exists notifications_owner_scope_all on public.notifications;
drop policy if exists notifications_owner_all on public.notifications;
drop policy if exists notifications_admin_all on public.notifications;

create policy notifications_owner_only on public.notifications
for all
using (
  auth.uid() = owner_id
)
with check (
  auth.uid() = owner_id
);

create policy notifications_admin_all on public.notifications
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- SECTION 6: Fix owner_settings RLS
-- ============================================================
drop policy if exists owner_settings_owner_all on public.owner_settings;
drop policy if exists owner_settings_owner_scope_select on public.owner_settings;
drop policy if exists owner_settings_admin_all on public.owner_settings;

create policy owner_settings_owner_all on public.owner_settings
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy owner_settings_owner_scope_select on public.owner_settings
for select
using (owner_id = public.current_owner_scope_id());

create policy owner_settings_admin_all on public.owner_settings
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- SECTION 7: owner_invites RLS
-- ============================================================
alter table public.owner_invites enable row level security;

drop policy if exists owner_invites_owner_all on public.owner_invites;
drop policy if exists owner_invites_self_select on public.owner_invites;
drop policy if exists owner_invites_admin_all on public.owner_invites;

-- Owner manages their own invites
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

-- Invited email can see their own pending invite
create policy owner_invites_self_select on public.owner_invites
for select
using (
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

-- SECTION 8: Updated handle_new_auth_user with invite acceptance
-- ============================================================
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

  -- Validate role
  if resolved_role not in ('owner', 'owner_manager', 'staff', 'tenant', 'platform_admin', 'admin', 'super_admin') then
    resolved_role := 'owner';
  end if;

  -- Check for pending invite matching this email
  select * into pending_invite
  from public.owner_invites
  where lower(invited_email) = lower(new.email)
    and status = 'pending'
    and expires_at > now()
  order by invited_at desc
  limit 1;

  -- If invite found, override role with invite role
  if pending_invite.id is not null then
    resolved_role := pending_invite.role;
  end if;

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
  on conflict (id) do update
  set
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

  -- Create owner_settings and subscription ONLY for owners
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
      now() + interval '14 day', now() + interval '1 month'
    )
    on conflict (owner_id) do nothing;
  end if;

  -- If invite matched: create scope rows and mark invite accepted
  if pending_invite.id is not null then
    foreach prop_id in array pending_invite.property_ids loop
      insert into public.owner_user_property_scopes (
        owner_id, user_id, property_id,
        can_view,
        can_manage_properties,
        can_manage_tenants,
        can_manage_payments,
        can_manage_maintenance,
        can_manage_announcements,
        display_role
      ) values (
        pending_invite.owner_id, new.id, prop_id,
        true,
        false,
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

    -- Accept invite
    update public.owner_invites
    set status = 'accepted', accepted_at = now(), accepted_by = new.id
    where id = pending_invite.id;
  end if;

  return new;
end;
$$;

-- Ensure trigger on auth.users (requires superuser; run manually if this fails)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- SECTION 9: accept_pending_invite — for users who already have an account
-- ============================================================
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
  -- Find pending invite
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

  -- Update profile
  update public.profiles
  set
    role = pending_invite.role,
    owner_scope_id = pending_invite.owner_id,
    updated_at = now()
  where id = p_user_id;

  -- Create scope rows
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

  -- Accept invite
  update public.owner_invites
  set status = 'accepted', accepted_at = now(), accepted_by = p_user_id
  where id = pending_invite.id;

  return jsonb_build_object('success', true, 'owner_id', pending_invite.owner_id, 'role', pending_invite.role);
end;
$$;

-- SECTION 10: Backfill existing data
-- ============================================================
-- Set owner_scope_id = id where role = owner and null
update public.profiles
set owner_scope_id = id
where role = 'owner' and owner_scope_id is null;

-- Expire any stale pending invites
update public.owner_invites
set status = 'expired'
where status = 'pending' and expires_at < now();
