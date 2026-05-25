import type { Request, Response, NextFunction } from 'express';
import { db } from '../store/data.js';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

function isAdmin(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

/**
 * Validates that the authenticated user owns the property referenced in
 * req.params.propertyId or req.body.propertyId.
 * Admin roles bypass this check.
 */
export function validatePropertyOwnership(req: Request, res: Response, next: NextFunction): void {
  const { authUser } = req;

  if (!authUser) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  if (isAdmin(authUser.role)) {
    next();
    return;
  }

  const propertyId = (req.params.propertyId ?? req.body?.propertyId ?? '') as string;

  if (!propertyId) {
    // No specific property being targeted — allow and let the handler filter by owner
    next();
    return;
  }

  const property = db.properties.find((p) => p.id === propertyId);
  if (!property) {
    res.status(404).json({ message: 'Property not found.' });
    return;
  }

  if (property.ownerId !== authUser.id) {
    res.status(403).json({ message: 'Access denied: you do not own this property.' });
    return;
  }

  next();
}

/**
 * Validates that the authenticated user owns the property of the tenant
 * referenced in req.params.tenantId.
 * Admin roles bypass this check.
 */
export function validateTenantOwnership(req: Request, res: Response, next: NextFunction): void {
  const { authUser } = req;

  if (!authUser) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  if (isAdmin(authUser.role)) {
    next();
    return;
  }

  const { tenantId } = req.params;
  if (!tenantId) {
    next();
    return;
  }

  const tenant = db.tenants.find((t) => t.id === tenantId);
  if (!tenant) {
    res.status(404).json({ message: 'Tenant not found.' });
    return;
  }

  const property = db.properties.find((p) => p.id === tenant.propertyId);
  if (!property || property.ownerId !== authUser.id) {
    res.status(403).json({ message: 'Access denied: this tenant does not belong to your properties.' });
    return;
  }

  next();
}

/**
 * Validates that the authenticated user owns the property of the payment
 * referenced in req.params.paymentId.
 * Admin roles bypass this check.
 */
export function validatePaymentOwnership(req: Request, res: Response, next: NextFunction): void {
  const { authUser } = req;

  if (!authUser) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  if (isAdmin(authUser.role)) {
    next();
    return;
  }

  const { paymentId } = req.params;
  if (!paymentId) {
    next();
    return;
  }

  const payment = db.payments.find((p) => p.id === paymentId);
  if (!payment) {
    res.status(404).json({ message: 'Payment not found.' });
    return;
  }

  const property = db.properties.find((p) => p.id === payment.propertyId);
  if (!property || property.ownerId !== authUser.id) {
    res.status(403).json({ message: 'Access denied: this payment does not belong to your properties.' });
    return;
  }

  next();
}
