-- ============================================================
-- Invite token acceptance + audit logging
-- 2026-05-26
-- ============================================================

-- 1) Public lookup for invite by token (used pre-auth for invite UI)
create or replace function public.get_invite_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_invite record;
  expired boolean;
begin
  select * into pending_invite
  from public.owner_invites
  where token = p_token
  limit 1;

  if pending_invite.id is null then
    return jsonb_build_object('found', false);
  end if;

  expired := pending_invite.expires_at < now();

  if pending_invite.status <> 'pending' or expired then
    return jsonb_build_object(
      'found', false,
      'status', pending_invite.status,
      'expired', expired
    );
  end if;

  return jsonb_build_object(
    'found', true,
    'invite', jsonb_build_object(
      'id', pending_invite.id,
      'owner_id', pending_invite.owner_id,
      'invited_email', pending_invite.invited_email,
      'display_role', pending_invite.display_role,
      'property_ids', pending_invite.property_ids,
      'expires_at', pending_invite.expires_at,
      'status', pending_invite.status
    )
  );
end;
$$;

-- 2) Refresh invite token and expiry (owner-only RPC)
create or replace function public.refresh_owner_invite_token(p_invite_id uuid, p_expires_at timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_invite record;
  next_expiry timestamptz;
begin
  next_expiry := coalesce(p_expires_at, now() + interval '7 days');

  update public.owner_invites
  set
    token = encode(gen_random_bytes(24), 'hex'),
    expires_at = next_expiry,
    status = 'pending',
    updated_at = now()
  where id = p_invite_id
  returning * into updated_invite;

  if updated_invite.id is null then
    return jsonb_build_object('success', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object('success', true, 'token', updated_invite.token, 'expires_at', updated_invite.expires_at);
end;
$$;

-- 3) Accept invite by token (for logged-in users)
create or replace function public.accept_invite_by_token(p_user_id uuid, p_email text, p_token text)
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
  where token = p_token
    and status = 'pending'
    and expires_at > now()
  order by invited_at desc
  limit 1;

  if pending_invite.id is null then
    return jsonb_build_object('success', false, 'reason', 'no_pending_invite');
  end if;

  if lower(pending_invite.invited_email) <> lower(p_email) then
    return jsonb_build_object('success', false, 'reason', 'email_mismatch');
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

  insert into public.activity_logs (
    owner_id,
    property_id,
    event,
    detail,
    metadata
  ) values (
    pending_invite.owner_id,
    null,
    'TEAM_INVITE_ACCEPTED',
    'Invite accepted by ' || lower(p_email),
    jsonb_build_object('inviteId', pending_invite.id, 'userId', p_user_id)
  );

  return jsonb_build_object('success', true, 'owner_id', pending_invite.owner_id, 'role', pending_invite.role);
end;
$$;

-- 4) Add audit logging to accept_pending_invite (existing users)
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

  insert into public.activity_logs (
    owner_id,
    property_id,
    event,
    detail,
    metadata
  ) values (
    pending_invite.owner_id,
    null,
    'TEAM_INVITE_ACCEPTED',
    'Invite accepted by ' || lower(p_email),
    jsonb_build_object('inviteId', pending_invite.id, 'userId', p_user_id)
  );

  return jsonb_build_object('success', true, 'owner_id', pending_invite.owner_id, 'role', pending_invite.role);
end;
$$;

-- 5) Add audit logging to handle_new_auth_user
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

  if resolved_role not in ('owner', 'owner_manager', 'staff', 'tenant', 'platform_admin', 'admin', 'super_admin') then
    resolved_role := 'owner';
  end if;

  select * into pending_invite
  from public.owner_invites
  where lower(invited_email) = lower(new.email)
    and status = 'pending'
    and expires_at > now()
  order by invited_at desc
  limit 1;

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

    update public.owner_invites
    set status = 'accepted', accepted_at = now(), accepted_by = new.id
    where id = pending_invite.id;

    insert into public.activity_logs (
      owner_id,
      property_id,
      event,
      detail,
      metadata
    ) values (
      pending_invite.owner_id,
      null,
      'TEAM_INVITE_ACCEPTED',
      'Invite accepted by ' || lower(new.email),
      jsonb_build_object('inviteId', pending_invite.id, 'userId', new.id)
    );
  end if;

  return new;
end;
$$;
