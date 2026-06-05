// Invite service: CRUD for owner_invites and team membership management
import { supabase } from '../lib/supabase';
import { displayRoleToProfileRole } from '../utils/roles';
import { domainEvents } from './eventBus';

export type DisplayRole = 'viewer' | 'editor' | 'manager';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface InviteCapabilities {
  canManageTenants: boolean;
  canManagePayments: boolean;
  canManageMaintenance: boolean;
  canManageAnnouncements: boolean;
}

export interface InviteRecord {
  id: string;
  ownerId: string;
  invitedEmail: string;
  role: 'owner_manager' | 'staff';
  displayRole: DisplayRole;
  propertyIds: string[];
  capabilities: InviteCapabilities;
  token: string;
  status: InviteStatus;
  invitedAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedBy: string | null;
}

export interface CreateInviteInput {
  invitedEmail: string;
  displayRole: DisplayRole;
  propertyIds: string[];
  capabilities?: Partial<InviteCapabilities>;
}

export interface InviteTokenInfo {
  id: string;
  ownerId: string;
  invitedEmail: string;
  displayRole: DisplayRole;
  propertyIds: string[];
  expiresAt: string;
  status: InviteStatus;
}

interface InviteRow {
  id: string;
  owner_id: string;
  invited_email: string;
  role: 'owner_manager' | 'staff';
  display_role: DisplayRole;
  property_ids: string[];
  capabilities: {
    can_manage_tenants: boolean;
    can_manage_payments: boolean;
    can_manage_maintenance: boolean;
    can_manage_announcements: boolean;
  };
  token: string;
  status: InviteStatus;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
}

interface InviteTokenRow {
  id: string;
  owner_id: string;
  invited_email: string;
  display_role: DisplayRole;
  property_ids: string[];
  expires_at: string;
  status: InviteStatus;
}

interface InviteTokenRpcResult {
  found: boolean;
  invite?: InviteTokenRow;
  status?: InviteStatus;
  expired?: boolean;
}

interface AcceptInviteResult {
  success: boolean;
  owner_id?: string;
  role?: string;
  reason?: string;
}

function mapInvite(row: InviteRow): InviteRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    invitedEmail: row.invited_email,
    role: row.role,
    displayRole: row.display_role,
    propertyIds: row.property_ids ?? [],
    capabilities: {
      canManageTenants: row.capabilities?.can_manage_tenants ?? false,
      canManagePayments: row.capabilities?.can_manage_payments ?? false,
      canManageMaintenance: row.capabilities?.can_manage_maintenance ?? false,
      canManageAnnouncements: row.capabilities?.can_manage_announcements ?? false,
    },
    token: row.token,
    status: row.status,
    invitedAt: row.invited_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    acceptedBy: row.accepted_by,
  };
}

function mapInviteTokenInfo(row: InviteTokenRow): InviteTokenInfo {
  return {
    id: row.id,
    ownerId: row.owner_id,
    invitedEmail: row.invited_email,
    displayRole: row.display_role,
    propertyIds: row.property_ids ?? [],
    expiresAt: row.expires_at,
    status: row.status,
  };
}

