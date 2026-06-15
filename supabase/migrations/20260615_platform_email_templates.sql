-- ============================================================
-- Platform email templates — DB-persisted overrides for the
-- admin Email Template editor (welcome, payment reminder,
-- receipt, agreement, password reset, …). The admin UI ships
-- built-in defaults and overlays any saved overrides on top,
-- so this table only stores rows that have been edited.
-- ============================================================

-- ── 1. platform_email_templates table ──────────────────────
-- id is the template key used by the UI (e.g. 'welcome',
-- 'payment_reminder'), not a generated uuid, so an upsert by id
-- replaces the override for that template.
CREATE TABLE IF NOT EXISTS public.platform_email_templates (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  subject     text NOT NULL,
  body        text NOT NULL,
  updated_by  uuid REFERENCES public.profiles(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 2. RLS — platform admins only ───────────────────────────
ALTER TABLE public.platform_email_templates ENABLE ROW LEVEL SECURITY;

-- Read + write restricted to platform admins. Templates are global
-- platform configuration, never owner-scoped.
CREATE POLICY pet_admin_all ON public.platform_email_templates
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
