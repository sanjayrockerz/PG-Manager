import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useProperty, type Property, type Room } from './PropertyContext';
import { useAuth } from './AuthContext';
import type { OwnerSubscriptionRecord } from '../services/supabaseData';
import { supabaseOwnerDataApi } from '../services/supabaseData';
import { workspaceService, type WorkspaceMembershipRecord } from '../services/workspaceService';
import type { WorkspaceRole } from '../utils/permissions';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkspaceAccessRole = 'owner' | 'manager' | 'staff';

export interface WorkspaceOccupancy {
  mode: 'BED_BASED' | 'ROOM_BASED';
  label: string;
  total: number;
  occupied: number;
  rate: number;
}

export interface WorkspaceSubscriptionSummary {
  status: 'trialing' | 'active' | 'paused' | 'past_due' | 'cancelled';
  planCode: string;
  trialEndsAt: string | null;
  renewsAt: string | null;
}

export interface WorkspaceProperty {
  propertyId: string;
  propertyName: string;
  city: string;
  locality: string;
  floors: number;
  totalRooms: number;
  rooms: Room[];
  occupancyMode: 'BED_BASED' | 'ROOM_BASED';
  accessRole: WorkspaceAccessRole;
  occupancy: WorkspaceOccupancy;
  subscription: WorkspaceSubscriptionSummary | null;
}

export interface WorkspaceTotals {
  total: number;
  owned: number;
  managed: number;
  staff: number;
}

interface WorkspaceContextType {
  workspaceProperties: WorkspaceProperty[];
  ownedProperties: WorkspaceProperty[];
  managedProperties: WorkspaceProperty[];
  staffProperties: WorkspaceProperty[];
  selectedWorkspace: WorkspaceProperty | null;
  setSelectedWorkspace: (ws: WorkspaceProperty | null) => void;
  totals: WorkspaceTotals;
  isLoading: boolean;
  // ── New workspace membership fields ──────────────────────────────────────
  // Most-permissive role across all workspaces the user participates in.
  // Drives sidebar navigation gating — use this instead of profiles.role for UI.
  navWorkspaceRole: WorkspaceRole;
  // Raw membership records (user as member in other owners' workspaces)
  workspaceMemberships: WorkspaceMembershipRecord[];
  // The membership for the currently selected workspace (null if user owns it)
  currentWorkspaceMembership: WorkspaceMembershipRecord | null;
}

// ─── Occupancy computation ────────────────────────────────────────────────────

function computeWorkspaceOccupancy(property: Property): WorkspaceOccupancy {
  const mode = property.occupancyMode ?? 'BED_BASED';
  const rooms = property.rooms;
  if (mode === 'ROOM_BASED') {
    const total    = rooms.filter((r) => r.status !== 'maintenance').length;
    const occupied = rooms.filter((r) => r.status === 'occupied').length;
    return { mode, label: 'Rooms', total: rooms.length, occupied, rate: total > 0 ? Math.round((occupied / total) * 100) : 0 };
  }
  const totalBeds    = rooms.reduce((s, r) => s + r.beds, 0);
  const occupiedBeds = rooms.reduce((s, r) => s + (r.occupiedBeds ?? 0), 0);
  return { mode, label: 'Beds', total: totalBeds, occupied: occupiedBeds, rate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0 };
}

function buildWorkspaceProperty(
  property: Property,
  accessRole: WorkspaceAccessRole,
  subscription: WorkspaceSubscriptionSummary | null,
): WorkspaceProperty {
  return {
    propertyId:    property.id,
    propertyName:  property.name,
    city:          property.city,
    locality:      property.locality ?? property.city,
    floors:        property.floors,
    totalRooms:    property.totalRooms,
    rooms:         property.rooms,
    occupancyMode: property.occupancyMode ?? 'BED_BASED',
    accessRole,
    occupancy:     computeWorkspaceOccupancy(property),
    subscription,
  };
}

