import { Request, Response, NextFunction } from 'express';
import { secureAuthService } from '../services/auth.service.secure';
import { UserRole } from '@prisma/client';

// Extend Express Request to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
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
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ message: 'Brak naglówka autoryzacji' });
      return;
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      res.status(401).json({ message: 'Nieprawidlowy format autoryzacji' });
      return;
    }

    // Verify token (async - checks blacklist)
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
        res.status(401).json({ message: 'Token wygasl', code: 'TOKEN_EXPIRED' });
        return;
      }
      if (error.message === 'Token zostal uniewazniony') {
        res.status(401).json({ message: 'Token zostal uniewazniony', code: 'TOKEN_REVOKED' });
        return;
      }
    }
    res.status(401).json({ message: 'Nieprawidlowy token' });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token exists, but doesn't require it
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      res.status(401).json({ message: 'Wymagane uwierzytelnienie' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        message: 'Niewystarczajace uprawnienia',
        required: allowedRoles,
        current: req.user.role
      });
      return;
    }

    next();
  };
}

/**
 * Admin only middleware
 */
export const adminOnly = roleGuard('ADMIN');

/**
 * Admin or Warehouse staff middleware
 */
export const warehouseAccess = roleGuard('ADMIN', 'WAREHOUSE');
