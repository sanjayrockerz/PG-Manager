import type { Request, Response, NextFunction } from 'express';
import { db } from '../store/data.js';

// Augment Express Request to carry the authenticated caller
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        name: string;
        role: string;
        phone: string;
      };
    }
  }
}

const DEMO_TOKEN_PREFIX = 'demo-token-';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

/**
 * Verifies the bearer token and populates req.authUser.
 *
 * Demo mode: expects tokens of the form `demo-token-{userId}`.
 * Production: swap the demo block below for Supabase JWT verification:
 *   const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
 *   if (error || !user) { res.status(401).json({ message: 'Invalid token' }); return; }
 *   req.authUser = { id: user.id, role: user.user_metadata?.role ?? 'owner', ... };
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({ message: 'Authentication required. Provide a Bearer token.' });
    return;
  }

  if (token.startsWith(DEMO_TOKEN_PREFIX)) {
    const userId = token.slice(DEMO_TOKEN_PREFIX.length);
    const user = db.users.find((u) => u.id === userId);

    if (!user) {
      res.status(401).json({ message: 'Invalid or expired token.' });
      return;
    }

    req.authUser = {
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
    };
    next();
    return;
  }

  // Non-demo token received but production JWT verification not yet wired — reject.
  res.status(401).json({ message: 'Invalid authentication token.' });
}

/**
 * Like requireAuth but does not reject unauthenticated requests.
 * Populates req.authUser if a valid token is present.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (token?.startsWith(DEMO_TOKEN_PREFIX)) {
    const userId = token.slice(DEMO_TOKEN_PREFIX.length);
    const user = db.users.find((u) => u.id === userId);
    if (user) {
      req.authUser = { id: user.id, name: user.name, role: user.role, phone: user.phone };
    }
  }

  next();
}
