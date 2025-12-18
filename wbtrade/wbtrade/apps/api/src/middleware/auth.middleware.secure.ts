import { Request, Response, NextFunction } from 'express';
import { secureAuthService } from '../services/auth.service.secure';
import { UserRole } from '@prisma/client';
import { logSuspiciousActivity, AuditAction } from '../lib/audit';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
        sessionId: string;
      };
    }
  }
}

/**
 * Get client IP address (handles proxies)
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Get user agent
 */
export function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        message: 'No authorization header provided',
        code: 'NO_AUTH_HEADER',
      });
      return;
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      res.status(401).json({
        message: 'Invalid authorization format. Use: Bearer <token>',
        code: 'INVALID_AUTH_FORMAT',
      });
      return;
    }

    // Verify token (this checks blacklist too)
    const payload = await secureAuthService.verifyAccessToken(token);

    // Attach user to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Access token expired') {
        res.status(401).json({
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
        });
        return;
      }
      if (error.message === 'Token has been revoked') {
        res.status(401).json({
          message: 'Token has been revoked',
          code: 'TOKEN_REVOKED',
        });
        return;
      }
    }

    // Log suspicious activity for invalid tokens
    await logSuspiciousActivity(
      'Invalid token attempt',
      undefined,
      undefined,
      getClientIp(req),
      { userAgent: getUserAgent(req) }
    );

    res.status(401).json({
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token exists, but doesn't require it
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    next();
    return;
  }

  try {
    const payload = await secureAuthService.verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  } catch {
    // Ignore errors for optional auth
  }

  next();
}

/**
 * Role-based access control middleware
 * Must be used after authGuard
 */
export function roleGuard(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: allowedRoles,
        current: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Email verification required middleware
 */
export async function emailVerifiedGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  // Check if email is verified
  const user = await secureAuthService.getUserById(req.user.userId);

  if (!user || !user.emailVerified) {
    res.status(403).json({
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }

  next();
}

/**
 * Admin only middleware
 */
export const adminOnly = roleGuard('ADMIN');

/**
 * Admin or Warehouse staff middleware
 */
export const warehouseAccess = roleGuard('ADMIN', 'WAREHOUSE');

/**
 * CSRF protection (for cookie-based sessions)
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip for GET/HEAD/OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const csrfToken = req.headers['x-csrf-token'] || req.body?._csrf;
  const sessionCsrf = req.cookies?.csrf;

  if (!csrfToken || csrfToken !== sessionCsrf) {
    res.status(403).json({
      message: 'Invalid CSRF token',
      code: 'CSRF_INVALID',
    });
    return;
  }

  next();
}
