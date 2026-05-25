import { useAuth } from '../contexts/AuthContext';
import { hasPermission, type PermissionAction } from '../utils/permissions';

export interface PermissionGuard {
  can: (action: PermissionAction) => boolean;
  cannot: (action: PermissionAction) => boolean;
  role: string | null;
}

export function usePermission(): PermissionGuard {
  const { user } = useAuth();

  const can = (action: PermissionAction): boolean => hasPermission(user?.role, action);

  return {
    can,
    cannot: (action: PermissionAction) => !can(action),
    role: user?.role ?? null,
  };
}
