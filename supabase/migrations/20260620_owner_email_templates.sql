-- Migration: Owner Email Templates & Custom Branding settings
-- File: 20260620_owner_email_templates.sql

-- 1. Add branding column to public.owner_settings if not exists
ALTER TABLE public.owner_settings ADD COLUMN IF NOT EXISTS branding jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Create owner_email_templates table
CREATE TABLE IF NOT EXISTS public.owner_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  version int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, template_key)
);

-- 3. Create owner_email_template_versions table
CREATE TABLE IF NOT EXISTS public.owner_email_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  version int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS on both tables
ALTER TABLE public.owner_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_email_template_versions ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if any
DROP POLICY IF EXISTS owner_email_templates_all ON public.owner_email_templates;
DROP POLICY IF EXISTS owner_email_template_versions_all ON public.owner_email_template_versions;

-- 6. Create policies allowing owners/scoped staff and platform admins access
CREATE POLICY owner_email_templates_all ON public.owner_email_templates
  FOR ALL
  TO authenticated
  USING (
    owner_id = public.current_owner_scope_id()
    OR public.current_user_is_admin()
  )
  WITH CHECK (
    owner_id = public.current_owner_scope_id()
    OR public.current_user_is_admin()
  );

CREATE POLICY owner_email_template_versions_all ON public.owner_email_template_versions
  FOR ALL
  TO authenticated
  USING (
    owner_id = public.current_owner_scope_id()
    OR public.current_user_is_admin()
  )
  WITH CHECK (
    owner_id = public.current_owner_scope_id()
    OR public.current_user_is_admin()
  );
