-- ============================================================
-- Core Management Domain Migration
-- 2026-05-23 — Full lifecycle, occupancy, vacate workflow, CSV import,
--              activity logs, and bed-based occupancy architecture.
-- ============================================================

-- ─── 1. EXTENDED TENANT STATUS ───────────────────────────────────────────────
-- Expand TenantStatus from 2 states to the full lifecycle state machine.

DO $$
BEGIN
  -- Add new status values to the enum if they don't exist
  -- (Postgres requires this via DO block for backward compatibility)
  ALTER TYPE IF EXISTS tenant_status_enum ADD VALUE IF NOT EXISTS 'pending_onboarding';
  ALTER TYPE IF EXISTS tenant_status_enum ADD VALUE IF NOT EXISTS 'payment_overdue';
  ALTER TYPE IF EXISTS tenant_status_enum ADD VALUE IF NOT EXISTS 'notice_submitted';
  ALTER TYPE IF EXISTS tenant_status_enum ADD VALUE IF NOT EXISTS 'vacating';
  ALTER TYPE IF EXISTS tenant_status_enum ADD VALUE IF NOT EXISTS 'archived';
EXCEPTION
  WHEN undefined_object THEN
    -- No enum type in use; status is a plain TEXT column — handled below.
    NULL;
END $$;

