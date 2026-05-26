-- ─── Daily Operations Workflow Completion ────────────────────────────────────
-- Migration: 20260526_daily_ops_workflow
-- Ensures all columns and tables required by the operational workflow phase exist.

-- ─── 1. VACATE REQUESTS — add deduction_items JSONB ──────────────────────────
ALTER TABLE vacate_requests
  ADD COLUMN IF NOT EXISTS deduction_items JSONB DEFAULT '[]'::jsonb;

-- ─── 2. TENANTS — updated_at column ─────────────────────────────────────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Trigger to auto-update updated_at on tenants
CREATE OR REPLACE FUNCTION update_tenant_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_updated_at ON tenants;
CREATE TRIGGER trg_tenant_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_tenant_updated_at();

-- ─── 3. ACTIVITY LOGS — RLS ───────────────────────────────────────────────────
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage own activity logs" ON activity_logs;
CREATE POLICY "Owner can manage own activity logs" ON activity_logs
  FOR ALL
  USING (
    owner_id = auth.uid()
    OR current_user_has_property_scope(property_id)
  )
  WITH CHECK (owner_id = auth.uid());

-- ─── 4. VACATE REQUESTS — RLS ────────────────────────────────────────────────
ALTER TABLE vacate_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage own vacate requests" ON vacate_requests;
CREATE POLICY "Owner can manage own vacate requests" ON vacate_requests
  FOR ALL
  USING (
    owner_id = auth.uid()
    OR current_user_has_property_scope(property_id)
  )
  WITH CHECK (owner_id = auth.uid());

-- ─── 5. NOTIFICATIONS — ensure owner_id FK ───────────────────────────────────
-- notifications table already exists from previous migration; just ensure index
CREATE INDEX IF NOT EXISTS idx_notifications_owner_read
  ON notifications(owner_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_owner_created
  ON activity_logs(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_property
  ON activity_logs(property_id, created_at DESC);

-- ─── 6. REALTIME — enable activity_logs and vacate_requests ──────────────────
DO $$
BEGIN
  -- Only add realtime if not already present (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'activity_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'vacate_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE vacate_requests;
  END IF;
END $$;
