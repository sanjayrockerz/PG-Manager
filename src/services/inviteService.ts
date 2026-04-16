// Invite service: CRUD for owner_invites and team membership management
import { supabase } from '../lib/supabase';
import { displayRoleToProfileRole } from '../utils/roles';

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
    return mapInvite(data);
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
    const { error } = await supabase
      .from('owner_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);

    if (error) throw error;
  },

  /**
   * Resend / refresh an invite (reset token + expires_at).
   */
  async refreshInvite(inviteId: string): Promise<InviteRecord> {
    const { data, error } = await supabase
      .from('owner_invites')
      .update({
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', inviteId)
      .select()
      .single<InviteRow>();

    if (error) throw error;
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
    return data as { success: boolean; ownerId?: string; role?: string };
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
  },
};
