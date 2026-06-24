-- ============================================================
-- SQL Migration: plans catalog and subscription history tracking
-- ============================================================

-- ── 1. Create plans table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  label       text NOT NULL,
  price       numeric NOT NULL DEFAULT 0,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  property_limit integer, -- null means Infinity
  tenant_limit integer,   -- null means Infinity
  features    text[] NOT NULL DEFAULT '{}',
  feature_flags jsonb NOT NULL DEFAULT '{}',
  is_active   boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS policies for plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_select_policy ON public.plans;
CREATE POLICY plans_select_policy ON public.plans
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS plans_admin_write_policy ON public.plans;
CREATE POLICY plans_admin_write_policy ON public.plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('platform_admin', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('platform_admin', 'admin', 'super_admin')
    )
  );

-- Seed default plans
INSERT INTO public.plans (code, label, price, billing_cycle, property_limit, tenant_limit, features, feature_flags, is_active, is_archived)
VALUES
  ('starter', 'Starter', 0, 'monthly', 1, 15, ARRAY['1 property', 'Up to 15 tenants', 'Maintenance tickets', 'Basic announcements'], '{"whatsapp": false, "aiAssistant": false, "tenantPortal": true, "multiUser": false, "receipts": true, "buildingView": true}'::jsonb, true, false),
  ('pro', 'Pro', 999, 'monthly', NULL, NULL, ARRAY['Unlimited properties', 'Unlimited tenants', 'WhatsApp messaging', 'Team collaboration (5 seats)', 'Advanced analytics'], '{"whatsapp": true, "aiAssistant": false, "tenantPortal": true, "multiUser": true, "receipts": true, "buildingView": true}'::jsonb, true, false),
  ('business', 'Business', 2499, 'monthly', NULL, NULL, ARRAY['Everything in Pro', 'Priority support', 'Custom branding', '20 team seats', 'API access'], '{"whatsapp": true, "aiAssistant": true, "tenantPortal": true, "multiUser": true, "receipts": true, "buildingView": true}'::jsonb, true, false)
ON CONFLICT (code) DO UPDATE 
SET label = EXCLUDED.label,
    price = EXCLUDED.price,
    billing_cycle = EXCLUDED.billing_cycle,
    property_limit = EXCLUDED.property_limit,
    tenant_limit = EXCLUDED.tenant_limit,
    features = EXCLUDED.features,
    feature_flags = EXCLUDED.feature_flags;

-- ── 2. Create owner_subscription_history table ──────────────
CREATE TABLE IF NOT EXISTS public.owner_subscription_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_code     text NOT NULL,
  status        text NOT NULL,
  billing_cycle text NOT NULL,
  amount        numeric NOT NULL,
  currency      text NOT NULL DEFAULT 'INR',
  seats         integer,
  started_at    timestamptz,
  renews_at     timestamptz,
  ended_at      timestamptz,
  action_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS policies for subscription history
ALTER TABLE public.owner_subscription_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS osh_select_policy ON public.owner_subscription_history;
CREATE POLICY osh_select_policy ON public.owner_subscription_history
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('platform_admin', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS osh_admin_policy ON public.owner_subscription_history;
CREATE POLICY osh_admin_policy ON public.owner_subscription_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('platform_admin', 'admin', 'super_admin')
    )
  );

-- Trigger to log subscription changes automatically
CREATE OR REPLACE FUNCTION log_owner_subscription_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.owner_subscription_history (
    owner_id, plan_code, status, billing_cycle, amount, currency, seats, started_at, renews_at, action_by
  ) VALUES (
    NEW.owner_id, NEW.plan_code, NEW.status, NEW.billing_cycle, NEW.amount, NEW.currency, NEW.seats, NEW.started_at, NEW.renews_at, auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_owner_subscription_history ON public.owner_subscriptions;
CREATE TRIGGER trg_log_owner_subscription_history
AFTER INSERT OR UPDATE ON public.owner_subscriptions
FOR EACH ROW
EXECUTE FUNCTION log_owner_subscription_history();

-- ── 3. Allow 'paused' as a valid owner_subscriptions status ──
-- The admin Subscription Management UI supports Pause/Resume, but the original
-- check constraint (20260414_multi_owner_saas_expansion.sql) only allowed
-- trialing/active/past_due/cancelled. Widen it to include 'paused'.
ALTER TABLE public.owner_subscriptions DROP CONSTRAINT IF EXISTS owner_subscriptions_status_check;
ALTER TABLE public.owner_subscriptions ADD CONSTRAINT owner_subscriptions_status_check
  CHECK (status IN ('trialing', 'active', 'paused', 'past_due', 'cancelled'));
