import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types/entities.js';

/**
 * Enforces that the authenticated caller holds one of the specified roles.
 * Must be applied after requireAuth.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { authUser } = req;

    if (!authUser) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    if (!roles.includes(authUser.role as UserRole)) {
      res.status(403).json({
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${authUser.role}.`,
      });
      return;
    }

    next();
  };
}

/**
 * Allows access only to owner, admin, or super_admin roles.
 * Shorthand for the most common owner-or-admin gate.
 */
export function requireOwnerOrAdmin(req: Request, res: Response, next: NextFunction): void {
  const { authUser } = req;

  if (!authUser) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const ownerAndAdminRoles: UserRole[] = ['owner', 'admin', 'super_admin'];
  if (!ownerAndAdminRoles.includes(authUser.role as UserRole)) {
    res.status(403).json({ message: 'Access denied. Owner or admin role required.' });
    return;
  }

  next();
}

/**
 * Allows access only to admin or super_admin roles.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const { authUser } = req;

  if (!authUser) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  if (authUser.role !== 'admin' && authUser.role !== 'super_admin') {
    res.status(403).json({ message: 'Access denied. Admin role required.' });
    return;
  }

  next();
}
