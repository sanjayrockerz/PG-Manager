-- ================================================================
-- RentCare: OPERATIONS & COMMUNICATIONS LAYER
-- File: 20260524_operations_comms.sql
--
-- Adds:
--   1. maintenance_threads       — Linear-style ticket thread entries
--   2. notifications             — Event-driven notification store
--   3. whatsapp_queue            — Broadcast delivery queue
--   4. maintenance_tickets cols  — assigned_to, updated_at, resolved_at
--   5. maintenance_tickets.source enum extension (5 sources)
--   6. RLS policies for all new tables
--   7. Realtime publication
-- ================================================================

-- ================================================================
-- 1. MAINTENANCE SOURCE ENUM EXTENSION
-- ================================================================
-- Extend existing source type to include all 5 sources.
-- Supabase/Postgres requires adding enum values individually.

do $$ begin
  begin alter type public.maintenance_source add value 'admin_created'; exception when duplicate_object then null; end;
  begin alter type public.maintenance_source add value 'staff_created'; exception when duplicate_object then null; end;
  begin alter type public.maintenance_source add value 'portal'; exception when duplicate_object then null; end;
exception when undefined_object then
  -- enum didn't exist yet; create it fresh
  create type public.maintenance_source as enum ('portal', 'manual', 'admin_created', 'whatsapp', 'staff_created');
end $$;

-- ================================================================
-- 2. MAINTENANCE_TICKETS COLUMN EXTENSIONS
-- ================================================================

alter table public.maintenance_tickets
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at  timestamptz not null default now(),
  add column if not exists resolved_at timestamptz;

-- Back-fill updated_at from created_at where null / default
update public.maintenance_tickets
  set updated_at = created_at
  where updated_at = '1970-01-01T00:00:00Z' or updated_at is null;

-- Auto-update trigger
create or replace function public.set_maintenance_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_maintenance_updated_at on public.maintenance_tickets;
create trigger trg_maintenance_updated_at
  before update on public.maintenance_tickets
  for each row execute procedure public.set_maintenance_updated_at();

-- ================================================================
-- 3. MAINTENANCE_THREADS TABLE
-- ================================================================

create table if not exists public.maintenance_threads (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid not null references public.maintenance_tickets(id) on delete cascade,
  actor_id      uuid references public.profiles(id) on delete set null,
  actor_role    text not null default 'owner'
    check (actor_role in ('owner', 'owner_manager', 'staff', 'tenant', 'system')),
  body          text not null,
  is_internal   boolean not null default false,
  status_from   text,   -- previous status at time of entry
  status_to     text,   -- new status (populated on transitions)
  created_at    timestamptz not null default now()
);

create index if not exists idx_maintenance_threads_ticket_id
  on public.maintenance_threads(ticket_id);

create index if not exists idx_maintenance_threads_created_at
  on public.maintenance_threads(created_at desc);

-- RLS
alter table public.maintenance_threads enable row level security;

-- Owner / manager: can read/write threads for their own tickets
create policy "owners_can_manage_threads"
  on public.maintenance_threads
  for all
  using (
    exists (
      select 1 from public.maintenance_tickets mt
      join public.properties p on p.id = mt.property_id
      where mt.id = maintenance_threads.ticket_id
        and p.owner_id = auth.uid()
    )
  );

-- Tenant: can read public (non-internal) threads for their own tickets
create policy "tenants_can_read_public_threads"
  on public.maintenance_threads
  for select
  using (
    is_internal = false
    and exists (
      select 1 from public.maintenance_tickets mt
      where mt.id = maintenance_threads.ticket_id
        and mt.tenant_id = auth.uid()
    )
  );

-- Tenant: can insert their own thread entries (non-internal)
create policy "tenants_can_add_threads"
  on public.maintenance_threads
  for insert
  with check (
    is_internal = false
    and actor_id = auth.uid()
    and exists (
      select 1 from public.maintenance_tickets mt
      where mt.id = maintenance_threads.ticket_id
        and mt.tenant_id = auth.uid()
    )
  );

-- ================================================================
-- 4. NOTIFICATIONS TABLE
-- ================================================================

create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  type          text not null
    check (type in ('payment', 'maintenance', 'tenant', 'announcement', 'occupancy', 'system')),
  title         text not null,
  message       text not null,
  entity_type   text,   -- 'maintenance_ticket' | 'payment' | 'tenant' | 'announcement'
  entity_id     uuid,   -- FK to the relevant entity
  property_id   uuid references public.properties(id) on delete cascade,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_notifications_owner_id
  on public.notifications(owner_id);

create index if not exists idx_notifications_read
  on public.notifications(owner_id, read) where read = false;

create index if not exists idx_notifications_created_at
  on public.notifications(owner_id, created_at desc);

-- RLS
alter table public.notifications enable row level security;

create policy "owners_manage_own_notifications"
  on public.notifications
  for all
  using (owner_id = auth.uid());

-- ================================================================
-- 5. WHATSAPP_QUEUE TABLE
-- ================================================================

create table if not exists public.whatsapp_queue (
  id               uuid primary key default gen_random_uuid(),
  announcement_id  uuid not null references public.announcements(id) on delete cascade,
  property_id      uuid references public.properties(id) on delete set null,
  status           text not null default 'queued'
    check (status in ('queued', 'sending', 'delivered', 'failed')),
  recipient_count  int not null default 0,
  sent_count       int not null default 0,
  created_at       timestamptz not null default now(),
  delivered_at     timestamptz
);

create index if not exists idx_whatsapp_queue_announcement
  on public.whatsapp_queue(announcement_id);

create index if not exists idx_whatsapp_queue_status
  on public.whatsapp_queue(status) where status in ('queued', 'sending');

-- RLS
alter table public.whatsapp_queue enable row level security;

create policy "owners_manage_whatsapp_queue"
  on public.whatsapp_queue
  for all
  using (
    exists (
      select 1 from public.announcements a
      join public.properties p on p.id = a.property_id
      where a.id = whatsapp_queue.announcement_id
        and p.owner_id = auth.uid()
    )
    or (
      -- global announcements (property_id null) — any owner can see theirs
      whatsapp_queue.property_id is null
      and exists (
        select 1 from public.announcements a
        where a.id = whatsapp_queue.announcement_id
          and a.owner_id = auth.uid()
      )
    )
  );

-- ================================================================
-- 6. REALTIME SUBSCRIPTIONS
-- ================================================================

-- Enable realtime for new tables
alter publication supabase_realtime add table public.maintenance_threads;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.whatsapp_queue;

-- ================================================================
-- 7. HELPER FUNCTION: MARK NOTIFICATION READ
-- ================================================================

create or replace function public.mark_notification_read(notification_id uuid)
returns void language sql security definer as $$
  update public.notifications
    set read = true
  where id = notification_id
    and owner_id = auth.uid();
$$;

create or replace function public.mark_all_notifications_read()
returns void language sql security definer as $$
  update public.notifications
    set read = true
  where owner_id = auth.uid()
    and read = false;
$$;

-- ================================================================
-- DONE
-- ================================================================
