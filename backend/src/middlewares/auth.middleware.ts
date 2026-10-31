import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

export interface AuthUserPayload {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: string;
  tokenVersion: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

// JWT_SECRET must be set via environment variable. Production startup aborts if missing (see server.ts).
const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET && process.env.NODE_ENV !== 'test') {
  throw new Error('[AUTH MIDDLEWARE] JWT_SECRET environment variable is not set.');
}

// Shared prisma instance (passed in) or a local one for middleware use.
// We import server's prisma lazily to avoid circular deps.
let _prisma: PrismaClient | null = null;
export function setPrismaForMiddleware(p: PrismaClient) {
  _prisma = p;
}

export function parseTokenFromRequest(req: Request): string | null {
  // Cookie only — Bearer header support removed; all auth flows use httpOnly cookie.
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const authCookie = cookies.find((c) => c.startsWith('auth_token='));
    if (authCookie) {
      return decodeURIComponent(authCookie.substring('auth_token='.length));
    }
  }
  return null;
}

async function verifyTokenVersion(userId: string, tokenVersion: number): Promise<boolean> {
  if (!_prisma) return true; // Skip DB check when prisma not configured (e.g., old unit tests)
  try {
    const user = await _prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });
    return user?.tokenVersion === tokenVersion;
  } catch {
    return false;
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = parseTokenFromRequest(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    // Async tokenVersion check: fire-and-forget for optionalAuth (don't block)
    if (_prisma && decoded.tokenVersion !== undefined) {
      verifyTokenVersion(decoded.id, decoded.tokenVersion).then((valid) => {
        if (!valid) req.user = undefined;
      });
    }
  } catch {
    // Invalid/expired token silently ignored in optionalAuth
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = parseTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please login.',
    });
  }

  let decoded: AuthUserPayload;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session. Please login again.',
    });
  }

  // Verify tokenVersion against DB to enforce server-side logout revocation
  if (_prisma && decoded.tokenVersion !== undefined) {
    verifyTokenVersion(decoded.id, decoded.tokenVersion).then((valid) => {
      if (!valid) {
        return res.status(401).json({
          success: false,
          error: 'Session has been revoked. Please login again.',
        });
      }
      req.user = decoded;
      next();
    });
  } else {
    req.user = decoded;
    next();
  }
}

export function requireCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'CUSTOMER' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Customer account required.',
      });
    }
    next();
  });
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Administrator privileges required.',
      });
    }
    next();
  });
}
