-- Multi-owner RBAC, support tickets, subscriptions, and normalized property addresses.
-- Safe to run multiple times.

-- 1) Role model upgrades and owner scope mapping.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add column if not exists owner_scope_id uuid references public.profiles(id) on delete set null;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'owner_manager', 'staff', 'tenant', 'platform_admin', 'admin', 'super_admin'));

create index if not exists idx_profiles_owner_scope_id on public.profiles(owner_scope_id);

-- Keep owner scope deterministic for owner accounts.
update public.profiles
set owner_scope_id = id
where role = 'owner'
  and owner_scope_id is null;

-- 2) Normalized address fields on properties.
alter table public.properties
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists locality text,
  add column if not exists landmark text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists formatted_address text;

update public.properties
set
  address_line1 = coalesce(address_line1, address),
  locality = coalesce(locality, city),
  formatted_address = coalesce(formatted_address, concat_ws(', ', address, city, state, pincode))
where
  address_line1 is null
  or locality is null
  or formatted_address is null;

-- 3) Scoped staff access table (property-level capability matrix).
create table if not exists public.owner_user_property_scopes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  can_manage_properties boolean not null default false,
  can_manage_tenants boolean not null default false,
  can_manage_payments boolean not null default false,
  can_manage_maintenance boolean not null default false,
  can_manage_announcements boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create index if not exists idx_owner_user_property_scopes_owner_id on public.owner_user_property_scopes(owner_id);
create index if not exists idx_owner_user_property_scopes_user_id on public.owner_user_property_scopes(user_id);
create index if not exists idx_owner_user_property_scopes_property_id on public.owner_user_property_scopes(property_id);

-- 4) Owner subscription table.
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

insert into public.owner_subscriptions (owner_id, plan_code, status, billing_cycle, amount, currency, seats, trial_ends_at, renews_at)
select
  profile.id,
  'starter',
  'trialing',
  'monthly',
  0,
  'INR',
  1,
  now() + interval '14 day',
  now() + interval '1 month'
from public.profiles profile
where profile.role = 'owner'
  and not exists (
    select 1
    from public.owner_subscriptions subscription
    where subscription.owner_id = profile.id
  );

-- 5) Support ticketing module.
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

create index if not exists idx_support_tickets_owner_id on public.support_tickets(owner_id);
create index if not exists idx_support_tickets_property_id on public.support_tickets(property_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_tickets_created_by on public.support_tickets(created_by);

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

-- 6) Updated_at triggers for new mutable tables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists owner_user_property_scopes_updated_at on public.owner_user_property_scopes;
create trigger owner_user_property_scopes_updated_at
before update on public.owner_user_property_scopes
for each row execute procedure public.set_updated_at();

drop trigger if exists owner_subscriptions_updated_at on public.owner_subscriptions;
create trigger owner_subscriptions_updated_at
before update on public.owner_subscriptions
for each row execute procedure public.set_updated_at();

drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at
before update on public.support_tickets
for each row execute procedure public.set_updated_at();

-- 7) Role and scope helper functions.
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
  select coalesce(public.current_user_role() in ('platform_admin', 'admin', 'super_admin'), false);
$$;

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
                when 'properties' then scope.can_manage_properties
                when 'tenants' then scope.can_manage_tenants
                when 'payments' then scope.can_manage_payments
                when 'maintenance' then scope.can_manage_maintenance
                when 'announcements' then scope.can_manage_announcements
                else false
              end
          )
        )
    );
$$;

