import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useProperty, type Property, type Room } from './PropertyContext';
import { useAuth } from './AuthContext';
import type { OwnerSubscriptionRecord } from '../services/supabaseData';
import { supabaseOwnerDataApi } from '../services/supabaseData';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkspaceAccessRole = 'owner' | 'manager' | 'staff';

export interface WorkspaceOccupancy {
  mode: 'BED_BASED' | 'ROOM_BASED';
  label: string;     // 'Beds' | 'Rooms'
  total: number;
  occupied: number;
  rate: number;      // 0–100
}

export interface WorkspaceSubscriptionSummary {
  status: 'trialing' | 'active' | 'past_due' | 'cancelled';
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
  selectedWorkspace: WorkspaceProperty | null; // null = 'all'
  setSelectedWorkspace: (ws: WorkspaceProperty | null) => void;
  totals: WorkspaceTotals;
  isLoading: boolean;
}

// ─── Occupancy computation ────────────────────────────────────────────────────

function computeWorkspaceOccupancy(property: Property): WorkspaceOccupancy {
  const mode = property.occupancyMode ?? 'BED_BASED';
  const rooms = property.rooms;

  if (mode === 'ROOM_BASED') {
    const total = rooms.filter(r => r.status !== 'maintenance').length;
    const occupied = rooms.filter(r => r.status === 'occupied').length;
    return {
      mode,
      label: 'Rooms',
      total: rooms.length,
      occupied,
      rate: total > 0 ? Math.round((occupied / total) * 100) : 0,
    };
  }

  // BED_BASED
  const totalBeds = rooms.reduce((sum, r) => sum + r.beds, 0);
  const occupiedBeds = rooms.reduce((sum, r) => sum + (r.occupiedBeds ?? 0), 0);
  return {
    mode,
    label: 'Beds',
    total: totalBeds,
    occupied: occupiedBeds,
    rate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
  };
}

function buildWorkspaceProperty(
  property: Property,
  accessRole: WorkspaceAccessRole,
  subscription: WorkspaceSubscriptionSummary | null,
): WorkspaceProperty {
  return {
    propertyId: property.id,
    propertyName: property.name,
    city: property.city,
    locality: property.locality ?? property.city,
    floors: property.floors,
    totalRooms: property.totalRooms,
    rooms: property.rooms,
    occupancyMode: property.occupancyMode ?? 'BED_BASED',
    accessRole,
    occupancy: computeWorkspaceOccupancy(property),
    subscription,
  };
}

// ─── Context + Provider ───────────────────────────────────────────────────────

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { properties, selectedProperty, setSelectedProperty, isLoading: propertiesLoading } = useProperty();
  const { user } = useAuth();

  const [subscription, setSubscription] = useState<WorkspaceSubscriptionSummary | null>(null);
  const [selectedWorkspace, setSelectedWorkspaceState] = useState<WorkspaceProperty | null>(null);
  // Per-property role map (propertyId → owner|manager|staff) sourced from the
  // property_access view. Enables "Owner of A, Manager of B" instead of one
  // global role. Empty until loaded / when the view is unavailable.
  const [accessByProperty, setAccessByProperty] = useState<Record<string, WorkspaceAccessRole>>({});

  // Fetch subscription once for owner accounts
  useEffect(() => {
    if (!user || user.role !== 'owner') return;

    void supabaseOwnerDataApi.getOwnerSubscription()
      .then((sub: OwnerSubscriptionRecord) => {
        setSubscription({
          status: sub.status,
          planCode: sub.planCode,
          trialEndsAt: sub.trialEndsAt ?? null,
          renewsAt: sub.renewsAt ?? null,
        });
      })
      .catch(() => {
        // Non-fatal — subscription shown as null
      });
  }, [user]);

  // Load per-property access roles (owner of A, manager of B, …). Falls back to
  // global role when the view is unavailable or returns nothing.
  useEffect(() => {
    if (!user) { setAccessByProperty({}); return; }
    let cancelled = false;
    void supabaseOwnerDataApi.listPropertyAccess()
      .then((rows) => {
        if (cancelled) return;
        // Dedupe to the strongest role per property: owner > manager > staff.
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

  // Determine access role for a property — prefers the explicit per-property
  // grant, then degrades to the user's global role.
  const resolveAccessRole = useCallback((property: Property): WorkspaceAccessRole => {
    const explicit = accessByProperty[property.id];
    if (explicit) return explicit;
    if (!user) return 'staff';
    if (user.role === 'owner') return 'owner';
    if (user.role === 'owner_manager') return 'manager';
    if (user.role === 'staff') return 'staff';
    return 'owner';
  }, [user, accessByProperty]);

  // Build workspace properties
  const workspaceProperties: WorkspaceProperty[] = properties.map(p =>
    buildWorkspaceProperty(
      p,
      resolveAccessRole(p),
      // Only owners can see their own subscription
      user?.role === 'owner' ? subscription : null,
    )
  );

  const ownedProperties = workspaceProperties.filter(w => w.accessRole === 'owner');
  const managedProperties = workspaceProperties.filter(w => w.accessRole === 'manager');
  const staffProperties = workspaceProperties.filter(w => w.accessRole === 'staff');

  const totals: WorkspaceTotals = {
    total: workspaceProperties.length,
    owned: ownedProperties.length,
    managed: managedProperties.length,
    staff: staffProperties.length,
  };

  // Keep selectedWorkspace in sync with property selection and subscription data
  useEffect(() => {
    if (selectedProperty === 'all') {
      setSelectedWorkspaceState(null);
      return;
    }
    const ws = workspaceProperties.find(w => w.propertyId === selectedProperty);
    if (ws) {
      setSelectedWorkspaceState(ws);
    }
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

// Subscription display helpers
export function getSubscriptionLabel(sub: WorkspaceSubscriptionSummary | null): string {
  if (!sub) return '';
  switch (sub.status) {
    case 'trialing': return 'Trial Active';
    case 'active':   return 'Active';
    case 'past_due': return 'Payment Due';
    case 'cancelled': return 'Expired';
    default: return '';
  }
}

export function getSubscriptionDate(sub: WorkspaceSubscriptionSummary | null): string {
  if (!sub) return '';
  if (sub.status === 'trialing' && sub.trialEndsAt) {
    return `Renews ${new Date(sub.trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }
  if ((sub.status === 'active') && sub.renewsAt) {
    return `Renews ${new Date(sub.renewsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }
  return '';
}