-- Ensure tenants.status allows the new values (if it's a check constraint)
DO $$
BEGIN
  ALTER TABLE tenants
    DROP CONSTRAINT IF EXISTS tenants_status_check;

  ALTER TABLE tenants
    ADD CONSTRAINT tenants_status_check CHECK (status IN (
      'pending_onboarding',
      'active',
      'payment_overdue',
      'notice_submitted',
      'vacating',
      'inactive',
      'archived'
    ));
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Add vacate lifecycle columns to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS vacate_date DATE,
  ADD COLUMN IF NOT EXISTS vacate_reason TEXT;

-- ─── 2. OCCUPANCY MODE ON PROPERTIES ─────────────────────────────────────────

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS occupancy_mode TEXT NOT NULL DEFAULT 'BED_BASED'
    CHECK (occupancy_mode IN ('BED_BASED', 'ROOM_BASED'));

COMMENT ON COLUMN properties.occupancy_mode IS
  'BED_BASED: track individual beds per room. ROOM_BASED: track full room as one unit.';

-- ─── 3. VACATE REQUESTS TABLE ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vacate_requests (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_name            TEXT NOT NULL,
  property_id            UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room                   TEXT NOT NULL,
  notice_date            DATE NOT NULL,
  planned_vacate_date    DATE NOT NULL,
  reason                 TEXT NOT NULL DEFAULT '',
  final_settlement_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_refund         NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_deduction      NUMERIC(10,2) NOT NULL DEFAULT 0,
  deduction_reason       TEXT NOT NULL DEFAULT '',
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS vacate_requests_owner_id_idx
  ON vacate_requests (owner_id);
CREATE INDEX IF NOT EXISTS vacate_requests_tenant_id_idx
  ON vacate_requests (tenant_id);
CREATE INDEX IF NOT EXISTS vacate_requests_property_id_idx
  ON vacate_requests (property_id);
CREATE INDEX IF NOT EXISTS vacate_requests_status_idx
  ON vacate_requests (status);

-- RLS
ALTER TABLE vacate_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vacate_requests_owner_access ON vacate_requests;
CREATE POLICY vacate_requests_owner_access ON vacate_requests
  FOR ALL USING (
    owner_id = auth.uid()
    OR owner_id IN (
      SELECT owner_scope_id FROM profiles WHERE id = auth.uid() AND owner_scope_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_admin', 'admin', 'super_admin')
    )
  );

-- ─── 4. ACTIVITY LOG TABLE ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  event       TEXT NOT NULL,
  detail      TEXT NOT NULL DEFAULT '',
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS activity_logs_owner_id_idx
  ON activity_logs (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_property_id_idx
  ON activity_logs (property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_event_idx
  ON activity_logs (event);

-- RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_logs_owner_access ON activity_logs;
CREATE POLICY activity_logs_owner_access ON activity_logs
  FOR ALL USING (
    owner_id = auth.uid()
    OR owner_id IN (
      SELECT owner_scope_id FROM profiles WHERE id = auth.uid() AND owner_scope_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_admin', 'admin', 'super_admin')
    )
  );

-- ─── 5. BEDS TABLE (BED_BASED mode fine-grained tracking) ────────────────────

CREATE TABLE IF NOT EXISTS beds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bed_number  SMALLINT NOT NULL DEFAULT 1,
  label       TEXT NOT NULL DEFAULT '',  -- e.g. 'A', 'B', 'Top', 'Bottom'
  tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'vacant'
                CHECK (status IN ('occupied', 'vacant', 'reserved', 'maintenance')),
  rent        NUMERIC(10,2),  -- override room rent for this bed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, bed_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS beds_room_id_idx     ON beds (room_id);
CREATE INDEX IF NOT EXISTS beds_property_id_idx ON beds (property_id);
CREATE INDEX IF NOT EXISTS beds_tenant_id_idx   ON beds (tenant_id);
CREATE INDEX IF NOT EXISTS beds_status_idx      ON beds (status);

-- RLS
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS beds_owner_access ON beds;
CREATE POLICY beds_owner_access ON beds
  FOR ALL USING (
    owner_id = auth.uid()
    OR owner_id IN (
      SELECT owner_scope_id FROM profiles WHERE id = auth.uid() AND owner_scope_id IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('platform_admin', 'admin', 'super_admin')
    )
  );

-- ─── 6. CSV IMPORT LOG TABLE ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS csv_import_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  total_rows  INTEGER NOT NULL DEFAULT 0,
  succeeded   INTEGER NOT NULL DEFAULT 0,
  failed      INTEGER NOT NULL DEFAULT 0,
  errors      JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS csv_import_logs_owner_id_idx
  ON csv_import_logs (owner_id, created_at DESC);

ALTER TABLE csv_import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS csv_import_logs_owner_access ON csv_import_logs;
CREATE POLICY csv_import_logs_owner_access ON csv_import_logs
  FOR ALL USING (
    owner_id = auth.uid()
    OR owner_id IN (
      SELECT owner_scope_id FROM profiles WHERE id = auth.uid() AND owner_scope_id IS NOT NULL
    )
  );

-- ─── 7. REALTIME SUBSCRIPTIONS ────────────────────────────────────────────────
-- Enable realtime for new tables so frontend hooks pick up changes.

DO $$
BEGIN
  -- vacate_requests realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'vacate_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE vacate_requests;
  END IF;

  -- activity_logs realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'activity_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
  END IF;

  -- beds realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'beds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE beds;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL; -- publication may not exist in local dev
END $$;

-- ─── 8. TRIGGERS — AUTO-ACTIVITY LOG ON TENANT STATUS CHANGE ─────────────────

CREATE OR REPLACE FUNCTION log_tenant_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_logs (owner_id, property_id, event, detail, metadata)
    VALUES (
      NEW.owner_id,
      NEW.property_id,
      'TENANT_STATUS_CHANGED',
      format('%s status changed: %s → %s', NEW.name, OLD.status, NEW.status),
      jsonb_build_object(
        'tenantId', NEW.id,
        'tenantName', NEW.name,
        'previousStatus', OLD.status,
        'newStatus', NEW.status,
        'room', NEW.room,
        'floor', NEW.floor
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_status_change_log ON tenants;
CREATE TRIGGER tenant_status_change_log
  AFTER UPDATE OF status ON tenants
  FOR EACH ROW EXECUTE FUNCTION log_tenant_status_change();

-- ─── 9. TRIGGER — AUTO-SYNC ROOM OCCUPANCY ON TENANT CHANGE ─────────────────

CREATE OR REPLACE FUNCTION sync_room_occupancy_on_tenant_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_active_count INTEGER;
  v_room_beds    INTEGER;
  v_new_status   TEXT;
  v_current_room_status TEXT;
  v_room_id      UUID;
BEGIN
  -- Determine which tenant's room to sync (NEW for INSERT/UPDATE, OLD for DELETE)
  IF TG_OP = 'DELETE' THEN
    SELECT id, beds, status INTO v_room_id, v_room_beds, v_current_room_status
    FROM rooms
    WHERE property_id = OLD.property_id
      AND floor = OLD.floor
      AND LOWER(number) = LOWER(OLD.room)
    LIMIT 1;
  ELSE
    SELECT id, beds, status INTO v_room_id, v_room_beds, v_current_room_status
    FROM rooms
    WHERE property_id = NEW.property_id
      AND floor = NEW.floor
      AND LOWER(number) = LOWER(NEW.room)
    LIMIT 1;

    -- Also sync old room if tenant moved rooms
    IF TG_OP = 'UPDATE' AND (OLD.room IS DISTINCT FROM NEW.room OR OLD.floor IS DISTINCT FROM NEW.floor) THEN
      PERFORM sync_single_room(OLD.property_id, OLD.floor, OLD.room);
    END IF;
  END IF;

  IF v_room_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_current_room_status = 'maintenance' THEN
    RETURN NEW;
  END IF;

  -- Count active tenants (all in-room lifecycle states)
  IF TG_OP = 'DELETE' THEN
    SELECT COUNT(*) INTO v_active_count
    FROM tenants
    WHERE property_id = OLD.property_id
      AND floor = OLD.floor
      AND LOWER(room) = LOWER(OLD.room)
      AND status IN ('active', 'payment_overdue', 'notice_submitted', 'vacating');
  ELSE
    SELECT COUNT(*) INTO v_active_count
    FROM tenants
    WHERE property_id = NEW.property_id
      AND floor = NEW.floor
      AND LOWER(room) = LOWER(NEW.room)
      AND status IN ('active', 'payment_overdue', 'notice_submitted', 'vacating');
  END IF;

  v_new_status := CASE WHEN v_active_count > 0 THEN 'occupied' ELSE 'vacant' END;

  UPDATE rooms
  SET
    occupied_beds = LEAST(v_active_count, COALESCE(v_room_beds, 1)),
    status = v_new_status
  WHERE id = v_room_id;

  RETURN NEW;
END;
$$;

-- Helper function for syncing a specific room by floor/number
CREATE OR REPLACE FUNCTION sync_single_room(p_property_id UUID, p_floor INTEGER, p_room TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_room_id UUID;
  v_room_beds INTEGER;
  v_current_status TEXT;
  v_active_count INTEGER;
  v_new_status TEXT;
BEGIN
  SELECT id, beds, status INTO v_room_id, v_room_beds, v_current_status
  FROM rooms
  WHERE property_id = p_property_id AND floor = p_floor AND LOWER(number) = LOWER(p_room)
  LIMIT 1;

  IF v_room_id IS NULL OR v_current_status = 'maintenance' THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_active_count
  FROM tenants
  WHERE property_id = p_property_id
    AND floor = p_floor
    AND LOWER(room) = LOWER(p_room)
    AND status IN ('active', 'payment_overdue', 'notice_submitted', 'vacating');

  v_new_status := CASE WHEN v_active_count > 0 THEN 'occupied' ELSE 'vacant' END;

  UPDATE rooms
  SET
    occupied_beds = LEAST(v_active_count, COALESCE(v_room_beds, 1)),
    status = v_new_status
  WHERE id = v_room_id;
END;
$$;

DROP TRIGGER IF EXISTS sync_room_on_tenant_change ON tenants;
CREATE TRIGGER sync_room_on_tenant_change
  AFTER INSERT OR UPDATE OF status, room, floor, property_id OR DELETE ON tenants
  FOR EACH ROW EXECUTE FUNCTION sync_room_occupancy_on_tenant_change();

-- ─── 10. STORAGE BUCKET SETUP ────────────────────────────────────────────────
-- Create tenant-files bucket if not exists (idempotent).
-- Run this via Supabase Dashboard > Storage if the SQL editor blocks storage operations.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-files',
  'tenant-files',
  FALSE,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: owners can read/write their own tenant files
DROP POLICY IF EXISTS tenant_files_owner_upload ON storage.objects;
CREATE POLICY tenant_files_owner_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tenant-files'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS tenant_files_owner_select ON storage.objects;
CREATE POLICY tenant_files_owner_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'tenant-files'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS tenant_files_owner_delete ON storage.objects;
CREATE POLICY tenant_files_owner_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tenant-files'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ─── 11. PROPERTY OCCUPANCY SUMMARY VIEW ─────────────────────────────────────

CREATE OR REPLACE VIEW property_occupancy_summary AS
SELECT
  p.id                                            AS property_id,
  p.owner_id,
  p.name                                          AS property_name,
  p.occupancy_mode,
  COUNT(r.id)                                     AS total_rooms,
  COUNT(r.id) FILTER (WHERE r.status = 'occupied')     AS occupied_rooms,
  COUNT(r.id) FILTER (WHERE r.status = 'vacant')       AS vacant_rooms,
  COUNT(r.id) FILTER (WHERE r.status = 'maintenance')  AS maintenance_rooms,
  COALESCE(SUM(r.beds), 0)                        AS total_beds,
  COALESCE(SUM(r.occupied_beds), 0)               AS occupied_beds,
  COUNT(t.id) FILTER (WHERE t.status IN (
    'active', 'payment_overdue', 'notice_submitted', 'vacating'
  ))                                              AS active_tenants,
  COUNT(t.id) FILTER (WHERE t.status IN ('notice_submitted', 'vacating'))
                                                  AS pending_vacates,
  CASE
    WHEN COALESCE(SUM(r.beds), 0) = 0 THEN 0
    ELSE ROUND(
      COALESCE(SUM(r.occupied_beds), 0)::NUMERIC / NULLIF(SUM(r.beds), 0) * 100,
      1
    )
  END                                             AS occupancy_rate_pct
FROM properties p
LEFT JOIN rooms r ON r.property_id = p.id
LEFT JOIN tenants t ON t.property_id = p.id
GROUP BY p.id, p.owner_id, p.name, p.occupancy_mode;

-- Restrict view access by RLS equivalent (filter by auth context)
COMMENT ON VIEW property_occupancy_summary IS
  'Aggregated occupancy metrics per property. Filter by owner_id = auth.uid() at query time.';

-- ─── DONE ────────────────────────────────────────────────────────────────────
