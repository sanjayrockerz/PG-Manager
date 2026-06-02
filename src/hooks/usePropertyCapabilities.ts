import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export interface PropertyCapabilities {
  canView: boolean;
  canManageTenants: boolean;
  canManagePayments: boolean;
  canManageMaintenance: boolean;
  canManageAnnouncements: boolean;
  isOwner: boolean;
}

const FULL_ACCESS: PropertyCapabilities = {
  canView: true,
  canManageTenants: true,
  canManagePayments: true,
  canManageMaintenance: true,
  canManageAnnouncements: true,
  isOwner: true,
};

const NO_ACCESS: PropertyCapabilities = {
  canView: false,
  canManageTenants: false,
  canManagePayments: false,
  canManageMaintenance: false,
  canManageAnnouncements: false,
  isOwner: false,
};

/**
 * Returns the current user's effective capabilities for a given property.
 * Owners always get full access. Scoped staff get capabilities from their scope row.
 * Pass 'all' to get the union of capabilities across all assigned properties.
 */
export function usePropertyCapabilities(propertyId: string | 'all' | null): PropertyCapabilities {
  const { user } = useAuth();
  const [caps, setCaps] = useState<PropertyCapabilities>(FULL_ACCESS);

  useEffect(() => {
    if (!user) {
      setCaps(NO_ACCESS);
      return;
    }

    // Owners have full access — no DB query needed
    if (user.role === 'owner' || user.role === 'platform_admin' || user.role === 'admin' || user.role === 'super_admin') {
      setCaps(FULL_ACCESS);
      return;
    }

    // Tenant has no operational access
    if (user.role === 'tenant') {
      setCaps(NO_ACCESS);
      return;
    }

    // Scoped role — fetch from DB
    const fetchCaps = async () => {
      if (!propertyId || propertyId === 'all') {
        // Union across all assigned properties
        const { data, error } = await supabase
          .from('owner_user_property_scopes')
          .select('can_view, can_manage_tenants, can_manage_payments, can_manage_maintenance, can_manage_announcements')
          .eq('user_id', user.id);

        if (error || !data?.length) {
          setCaps(NO_ACCESS);
          return;
        }

        setCaps({
          canView: data.some((r) => r.can_view),
          canManageTenants: data.some((r) => r.can_manage_tenants),
          canManagePayments: data.some((r) => r.can_manage_payments),
          canManageMaintenance: data.some((r) => r.can_manage_maintenance),
          canManageAnnouncements: data.some((r) => r.can_manage_announcements),
          isOwner: false,
        });
        return;
      }

      const { data, error } = await supabase
        .from('owner_user_property_scopes')
        .select('can_view, can_manage_tenants, can_manage_payments, can_manage_maintenance, can_manage_announcements')
        .eq('user_id', user.id)
        .eq('property_id', propertyId)
        .maybeSingle();

      if (error || !data) {
        setCaps(NO_ACCESS);
        return;
      }

      setCaps({
        canView: data.can_view ?? true,
        canManageTenants: data.can_manage_tenants,
        canManagePayments: data.can_manage_payments,
        canManageMaintenance: data.can_manage_maintenance,
        canManageAnnouncements: data.can_manage_announcements,
        isOwner: false,
      });
    };

    void fetchCaps();
  }, [user, propertyId]);

  return caps;
}
