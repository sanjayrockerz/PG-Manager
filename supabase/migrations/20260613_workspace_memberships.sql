-- ============================================================
-- Workspace Memberships — workspace-level role tracking
-- Complements owner_user_property_scopes (per-property access)
-- with a workspace-level role that drives navigation gating,
-- settings access, and team management permissions.
-- ============================================================

-- ── 1. workspace_memberships table ──────────────────────────

CREATE TABLE IF NOT EXISTS public.workspace_memberships (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_owner_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_role      text NOT NULL DEFAULT 'editor'
                        CHECK (workspace_role IN ('manager', 'editor', 'viewer')),
  status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('pending', 'active', 'suspended')),
  invited_by          uuid REFERENCES public.profiles(id),
  invited_at          timestamptz NOT NULL DEFAULT now(),
  accepted_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_owner_id, member_user_id)
);

CREATE INDEX IF NOT EXISTS idx_wm_member_user    ON public.workspace_memberships(member_user_id);
CREATE INDEX IF NOT EXISTS idx_wm_workspace_owner ON public.workspace_memberships(workspace_owner_id);
CREATE INDEX IF NOT EXISTS idx_wm_status          ON public.workspace_memberships(status);

-- ── 2. RLS ───────────────────────────────────────────────────

ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;

-- Workspace owner: full control over memberships in their workspace
CREATE POLICY wm_owner_all ON public.workspace_memberships
  FOR ALL
  TO authenticated
  USING  (workspace_owner_id = auth.uid())
  WITH CHECK (workspace_owner_id = auth.uid());

-- Members: read their own membership record (to know their workspace role)
CREATE POLICY wm_member_select ON public.workspace_memberships
  FOR SELECT
  TO authenticated
  USING (member_user_id = auth.uid());

-- Managers: read all memberships in workspaces they manage
-- (needed for the manager's scoped Team Members view)
CREATE POLICY wm_manager_read ON public.workspace_memberships
  FOR SELECT
  TO authenticated
  USING (
    workspace_owner_id IN (
      SELECT wm2.workspace_owner_id
      FROM   public.workspace_memberships wm2
      WHERE  wm2.member_user_id  = auth.uid()
        AND  wm2.workspace_role  = 'manager'
        AND  wm2.status          = 'active'
    )
  );

-- Managers: can INSERT editor/viewer memberships on behalf of the workspace
-- (they cannot promote to manager — only the owner can do that)
CREATE POLICY wm_manager_insert ON public.workspace_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_role IN ('editor', 'viewer')
    AND workspace_owner_id IN (
      SELECT wm2.workspace_owner_id
      FROM   public.workspace_memberships wm2
      WHERE  wm2.member_user_id  = auth.uid()
        AND  wm2.workspace_role  = 'manager'
        AND  wm2.status          = 'active'
    )
  );

-- ── 3. Backfill from owner_user_property_scopes ──────────────
-- Derive the most-permissive workspace_role per (owner_id, user_id) pair.

INSERT INTO public.workspace_memberships
  (workspace_owner_id, member_user_id, workspace_role, status, invited_at, accepted_at)
SELECT
  s.owner_id,
  s.user_id,
  -- Pick most-permissive role across all properties for this pair
  CASE
    WHEN bool_or(s.display_role = 'manager') THEN 'manager'
    WHEN bool_or(s.display_role = 'editor')  THEN 'editor'
    ELSE 'viewer'
  END AS workspace_role,
  'active',
  MIN(s.created_at),
  MIN(s.created_at)
FROM public.owner_user_property_scopes s
WHERE s.owner_id <> s.user_id          -- exclude accidental self-references
GROUP BY s.owner_id, s.user_id
ON CONFLICT (workspace_owner_id, member_user_id) DO NOTHING;

-- ── 4. Extend owner_invites to support 'declined' status ────

DO $$
BEGIN
  ALTER TABLE public.owner_invites
    DROP CONSTRAINT IF EXISTS owner_invites_status_check;
  ALTER TABLE public.owner_invites
    ADD CONSTRAINT owner_invites_status_check
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked', 'declined'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── 5. Update accept_invite_by_token RPC ─────────────────────
-- Adds workspace_memberships upsert on invite acceptance.

