import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, type PermissionAction } from '../utils/permissions';

interface PageGuardProps {
  action: PermissionAction;
  children: ReactNode;
  // Optional fallback UI; if not provided, renders nothing on denial
  fallback?: ReactNode;
}

/**
 * Renders children only if the authenticated user has the required permission.
 * Acts as a defense-in-depth layer beneath the navigation guard in App.tsx.
 * Unauthorized renders produce null (or a fallback) rather than exposing content.
 */
export function PageGuard({ action, children, fallback = null }: PageGuardProps) {
  const { user } = useAuth();

  if (!user) return null;

  if (!hasPermission(user.role, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
