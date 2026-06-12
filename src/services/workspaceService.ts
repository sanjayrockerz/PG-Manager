// Workspace membership service — workspace-level role management.
// Complements inviteService (invite flow) and teamService (property scopes).
import { supabase } from '../lib/supabase';
import type { WorkspaceRole } from '../utils/permissions';
import type { DisplayRole } from './inviteService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkspaceMembershipRecord {
  id: string;
  workspaceOwnerId: string;
  memberUserId: string;
  workspaceRole: WorkspaceRole | 'manager' | 'editor' | 'viewer';
  status: 'pending' | 'active' | 'suspended';
  invitedBy: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface WorkspaceMemberSummary {
  id: string;
  email: string;
  name: string;
  workspaceRole: DisplayRole;
  status: 'pending' | 'active' | 'suspended';
  acceptedAt: string | null;
  propertyIds: string[];
}

interface MembershipRow {
  id: string;
  workspace_owner_id: string;
  member_user_id: string;
  workspace_role: string;
  status: string;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface ScopedMemberRow {
  user_id: string;
  property_id: string;
  display_role: string | null;
}

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
}

function mapMembership(row: MembershipRow): WorkspaceMembershipRecord {
  return {
    id:               row.id,
    workspaceOwnerId: row.workspace_owner_id,
    memberUserId:     row.member_user_id,
    workspaceRole:    row.workspace_role as WorkspaceMembershipRecord['workspaceRole'],
    status:           row.status as WorkspaceMembershipRecord['status'],
    invitedBy:        row.invited_by,
    invitedAt:        row.invited_at,
    acceptedAt:       row.accepted_at,
    createdAt:        row.created_at,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const workspaceService = {
  /**
   * Load all workspace memberships for the current user (as a member).
   * Used by WorkspaceContext to determine navWorkspaceRole.
   */
  async listMyMemberships(): Promise<WorkspaceMembershipRecord[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('workspace_memberships')
      .select('*')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .returns<MembershipRow[]>();

    if (error) return [];
    return (data ?? []).map(mapMembership);
  },

  /**
   * List all active memberships in a workspace (used by workspace owner and managers).
   */
  async listWorkspaceMembers(workspaceOwnerId: string): Promise<WorkspaceMemberSummary[]> {
    const { data: memberships, error: memError } = await supabase
      .from('workspace_memberships')
      .select('*')
      .eq('workspace_owner_id', workspaceOwnerId)
      .in('status', ['active', 'pending'])
      .returns<MembershipRow[]>();

    if (memError || !memberships?.length) return [];

    const memberIds = memberships.map((m) => m.member_user_id);

    const [profilesResult, scopesResult] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name').in('id', memberIds).returns<ProfileRow[]>(),
      supabase.from('owner_user_property_scopes').select('user_id, property_id, display_role')
        .eq('owner_id', workspaceOwnerId).in('user_id', memberIds).returns<ScopedMemberRow[]>(),
    ]);

    const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.id, p]));
    const scopesByUser = new Map<string, string[]>();
    for (const s of scopesResult.data ?? []) {
      const list = scopesByUser.get(s.user_id) ?? [];
      list.push(s.property_id);
      scopesByUser.set(s.user_id, list);
    }

    return memberships.map((m) => {
      const profile = profileMap.get(m.member_user_id);
      return {
        id:            m.member_user_id,
        email:         profile?.email ?? '',
        name:          profile?.full_name ?? '',
        workspaceRole: m.workspace_role as DisplayRole,
        status:        m.status as WorkspaceMemberSummary['status'],
        acceptedAt:    m.accepted_at,
        propertyIds:   scopesByUser.get(m.member_user_id) ?? [],
      };
    });
  },

  /**
   * List members scoped to specific properties — used by managers who can only
   * see members relevant to their assigned properties.
   */
  async listMembersForProperties(
    workspaceOwnerId: string,
    myPropertyIds: string[],
  ): Promise<WorkspaceMemberSummary[]> {
    if (!myPropertyIds.length) return [];

    // Get all scope rows for the properties I manage
    const { data: scopes, error: scopeError } = await supabase
      .from('owner_user_property_scopes')
      .select('user_id, property_id, display_role')
      .eq('owner_id', workspaceOwnerId)
      .in('property_id', myPropertyIds)
      .returns<ScopedMemberRow[]>();

    if (scopeError || !scopes?.length) return [];

    const memberIds = [...new Set(scopes.map((s) => s.user_id))];

    const [profilesResult, membershipsResult] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name').in('id', memberIds).returns<ProfileRow[]>(),
      supabase.from('workspace_memberships').select('*')
        .eq('workspace_owner_id', workspaceOwnerId)
        .in('member_user_id', memberIds)
        .returns<MembershipRow[]>(),
    ]);

    const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.id, p]));
    const membershipMap = new Map((membershipsResult.data ?? []).map((m) => [m.member_user_id, m]));
    const scopesByUser = new Map<string, string[]>();
    for (const s of scopes) {
      const list = scopesByUser.get(s.user_id) ?? [];
      list.push(s.property_id);
      scopesByUser.set(s.user_id, list);
    }

    return memberIds.map((uid) => {
      const profile    = profileMap.get(uid);
      const membership = membershipMap.get(uid);
      return {
        id:            uid,
        email:         profile?.email ?? '',
        name:          profile?.full_name ?? '',
        workspaceRole: (membership?.workspace_role ?? 'editor') as DisplayRole,
        status:        (membership?.status ?? 'active') as WorkspaceMemberSummary['status'],
        acceptedAt:    membership?.accepted_at ?? null,
        propertyIds:   scopesByUser.get(uid) ?? [],
      };
    });
  },

  /**
   * Upsert a workspace membership record.
   * Used after invite acceptance to ensure the DB row exists.
   */
  async upsertMembership(input: {
    workspaceOwnerId: string;
    memberUserId: string;
    workspaceRole: 'manager' | 'editor' | 'viewer';
    invitedBy?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('workspace_memberships')
      .upsert(
        {
          workspace_owner_id: input.workspaceOwnerId,
          member_user_id:     input.memberUserId,
          workspace_role:     input.workspaceRole,
          status:             'active',
          invited_by:         input.invitedBy ?? null,
          accepted_at:        new Date().toISOString(),
        },
        { onConflict: 'workspace_owner_id,member_user_id', ignoreDuplicates: false },
      );

    if (error) throw error;
  },

  /**
   * Update a member's workspace role (owner-only).
   */
  async updateMemberRole(
    workspaceOwnerId: string,
    memberUserId: string,
    newRole: 'manager' | 'editor' | 'viewer',
  ): Promise<void> {
    const { error } = await supabase
      .from('workspace_memberships')
      .update({ workspace_role: newRole, updated_at: new Date().toISOString() })
      .eq('workspace_owner_id', workspaceOwnerId)
      .eq('member_user_id', memberUserId);

    if (error) throw error;
  },

  /**
   * Suspend a membership (blocks access without deleting).
   */
  async suspendMembership(workspaceOwnerId: string, memberUserId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_memberships')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('workspace_owner_id', workspaceOwnerId)
      .eq('member_user_id', memberUserId);

    if (error) throw error;
  },

  /**
   * Remove a workspace membership entirely.
   * Also deletes all property scopes for this member.
   */
  async removeMembership(workspaceOwnerId: string, memberUserId: string): Promise<void> {
    const [membershipResult, scopeResult] = await Promise.all([
      supabase.from('workspace_memberships')
        .delete()
        .eq('workspace_owner_id', workspaceOwnerId)
        .eq('member_user_id', memberUserId),
      supabase.from('owner_user_property_scopes')
        .delete()
        .eq('owner_id', workspaceOwnerId)
        .eq('user_id', memberUserId),
    ]);

    if (membershipResult.error) throw membershipResult.error;
    if (scopeResult.error) throw scopeResult.error;

    // Notify the removed member
    try {
      await supabase.from('notifications').insert({
        user_id: memberUserId,
        type:    'team',
        title:   'Workspace Access Revoked',
        message: 'Your workspace access has been removed.',
        read:    false,
      });
    } catch {
      // best-effort
    }
  },
};