-- 8) Include subscription bootstrap for newly-created owner profiles.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb;
  owner_settings_exists boolean;
  resolved_role text;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  resolved_role := coalesce(metadata ->> 'role', 'owner');

  insert into public.profiles (id, email, full_name, phone, role, pg_name, city, owner_scope_id)
  values (
    new.id,
    new.email,
    coalesce(metadata ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    metadata ->> 'phone',
    resolved_role,
    metadata ->> 'pgName',
    metadata ->> 'city',
    case
      when resolved_role = 'owner' then new.id
      else null
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    role = coalesce(excluded.role, public.profiles.role),
    pg_name = coalesce(excluded.pg_name, public.profiles.pg_name),
    city = coalesce(excluded.city, public.profiles.city),
    owner_scope_id = case
      when coalesce(excluded.role, public.profiles.role) = 'owner' then public.profiles.id
      else coalesce(public.profiles.owner_scope_id, excluded.owner_scope_id)
    end,
    updated_at = now();

  select exists (
    select 1 from public.owner_settings where owner_id = new.id
  ) into owner_settings_exists;

  if not owner_settings_exists then
    insert into public.owner_settings (owner_id)
    values (new.id);
  end if;

  if resolved_role = 'owner' then
    insert into public.owner_subscriptions (owner_id, plan_code, status, billing_cycle, amount, currency, seats, trial_ends_at, renews_at)
    values (new.id, 'starter', 'trialing', 'monthly', 0, 'INR', 1, now() + interval '14 day', now() + interval '1 month')
    on conflict (owner_id) do nothing;
  end if;

  return new;
end;
$$;

-- 9) RLS enablement for new tables.
alter table public.owner_user_property_scopes enable row level security;
alter table public.owner_subscriptions enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_comments enable row level security;

-- 10) Policy refresh for existing + new tables.
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
using (
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

-- Owner settings: owner manages, scoped staff can read, platform admins have full control.
drop policy if exists owner_settings_owner_all on public.owner_settings;
drop policy if exists owner_settings_admin_all on public.owner_settings;
drop policy if exists owner_settings_owner_scope_select on public.owner_settings;
drop policy if exists owner_settings_anon_all on public.owner_settings;

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

-- Properties.
drop policy if exists properties_owner_all on public.properties;
drop policy if exists properties_owner_select on public.properties;
drop policy if exists properties_owner_manage on public.properties;
drop policy if exists properties_admin_all on public.properties;
drop policy if exists properties_tenant_select on public.properties;
drop policy if exists properties_anon_all on public.properties;

create policy properties_owner_select on public.properties
for select
using (
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
for select
using (
  exists (
    select 1
    from public.tenants tenant
    where tenant.property_id = properties.id
      and public.current_user_matches_tenant(tenant.email, tenant.phone)
  )
);

-- Rooms.
drop policy if exists rooms_owner_all on public.rooms;
drop policy if exists rooms_owner_select on public.rooms;
drop policy if exists rooms_owner_manage on public.rooms;
drop policy if exists rooms_admin_all on public.rooms;
drop policy if exists rooms_tenant_select on public.rooms;
drop policy if exists rooms_anon_all on public.rooms;

create policy rooms_owner_select on public.rooms
for select
using (public.current_user_has_property_scope(rooms.property_id));

create policy rooms_owner_manage on public.rooms
for all
using (public.current_user_has_property_capability(rooms.property_id, 'properties'))
with check (public.current_user_has_property_capability(rooms.property_id, 'properties'));

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
    where tenant.property_id = rooms.property_id
      and public.current_user_matches_tenant(tenant.email, tenant.phone)
  )
);

-- Tenants.
drop policy if exists tenants_owner_all on public.tenants;
drop policy if exists tenants_owner_select on public.tenants;
drop policy if exists tenants_owner_manage on public.tenants;
drop policy if exists tenants_admin_all on public.tenants;
drop policy if exists tenants_tenant_select on public.tenants;
drop policy if exists tenants_anon_all on public.tenants;

