import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { incrementRateLimit } from '../lib/redis';

// ============================================
// RATE LIMITING CONFIGURATIONS
// ============================================

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP in production
 * 1000 requests per 15 minutes per IP in development
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    message: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

/**
 * Auth endpoints rate limiter (stricter)
 * 5 attempts per 15 minutes per IP for login/register
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    message: 'Too many authentication attempts, please try again in 15 minutes',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skipSuccessfulRequests: false,
});

/**
 * Login specific rate limiter
 * Combines IP + email to prevent distributed attacks
 * NOTE: In production, max should be 5. See plan.md TODO.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // 5 in production, 100 in development
  message: {
    message: 'Too many login attempts. Please try again in 15 minutes.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const ip = req.ip || '127.0.0.1';
    const email = req.body?.email?.toLowerCase() || 'unknown';
    return `login:${ip}:${email}`;
  },
});

/**
 * Password reset rate limiter
 * 3 attempts per hour per IP
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    message: 'Too many password reset requests. Please try again in 1 hour.',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
    retryAfter: 60 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

/**
 * Registration rate limiter
 * 3 accounts per hour per IP (100 in development)
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 3 : 100,
  message: {
    message: 'Too many accounts created. Please try again in 1 hour.',
    code: 'REGISTER_RATE_LIMIT_EXCEEDED',
    retryAfter: 60 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// ============================================
// CUSTOM REDIS-BASED RATE LIMITER
// ============================================

interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix: string;
  message?: string;
}

/**
 * Create a Redis-based rate limiter middleware
 * Use this for distributed rate limiting across multiple API instances
 */
export function createRedisRateLimiter(options: RateLimitOptions) {
  const { windowSeconds, maxRequests, keyPrefix, message } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${keyPrefix}:${ip}`;

      const { count, ttl } = await incrementRateLimit(key, windowSeconds);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + ttl);

      if (count > maxRequests) {
        res.status(429).json({
          message: message || 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: ttl,
        });
        return;
      }

      next();
    } catch (error) {
      // If Redis fails, allow the request (fail open for availability)
      console.error('Rate limit check failed:', error);
      next();
    }
  };
}

/**
 * Sliding window rate limiter for sensitive operations
 */
export const sensitiveOperationLimiter = createRedisRateLimiter({
  windowSeconds: 60 * 60, // 1 hour
  maxRequests: 10,
  keyPrefix: 'sensitive',
  message: 'Too many sensitive operations. Please try again later.',
});

/**
 * Review creation rate limiter
 * 5 reviews per hour per IP (prevents review spam)
 */
export const reviewRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 5 : 50,
  message: {
    message: 'Zbyt wiele opinii w krótkim czasie. Spróbuj ponownie za godzinę.',
    code: 'REVIEW_RATE_LIMIT_EXCEEDED',
    retryAfter: 60 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

/**
 * Review helpful vote rate limiter
 * 30 votes per 15 minutes per IP (prevents vote spam)
 */
export const reviewHelpfulRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : 200,
  message: {
    message: 'Zbyt wiele głosów w krótkim czasie. Spróbuj ponownie za chwilę.',
    code: 'HELPFUL_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});