CREATE OR REPLACE FUNCTION public.accept_invite_by_token(
  p_user_id uuid,
  p_email   text,
  p_token   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_invite record;
  prop_id uuid;
BEGIN
  SELECT * INTO pending_invite
  FROM   public.owner_invites
  WHERE  token      = p_token
    AND  status     = 'pending'
    AND  expires_at > now()
  ORDER BY invited_at DESC
  LIMIT 1;

  IF pending_invite.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_pending_invite');
  END IF;

  IF lower(pending_invite.invited_email) <> lower(p_email) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'email_mismatch');
  END IF;

  -- Set profiles.role = 'owner' so the accepted member gets full workspace portal access.
  -- The actual workspace role (manager/editor/viewer) lives in workspace_memberships.
  UPDATE public.profiles
  SET
    role           = 'owner',
    owner_scope_id = pending_invite.owner_id,
    updated_at     = now()
  WHERE id = p_user_id;

  -- Grant per-property scopes
  FOREACH prop_id IN ARRAY pending_invite.property_ids LOOP
    INSERT INTO public.owner_user_property_scopes (
      owner_id, user_id, property_id,
      can_view, can_manage_properties,
      can_manage_tenants, can_manage_payments,
      can_manage_maintenance, can_manage_announcements,
      display_role
    ) VALUES (
      pending_invite.owner_id, p_user_id, prop_id,
      true, false,
      COALESCE((pending_invite.capabilities->>'can_manage_tenants')::boolean,    false),
      COALESCE((pending_invite.capabilities->>'can_manage_payments')::boolean,   false),
      COALESCE((pending_invite.capabilities->>'can_manage_maintenance')::boolean,false),
      COALESCE((pending_invite.capabilities->>'can_manage_announcements')::boolean,false),
      pending_invite.display_role
    )
    ON CONFLICT (user_id, property_id) DO UPDATE SET
      can_view               = true,
      can_manage_tenants     = excluded.can_manage_tenants,
      can_manage_payments    = excluded.can_manage_payments,
      can_manage_maintenance = excluded.can_manage_maintenance,
      can_manage_announcements = excluded.can_manage_announcements,
      display_role           = excluded.display_role,
      updated_at             = now();
  END LOOP;

  -- Upsert workspace-level membership
  INSERT INTO public.workspace_memberships (
    workspace_owner_id, member_user_id, workspace_role,
    status, invited_by, invited_at, accepted_at
  ) VALUES (
    pending_invite.owner_id,
    p_user_id,
    COALESCE(pending_invite.display_role, 'editor'),
    'active',
    pending_invite.owner_id,
    pending_invite.invited_at,
    now()
  )
  ON CONFLICT (workspace_owner_id, member_user_id) DO UPDATE SET
    workspace_role = CASE
      -- Promote to more permissive role if applicable
      WHEN excluded.workspace_role = 'manager' THEN 'manager'
      WHEN excluded.workspace_role = 'editor'
        AND workspace_memberships.workspace_role = 'viewer' THEN 'editor'
      ELSE workspace_memberships.workspace_role
    END,
    status      = 'active',
    accepted_at = now(),
    updated_at  = now();

  -- Mark invite accepted
  UPDATE public.owner_invites
  SET status = 'accepted', accepted_at = now(), accepted_by = p_user_id
  WHERE id = pending_invite.id;

  -- Audit log
  INSERT INTO public.activity_logs (
    owner_id, property_id, event, detail, metadata
  ) VALUES (
    pending_invite.owner_id,
    null,
    'TEAM_INVITE_ACCEPTED',
    'Invite accepted by ' || lower(p_email),
    jsonb_build_object(
      'inviteId', pending_invite.id,
      'userId',   p_user_id,
      'role',     COALESCE(pending_invite.display_role, 'editor')
    )
  );

  RETURN jsonb_build_object(
    'success',  true,
    'owner_id', pending_invite.owner_id,
    'role',     pending_invite.role,
    'workspace_role', COALESCE(pending_invite.display_role, 'editor')
  );
END;
$$;

-- ── 6. Update accept_pending_invite RPC ─────────────────────