create policy tenants_owner_select on public.tenants
for select
using (
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
for select
using (public.current_user_matches_tenant(email, phone));

-- Payments.
drop policy if exists payments_owner_all on public.payments;
drop policy if exists payments_owner_select on public.payments;
drop policy if exists payments_owner_manage on public.payments;
drop policy if exists payments_admin_all on public.payments;
drop policy if exists payments_tenant_select on public.payments;
drop policy if exists payments_anon_all on public.payments;

create policy payments_owner_select on public.payments
for select
using (
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
for select
using (
  exists (
    select 1
    from public.tenants tenant
    where tenant.id = payments.tenant_id
      and public.current_user_matches_tenant(tenant.email, tenant.phone)
  )
);

-- Payment charges.
drop policy if exists payment_charges_owner_all on public.payment_charges;
drop policy if exists payment_charges_owner_select on public.payment_charges;
drop policy if exists payment_charges_owner_manage on public.payment_charges;
drop policy if exists payment_charges_admin_all on public.payment_charges;
drop policy if exists payment_charges_tenant_select on public.payment_charges;
drop policy if exists payment_charges_anon_all on public.payment_charges;

create policy payment_charges_owner_select on public.payment_charges
for select
using (
  exists (
    select 1
    from public.payments payment
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
    select 1
    from public.payments payment
    where payment.id = payment_charges.payment_id
      and payment.owner_id = public.current_owner_scope_id()
      and public.current_user_has_property_capability(payment.property_id, 'payments')
  )
)
with check (
  exists (
    select 1
    from public.payments payment
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

-- Maintenance tickets.
drop policy if exists maintenance_owner_all on public.maintenance_tickets;
drop policy if exists maintenance_owner_select on public.maintenance_tickets;
drop policy if exists maintenance_owner_manage on public.maintenance_tickets;
drop policy if exists maintenance_admin_all on public.maintenance_tickets;
drop policy if exists maintenance_tenant_select on public.maintenance_tickets;
drop policy if exists maintenance_tenant_insert on public.maintenance_tickets;
drop policy if exists maintenance_tickets_anon_all on public.maintenance_tickets;

create policy maintenance_owner_select on public.maintenance_tickets
for select
using (
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
  public.current_user_role() = 'tenant'
  and exists (
    select 1
    from public.tenants tenant
    where tenant.id = maintenance_tickets.tenant_id
      and tenant.owner_id = maintenance_tickets.owner_id
      and tenant.property_id = maintenance_tickets.property_id
      and public.current_user_matches_tenant(tenant.email, tenant.phone)
  )
);

-- Maintenance notes.
drop policy if exists maintenance_notes_owner_all on public.maintenance_notes;
drop policy if exists maintenance_notes_owner_select on public.maintenance_notes;
drop policy if exists maintenance_notes_owner_manage on public.maintenance_notes;
drop policy if exists maintenance_notes_admin_all on public.maintenance_notes;
drop policy if exists maintenance_notes_tenant_select on public.maintenance_notes;
drop policy if exists maintenance_notes_anon_all on public.maintenance_notes;

create policy maintenance_notes_owner_select on public.maintenance_notes
for select
using (
  exists (
    select 1
    from public.maintenance_tickets ticket
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
    select 1
    from public.maintenance_tickets ticket
    where ticket.id = maintenance_notes.ticket_id
      and ticket.owner_id = public.current_owner_scope_id()
      and public.current_user_has_property_capability(ticket.property_id, 'maintenance')
  )
)
with check (
  exists (
    select 1
    from public.maintenance_tickets ticket
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

-- Announcements.
drop policy if exists announcements_owner_all on public.announcements;
drop policy if exists announcements_owner_select on public.announcements;
drop policy if exists announcements_owner_manage on public.announcements;
drop policy if exists announcements_admin_all on public.announcements;
drop policy if exists announcements_tenant_select on public.announcements;
drop policy if exists announcements_anon_all on public.announcements;

create policy announcements_owner_select on public.announcements
for select
using (
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

-- Notifications.
drop policy if exists notifications_owner_all on public.notifications;
drop policy if exists notifications_owner_scope_all on public.notifications;
drop policy if exists notifications_admin_all on public.notifications;
drop policy if exists notifications_anon_all on public.notifications;

create policy notifications_owner_scope_all on public.notifications
for all
using (owner_id = public.current_owner_scope_id())
with check (owner_id = public.current_owner_scope_id());

create policy notifications_admin_all on public.notifications
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- Scoped access table policies.
drop policy if exists owner_user_property_scopes_owner_all on public.owner_user_property_scopes;
drop policy if exists owner_user_property_scopes_self_select on public.owner_user_property_scopes;
drop policy if exists owner_user_property_scopes_admin_all on public.owner_user_property_scopes;

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
for select
using (user_id = auth.uid() or owner_id = public.current_owner_scope_id());

create policy owner_user_property_scopes_admin_all on public.owner_user_property_scopes
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- Subscription policies.
drop policy if exists owner_subscriptions_owner_all on public.owner_subscriptions;
drop policy if exists owner_subscriptions_owner_scope_select on public.owner_subscriptions;
drop policy if exists owner_subscriptions_admin_all on public.owner_subscriptions;

create policy owner_subscriptions_owner_all on public.owner_subscriptions
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy owner_subscriptions_owner_scope_select on public.owner_subscriptions
for select
using (owner_id = public.current_owner_scope_id());

create policy owner_subscriptions_admin_all on public.owner_subscriptions
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- Support ticket policies.
drop policy if exists support_tickets_owner_scope_select on public.support_tickets;
drop policy if exists support_tickets_owner_scope_insert on public.support_tickets;
drop policy if exists support_tickets_owner_scope_update on public.support_tickets;
drop policy if exists support_tickets_admin_all on public.support_tickets;

create policy support_tickets_owner_scope_select on public.support_tickets
for select
using (
  owner_id = public.current_owner_scope_id()
  and (
    public.current_user_role() = 'owner'
    or property_id is null
    or public.current_user_has_property_scope(property_id)
  )
);

create policy support_tickets_owner_scope_insert on public.support_tickets
for insert
with check (
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

-- Support comments policies.
drop policy if exists support_ticket_comments_owner_scope_select on public.support_ticket_comments;
drop policy if exists support_ticket_comments_owner_scope_insert on public.support_ticket_comments;
drop policy if exists support_ticket_comments_admin_all on public.support_ticket_comments;

create policy support_ticket_comments_owner_scope_select on public.support_ticket_comments
for select
using (
  exists (
    select 1
    from public.support_tickets ticket
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
for insert
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.support_tickets ticket
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