// ─── Context + Provider ───────────────────────────────────────────────────────

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { properties, selectedProperty, setSelectedProperty, isLoading: propertiesLoading } = useProperty();
  const { user } = useAuth();

  const [subscription, setSubscription]       = useState<WorkspaceSubscriptionSummary | null>(null);
  const [selectedWorkspace, setSelectedWorkspaceState] = useState<WorkspaceProperty | null>(null);
  const [accessByProperty, setAccessByProperty] = useState<Record<string, WorkspaceAccessRole>>({});
  const [workspaceMemberships, setWorkspaceMemberships] = useState<WorkspaceMembershipRecord[]>([]);

  // ── Subscription ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || (user.role !== 'owner' && user.role !== 'owner_manager')) return;
    void supabaseOwnerDataApi.getOwnerSubscription()
      .then((sub: OwnerSubscriptionRecord) => {
        setSubscription({ status: sub.status, planCode: sub.planCode, trialEndsAt: sub.trialEndsAt ?? null, renewsAt: sub.renewsAt ?? null });
      })
      .catch(() => {});
  }, [user]);

  // ── Per-property access roles (from property_access view) ─────────────────
  useEffect(() => {
    if (!user) { setAccessByProperty({}); return; }
    let cancelled = false;
    void supabaseOwnerDataApi.listPropertyAccess()
      .then((rows) => {
        if (cancelled) return;
        const rank: Record<WorkspaceAccessRole, number> = { owner: 3, manager: 2, staff: 1 };
        const map: Record<string, WorkspaceAccessRole> = {};
        for (const r of rows) {
          const existing = map[r.propertyId];
          if (!existing || rank[r.accessRole] > rank[existing]) map[r.propertyId] = r.accessRole;
        }
        setAccessByProperty(map);
      })
      .catch(() => { if (!cancelled) setAccessByProperty({}); });
    return () => { cancelled = true; };
  }, [user]);

  // ── Workspace memberships (user as a member in others' workspaces) ─────────
  const loadMemberships = useCallback(async () => {
    if (!user) { setWorkspaceMemberships([]); return; }
    try {
      const memberships = await workspaceService.listMyMemberships();
      setWorkspaceMemberships(memberships);
    } catch {
      setWorkspaceMemberships([]);
    }
  }, [user]);

  useEffect(() => { void loadMemberships(); }, [loadMemberships]);

  // Realtime: re-load memberships when workspace_memberships table changes for current user
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`wm-member:${user.id}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'workspace_memberships',
        filter: `member_user_id=eq.${user.id}`,
      }, () => { void loadMemberships(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, loadMemberships]);

  // ── Resolve per-property access role ──────────────────────────────────────
  const resolveAccessRole = useCallback((property: Property): WorkspaceAccessRole => {
    const explicit = accessByProperty[property.id];
    if (explicit) return explicit;
    if (!user) return 'staff';
    if (user.role === 'owner') return 'owner';
    if (user.role === 'owner_manager') return 'manager';
    return 'staff';
  }, [user, accessByProperty]);

  // ── Build workspace properties ─────────────────────────────────────────────
  const workspaceProperties: WorkspaceProperty[] = properties.map((p) =>
    buildWorkspaceProperty(p, resolveAccessRole(p), user?.role === 'owner' ? subscription : null)
  );

  const ownedProperties   = workspaceProperties.filter((w) => w.accessRole === 'owner');
  const managedProperties = workspaceProperties.filter((w) => w.accessRole === 'manager');
  const staffProperties   = workspaceProperties.filter((w) => w.accessRole === 'staff');

  const totals: WorkspaceTotals = {
    total:   workspaceProperties.length,
    owned:   ownedProperties.length,
    managed: managedProperties.length,
    staff:   staffProperties.length,
  };

  // ── navWorkspaceRole ───────────────────────────────────────────────────────
  // The most-permissive role across ALL of the user's workspaces.
  // Used ONLY for sidebar/navigation gating — NOT for data-access decisions.
  //
  // Derivation priority:
  //   1. User has at least one OWNED property → workspace_owner
  //   2. User is a manager in any workspace (workspace_memberships) → manager
  //   3. User is an editor in any workspace → editor
  //   4. Default → viewer
  //
  // Deliberately does NOT check profiles.role === 'owner' because all invited
  // members are also stored with role='owner' after acceptance. Ownership is
  // determined by whether the user has properties they created, not their
  // profile role flag.
  const navWorkspaceRole: WorkspaceRole = useMemo(() => {
    if (ownedProperties.length > 0) return 'workspace_owner';

    const roleRank: Record<string, number> = { manager: 3, editor: 2, viewer: 1 };
    let best = 0;
    let bestRole: WorkspaceRole = 'viewer';
    for (const m of workspaceMemberships) {
      const rank = roleRank[m.workspaceRole] ?? 0;
      if (rank > best) { best = rank; bestRole = m.workspaceRole as WorkspaceRole; }
    }

    // Legacy fallback for users with owner_manager profile role who haven't
    // been migrated to workspace_memberships yet.
    if (best === 0 && user?.role === 'owner_manager') return 'manager';
    if (best === 0 && user?.role === 'staff')         return 'editor';

    return bestRole;
  }, [ownedProperties, workspaceMemberships, user]);

  // ── Current workspace membership ──────────────────────────────────────────
  // The membership record for the currently selected workspace (if user is a
  // member, not the owner). Null when user owns the selected workspace.
  const currentWorkspaceMembership: WorkspaceMembershipRecord | null = useMemo(() => {
    if (!selectedWorkspace || selectedWorkspace.accessRole === 'owner') return null;
    // Find the membership record whose workspace_owner_id matches the property owner.
    // We find this by cross-referencing with property access: managed properties
    // belong to some other owner, and that owner is the workspace_owner_id.
    return workspaceMemberships.find(
      (m) => managedProperties.some((mp) => mp.propertyId === selectedWorkspace.propertyId)
    ) ?? null;
  }, [selectedWorkspace, workspaceMemberships, managedProperties]);

  // ── Sync selectedWorkspace with PropertyContext ────────────────────────────
  useEffect(() => {
    if (selectedProperty === 'all') { setSelectedWorkspaceState(null); return; }
    const ws = workspaceProperties.find((w) => w.propertyId === selectedProperty);
    if (ws) setSelectedWorkspaceState(ws);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProperty, properties, subscription, accessByProperty]);

  const setSelectedWorkspace = useCallback((ws: WorkspaceProperty | null) => {
    setSelectedWorkspaceState(ws);
    setSelectedProperty(ws?.propertyId ?? 'all');
  }, [setSelectedProperty]);

  return (
    <WorkspaceContext.Provider value={{
      workspaceProperties,
      ownedProperties,
      managedProperties,
      staffProperties,
      selectedWorkspace,
      setSelectedWorkspace,
      totals,
      isLoading: propertiesLoading,
      navWorkspaceRole,
      workspaceMemberships,
      currentWorkspaceMembership,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

// ─── Subscription display helpers ────────────────────────────────────────────

export function getSubscriptionLabel(sub: WorkspaceSubscriptionSummary | null): string {
  if (!sub) return '';
  switch (sub.status) {
    case 'trialing':  return 'Trial Active';
    case 'active':    return 'Active';
    case 'paused':    return 'Paused';
    case 'past_due':  return 'Payment Due';
    case 'cancelled': return 'Expired';
    default:          return '';
  }
}

export function getSubscriptionDate(sub: WorkspaceSubscriptionSummary | null): string {
  if (!sub) return '';
  if (sub.status === 'trialing' && sub.trialEndsAt) {
    return `Renews ${new Date(sub.trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }
  if (sub.status === 'active' && sub.renewsAt) {
    return `Renews ${new Date(sub.renewsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }
  return '';
}