CREATE OR REPLACE FUNCTION public.accept_pending_invite(
  p_user_id uuid,
  p_email   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_invite record;
  prop_id uuid;
BEGIN
  SELECT * INTO pending_invite
  FROM   public.owner_invites
  WHERE  lower(invited_email) = lower(p_email)
    AND  status               = 'pending'
    AND  expires_at           > now()
  ORDER BY invited_at DESC
  LIMIT 1;

  IF pending_invite.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_pending_invite');
  END IF;

  -- Set profiles.role = 'owner' so the accepted member gets full workspace portal access.
  -- The actual workspace role (manager/editor/viewer) lives in workspace_memberships.
  UPDATE public.profiles
  SET
    role           = 'owner',
    owner_scope_id = pending_invite.owner_id,
    updated_at     = now()
  WHERE id = p_user_id;

  FOREACH prop_id IN ARRAY pending_invite.property_ids LOOP
    INSERT INTO public.owner_user_property_scopes (
      owner_id, user_id, property_id,
      can_view, can_manage_properties,
      can_manage_tenants, can_manage_payments,
      can_manage_maintenance, can_manage_announcements,
      display_role
    ) VALUES (
      pending_invite.owner_id, p_user_id, prop_id,
      true, false,
      COALESCE((pending_invite.capabilities->>'can_manage_tenants')::boolean,    false),
      COALESCE((pending_invite.capabilities->>'can_manage_payments')::boolean,   false),
      COALESCE((pending_invite.capabilities->>'can_manage_maintenance')::boolean,false),
      COALESCE((pending_invite.capabilities->>'can_manage_announcements')::boolean,false),
      pending_invite.display_role
    )
    ON CONFLICT (user_id, property_id) DO UPDATE SET
      can_view               = true,
      can_manage_tenants     = excluded.can_manage_tenants,
      can_manage_payments    = excluded.can_manage_payments,
      can_manage_maintenance = excluded.can_manage_maintenance,
      can_manage_announcements = excluded.can_manage_announcements,
      display_role           = excluded.display_role,
      updated_at             = now();
  END LOOP;

  -- Upsert workspace membership
  INSERT INTO public.workspace_memberships (
    workspace_owner_id, member_user_id, workspace_role,
    status, invited_by, invited_at, accepted_at
  ) VALUES (
    pending_invite.owner_id,
    p_user_id,
    COALESCE(pending_invite.display_role, 'editor'),
    'active',
    pending_invite.owner_id,
    pending_invite.invited_at,
    now()
  )
  ON CONFLICT (workspace_owner_id, member_user_id) DO UPDATE SET
    workspace_role = CASE
      WHEN excluded.workspace_role = 'manager' THEN 'manager'
      WHEN excluded.workspace_role = 'editor'
        AND workspace_memberships.workspace_role = 'viewer' THEN 'editor'
      ELSE workspace_memberships.workspace_role
    END,
    status      = 'active',
    accepted_at = now(),
    updated_at  = now();

  UPDATE public.owner_invites
  SET status = 'accepted', accepted_at = now(), accepted_by = p_user_id
  WHERE id = pending_invite.id;

  INSERT INTO public.activity_logs (
    owner_id, property_id, event, detail, metadata
  ) VALUES (
    pending_invite.owner_id,
    null,
    'TEAM_INVITE_ACCEPTED',
    'Invite accepted by ' || lower(p_email),
    jsonb_build_object('inviteId', pending_invite.id, 'userId', p_user_id)
  );

  RETURN jsonb_build_object(
    'success',  true,
    'owner_id', pending_invite.owner_id,
    'role',     pending_invite.role,
    'workspace_role', COALESCE(pending_invite.display_role, 'editor')
  );
END;
$$;

-- ── 7. RPC: decline_invite_by_token ─────────────────────────

CREATE OR REPLACE FUNCTION public.decline_invite_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_row record;
BEGIN
  SELECT * INTO invite_row
  FROM   public.owner_invites
  WHERE  token  = p_token
    AND  status = 'pending'
  LIMIT 1;

  IF invite_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found_or_not_pending');
  END IF;

  UPDATE public.owner_invites
  SET status = 'declined', updated_at = now()
  WHERE id = invite_row.id;

  INSERT INTO public.activity_logs (
    owner_id, property_id, event, detail, metadata
  ) VALUES (
    invite_row.owner_id,
    null,
    'TEAM_INVITE_DECLINED',
    'Invite declined for ' || lower(invite_row.invited_email),
    jsonb_build_object('inviteId', invite_row.id)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 8. Realtime publication ──────────────────────────────────

DO $$
BEGIN
  -- Add workspace_memberships to the supabase_realtime publication so
  -- WorkspaceContext can subscribe to membership changes in real-time.
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'workspace_memberships'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_memberships;
  END IF;
END $$;