async function logInviteActivity(input: {
  ownerId: string;
  event: string;
  detail: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabase.from('activity_logs').insert({
      owner_id: input.ownerId,
      property_id: null,
      event: input.event,
      detail: input.detail,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Audit logging is best-effort; do not block workflows.
  }
}

function capabilitiesToRow(displayRole: DisplayRole, caps?: Partial<InviteCapabilities>) {
  // Viewer gets no write capabilities by default
  if (displayRole === 'viewer') {
    return {
      can_manage_tenants: false,
      can_manage_payments: false,
      can_manage_maintenance: false,
      can_manage_announcements: false,
    };
  }
  // Editor gets tenants + maintenance by default
  if (displayRole === 'editor') {
    return {
      can_manage_tenants: caps?.canManageTenants ?? true,
      can_manage_payments: caps?.canManagePayments ?? false,
      can_manage_maintenance: caps?.canManageMaintenance ?? true,
      can_manage_announcements: caps?.canManageAnnouncements ?? false,
    };
  }
  // Manager gets all by default
  return {
    can_manage_tenants: caps?.canManageTenants ?? true,
    can_manage_payments: caps?.canManagePayments ?? true,
    can_manage_maintenance: caps?.canManageMaintenance ?? true,
    can_manage_announcements: caps?.canManageAnnouncements ?? true,
  };
}

// ─── Invite CRUD ──────────────────────────────────────────────────────────────

export const inviteService = {
  /**
   * Create a new invite. Only owners can call this.
   */
  async createInvite(input: CreateInviteInput): Promise<InviteRecord> {
    const role = displayRoleToProfileRole(input.displayRole);
    const capabilities = capabilitiesToRow(input.displayRole, input.capabilities);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('owner_invites')
      .insert({
        owner_id: user.id,
        invited_email: input.invitedEmail.trim().toLowerCase(),
        role,
        display_role: input.displayRole,
        property_ids: input.propertyIds,
        capabilities,
      })
      .select()
      .single<InviteRow>();

    if (error) throw error;
    const record = mapInvite(data);
    void logInviteActivity({
      ownerId: record.ownerId,
      event: 'TEAM_INVITE_SENT',
      detail: `Invite sent to ${record.invitedEmail} (${record.displayRole})`,
      metadata: {
        inviteId: record.id,
        role: record.displayRole,
        propertyCount: record.propertyIds.length,
      },
    });
    domainEvents.teamAccessChanged({
      ownerId: record.ownerId,
      targetEmail: record.invitedEmail,
      action: 'invited',
    });
    return record;
  },

  /**
   * List all invites for the authenticated owner.
   */
  async listInvites(): Promise<InviteRecord[]> {
    const { data, error } = await supabase
      .from('owner_invites')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<InviteRow[]>();

    if (error) throw error;
    return (data ?? []).map(mapInvite);
  },

  /**
   * Revoke a pending invite.
   */
  async revokeInvite(inviteId: string): Promise<void> {
    const { data: current, error: fetchError } = await supabase
      .from('owner_invites')
      .select('*')
      .eq('id', inviteId)
      .maybeSingle<InviteRow>();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('owner_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);

    if (error) throw error;
    if (current) {
      void logInviteActivity({
        ownerId: current.owner_id,
        event: 'TEAM_INVITE_REVOKED',
        detail: `Invite revoked for ${current.invited_email}`,
        metadata: { inviteId: current.id },
      });
    }
  },

  /**
   * Resend / refresh an invite (reset token + expires_at).
   */
  async refreshInvite(inviteId: string): Promise<InviteRecord> {
    const nextExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: rpcError } = await supabase
      .rpc('refresh_owner_invite_token', { p_invite_id: inviteId, p_expires_at: nextExpiry });

    if (rpcError) {
      const message = String((rpcError as { message?: string } | null)?.message ?? '').toLowerCase();
      if (!message.includes('refresh_owner_invite_token')) {
        throw rpcError;
      }

      const { error: fallbackError } = await supabase
        .from('owner_invites')
        .update({
          status: 'pending',
          expires_at: nextExpiry,
        })
        .eq('id', inviteId);

      if (fallbackError) throw fallbackError;
    }

    const { data, error } = await supabase
      .from('owner_invites')
      .select('*')
      .eq('id', inviteId)
      .single<InviteRow>();

    if (error) throw error;

    void logInviteActivity({
      ownerId: data.owner_id,
      event: 'TEAM_INVITE_REFRESHED',
      detail: `Invite renewed for ${data.invited_email}`,
      metadata: { inviteId: data.id },
    });

    return mapInvite(data);
  },

  /**
   * Accept an invite for a user who already has an account.
   * Calls the Supabase RPC function.
   */
  async acceptInviteForExistingUser(userId: string, email: string): Promise<{ success: boolean; ownerId?: string; role?: string }> {
    const { data, error } = await supabase.rpc('accept_pending_invite', {
      p_user_id: userId,
      p_email: email,
    });

    if (error) throw error;
    const result = data as { success: boolean; ownerId?: string; role?: string };

    if (result.success && result.ownerId) {
      void logInviteActivity({
        ownerId: result.ownerId,
        event: 'TEAM_INVITE_ACCEPTED',
        detail: `Invite accepted by ${email.toLowerCase()}`,
        metadata: { userId },
      });
    }

    return result;
  },

  /**
   * Fetch invite details using the token for pre-auth UI.
   */
  async getInviteByToken(token: string): Promise<InviteTokenInfo | null> {
    const { data, error } = await supabase.rpc('get_invite_by_token', { p_token: token });
    if (error) throw error;

    const result = data as InviteTokenRpcResult;
    if (!result?.found || !result.invite) return null;
    return mapInviteTokenInfo(result.invite);
  },

  /**
   * Accept invite using token (for logged-in users).
   */
  async acceptInviteByToken(userId: string, email: string, token: string): Promise<AcceptInviteResult> {
    const { data, error } = await supabase.rpc('accept_invite_by_token', {
      p_user_id: userId,
      p_email: email,
      p_token: token,
    });

    if (error) throw error;
    const result = data as AcceptInviteResult;

    if (result.success && result.owner_id) {
      void logInviteActivity({
        ownerId: result.owner_id,
        event: 'TEAM_INVITE_ACCEPTED',
        detail: `Invite accepted by ${email.toLowerCase()}`,
        metadata: { userId, token },
      });
    }

    return result;
  },
};

// ─── Team member listing ───────────────────────────────────────────────────────

export interface TeamMemberRecord {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'owner_manager' | 'staff';
  displayRole: DisplayRole;
  ownerScopeId: string | null;
  propertyAssignments: Array<{
    propertyId: string;
    canView: boolean;
    canManageTenants: boolean;
    canManagePayments: boolean;
    canManageMaintenance: boolean;
    canManageAnnouncements: boolean;
    displayRole: DisplayRole;
  }>;
}

interface TeamMemberRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: 'owner_manager' | 'staff';
  owner_scope_id: string | null;
}

interface ScopeRow {
  id: string;
  user_id: string;
  property_id: string;
  can_view: boolean;
  can_manage_properties: boolean;
  can_manage_tenants: boolean;
  can_manage_payments: boolean;
  can_manage_maintenance: boolean;
  can_manage_announcements: boolean;
  display_role: DisplayRole | null;
}

export const teamService = {
  /**
   * List all team members under the current owner.
   */
  async listMembers(): Promise<TeamMemberRecord[]> {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, role, owner_scope_id')
      .in('role', ['owner_manager', 'staff'])
      .returns<TeamMemberRow[]>();

    if (profileError) throw profileError;
    if (!profiles?.length) return [];

    const memberIds = profiles.map((p) => p.id);

    const { data: scopes, error: scopeError } = await supabase
      .from('owner_user_property_scopes')
      .select('*')
      .in('user_id', memberIds)
      .returns<ScopeRow[]>();

    if (scopeError) throw scopeError;

    const scopesByUser = new Map<string, ScopeRow[]>();
    (scopes ?? []).forEach((s) => {
      const list = scopesByUser.get(s.user_id) ?? [];
      list.push(s);
      scopesByUser.set(s.user_id, list);
    });

    return profiles.map((p) => {
      const memberScopes = scopesByUser.get(p.id) ?? [];
      const firstScope = memberScopes[0];
      const displayRole: DisplayRole = firstScope?.display_role ?? (p.role === 'owner_manager' ? 'manager' : 'viewer');

      return {
        id: p.id,
        email: p.email ?? '',
        name: p.full_name ?? '',
        phone: p.phone ?? '',
        role: p.role,
        displayRole,
        ownerScopeId: p.owner_scope_id,
        propertyAssignments: memberScopes.map((s) => ({
          propertyId: s.property_id,
          canView: s.can_view,
          canManageTenants: s.can_manage_tenants,
          canManagePayments: s.can_manage_payments,
          canManageMaintenance: s.can_manage_maintenance,
          canManageAnnouncements: s.can_manage_announcements,
          displayRole: s.display_role ?? displayRole,
        })),
      };
    });
  },

  /**
   * Update a member's property scope.
   */
  async updateMemberScope(
    userId: string,
    propertyId: string,
    caps: Partial<{
      canView: boolean;
      canManageTenants: boolean;
      canManagePayments: boolean;
      canManageMaintenance: boolean;
      canManageAnnouncements: boolean;
      displayRole: DisplayRole;
    }>,
  ): Promise<void> {
    const { error } = await supabase
      .from('owner_user_property_scopes')
      .update({
        can_view: caps.canView,
        can_manage_tenants: caps.canManageTenants,
        can_manage_payments: caps.canManagePayments,
        can_manage_maintenance: caps.canManageMaintenance,
        can_manage_announcements: caps.canManageAnnouncements,
        display_role: caps.displayRole,
      })
      .eq('user_id', userId)
      .eq('property_id', propertyId);

    if (error) throw error;
  },

  /**
   * Remove a member's access to all properties (effectively removes them from the owner's team).
   * Does NOT delete the auth user account.
   */
  async removeMember(userId: string): Promise<void> {
    const { data: profileRow, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id,email,owner_scope_id')
      .eq('id', userId)
      .maybeSingle<{ id: string; email: string | null; owner_scope_id: string | null }>();

    if (profileFetchError) throw profileFetchError;

    const { error: scopeError } = await supabase
      .from('owner_user_property_scopes')
      .delete()
      .eq('user_id', userId);

    if (scopeError) throw scopeError;

    // Reset their profile role to 'owner' with null scope (they become independent)
    // This prevents dangling scoped user with no scopes
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'owner', owner_scope_id: null })
      .eq('id', userId);

    if (profileError) throw profileError;

    if (profileRow?.owner_scope_id) {
      void logInviteActivity({
        ownerId: profileRow.owner_scope_id,
        event: 'TEAM_MEMBER_REMOVED',
        detail: `Team member removed: ${profileRow.email ?? userId}`,
        metadata: { userId },
      });
    }
  },

  /**
   * Add a new property scope for an existing team member.
   * Uses upsert so calling with an existing (user_id, property_id) pair is safe.
   */
  async addPropertyScope(
    userId: string,
    propertyId: string,
    displayRole: DisplayRole,
    caps: Partial<InviteCapabilities>,
  ): Promise<void> {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: memberProfile } = await supabase
      .from('profiles')
      .select('id,email,owner_scope_id')
      .eq('id', userId)
      .maybeSingle<{ id: string; email: string | null; owner_scope_id: string | null }>();

    const capabilities = capabilitiesToRow(displayRole, caps);

    const { error } = await supabase
      .from('owner_user_property_scopes')
      .upsert(
        {
          owner_id: authUser.id,
          user_id: userId,
          property_id: propertyId,
          can_view: true,
          can_manage_properties: false,
          can_manage_tenants: capabilities.can_manage_tenants,
          can_manage_payments: capabilities.can_manage_payments,
          can_manage_maintenance: capabilities.can_manage_maintenance,
          can_manage_announcements: capabilities.can_manage_announcements,
          display_role: displayRole,
        },
        { onConflict: 'user_id,property_id', ignoreDuplicates: false },
      );

    if (error) throw error;

    void logInviteActivity({
      ownerId: authUser.id,
      event: 'PROPERTY_SCOPE_ADDED',
      detail: `Property access granted to ${memberProfile?.email ?? userId} as ${displayRole}`,
      metadata: { userId, propertyId, displayRole },
    });
  },

  /**
   * Remove a team member's access to a single property without removing them from the team.
   */
  async removePropertyScope(userId: string, propertyId: string): Promise<void> {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: memberProfile } = await supabase
      .from('profiles')
      .select('id,email')
      .eq('id', userId)
      .maybeSingle<{ id: string; email: string | null }>();

    const { error } = await supabase
      .from('owner_user_property_scopes')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);

    if (error) throw error;

    void logInviteActivity({
      ownerId: authUser.id,
      event: 'PROPERTY_SCOPE_REMOVED',
      detail: `Property access removed for ${memberProfile?.email ?? userId}`,
      metadata: { userId, propertyId },
    });
  },

  /**
   * Update a member's capabilities for one property and log the change.
   */
  async updateMemberScopeWithAudit(
    userId: string,
    propertyId: string,
    displayRole: DisplayRole,
    caps: Partial<{
      canView: boolean;
      canManageTenants: boolean;
      canManagePayments: boolean;
      canManageMaintenance: boolean;
      canManageAnnouncements: boolean;
    }>,
  ): Promise<void> {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Not authenticated');

    const { data: memberProfile } = await supabase
      .from('profiles')
      .select('id,email')
      .eq('id', userId)
      .maybeSingle<{ id: string; email: string | null }>();

    const { error } = await supabase
      .from('owner_user_property_scopes')
      .update({
        can_view: caps.canView,
        can_manage_tenants: caps.canManageTenants,
        can_manage_payments: caps.canManagePayments,
        can_manage_maintenance: caps.canManageMaintenance,
        can_manage_announcements: caps.canManageAnnouncements,
        display_role: displayRole,
      })
      .eq('user_id', userId)
      .eq('property_id', propertyId);

    if (error) throw error;

    void logInviteActivity({
      ownerId: authUser.id,
      event: 'PROPERTY_SCOPE_UPDATED',
      detail: `Access updated for ${memberProfile?.email ?? userId} — role: ${displayRole}`,
      metadata: { userId, propertyId, displayRole, caps },
    });
  },
};
