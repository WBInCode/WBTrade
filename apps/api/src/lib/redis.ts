import Redis from 'ioredis';
import crypto from 'crypto';

// Singleton Redis instance
let redisClient: Redis | null = null;
let redisDisabled = false; // Flag to permanently disable Redis after connection failures

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisClient !== null;
}

/**
 * Get Redis client instance (singleton)
 * Returns null if Redis is unavailable (e.g., limit exceeded)
 */
export function getRedisClient(): Redis | null {
  if (redisDisabled) return null;
  
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1, // Fail fast - don't hang requests
        retryStrategy(times) {
          if (times > 3) {
            console.error('❌ Redis: Max retry attempts reached - continuing without Redis');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 100, 1000);
          console.log(`🔄 Redis: Retry attempt ${times}, waiting ${delay}ms...`);
          return delay;
        },
        enableReadyCheck: true,
        lazyConnect: true, // Don't connect immediately - lazy connect
        connectTimeout: 5000, // 5 seconds
      });

      redisClient.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
        if (
          err.message.includes('max requests limit') ||
          err.message.includes('ECONNRESET') ||
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('ETIMEDOUT') ||
          err.message.includes('EHOSTUNREACH') ||
          err.message.includes('Connection is closed') ||
          err.message.includes('MaxRetriesPerRequestError')
        ) {
          console.error('⚠️  Redis connection failed - app will run without Redis');
          const oldClient = redisClient;
          redisClient = null;
          redisDisabled = true; // Permanently disable Redis for this session
          if (oldClient) {
            oldClient.disconnect(); // Force disconnect - rejects all pending commands
          }
        }
        if (!process.env.REDIS_URL) {
          console.error('⚠️  REDIS_URL environment variable is not set!');
        }
      });

      redisClient.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      redisClient.on('ready', () => {
        console.log('✅ Redis ready to accept commands');
      });

      redisClient.on('close', () => {
        console.warn('⚠️  Redis connection closed - app will run without caching');
        redisClient = null;
      });

      redisClient.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });
    } catch (error) {
      console.error('❌ Failed to create Redis client:', error);
      redisClient = null;
    }
  }

  return redisClient;
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Token blacklist operations
const TOKEN_BLACKLIST_PREFIX = 'auth:blacklist:';
const TOKEN_BLACKLIST_TTL = 7 * 24 * 60 * 60; // 7 days (match refresh token expiry)

/**
 * Add token to blacklist (no-op if Redis unavailable)
 */
export async function blacklistToken(token: string, ttlSeconds?: number): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    console.warn('⚠️  Redis unavailable - token blacklist disabled');
    return;
  }
  const key = `${TOKEN_BLACKLIST_PREFIX}${hashToken(token)}`;
  try {
    await redis.set(key, '1', 'EX', ttlSeconds || TOKEN_BLACKLIST_TTL);
  } catch (error) {
    console.error('❌ Failed to blacklist token:', error);
  }
}

/**
 * Check if token is blacklisted (returns false if Redis unavailable)
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    console.warn('⚠️  Redis unavailable - token blacklist check skipped');
    return false;
  }
  const key = `${TOKEN_BLACKLIST_PREFIX}${hashToken(token)}`;
  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (error) {
    console.error('❌ Failed to check token blacklist:', error);
    return false;
  }
}

// Rate limiting storage
const RATE_LIMIT_PREFIX = 'ratelimit:';

/**
 * Increment rate limit counter (returns default if Redis unavailable)
 */
export async function incrementRateLimit(
  key: string,
  windowSeconds: number
): Promise<{ count: number; ttl: number }> {
  const redis = getRedisClient();
  if (!redis) {
    console.warn('⚠️  Redis unavailable - rate limiting disabled');
    return { count: 1, ttl: windowSeconds };
  }
  
  const fullKey = `${RATE_LIMIT_PREFIX}${key}`;
  
  try {
    const multi = redis.multi();
    multi.incr(fullKey);
    multi.ttl(fullKey);
    
    const results = await multi.exec();
    const count = results?.[0]?.[1] as number;
    let ttl = results?.[1]?.[1] as number;
    
    // Set TTL if key is new
    if (ttl === -1) {
      await redis.expire(fullKey, windowSeconds);
      ttl = windowSeconds;
    }
    
    return { count, ttl };
  } catch (error) {
    console.error('❌ Rate limit error:', error);
    return { count: 1, ttl: windowSeconds };
  }
}

// Login attempt tracking
const LOGIN_ATTEMPTS_PREFIX = 'auth:attempts:';
const LOGIN_LOCKOUT_PREFIX = 'auth:lockout:';

/**
 * Record failed login attempt
 */
export async function recordFailedLogin(identifier: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;
  
  const key = `${LOGIN_ATTEMPTS_PREFIX}${identifier}`;
  
  try {
    const count = await redis.incr(key);
    
    // Set expiry for first attempt (15 minutes window)
    if (count === 1) {
      await redis.expire(key, 15 * 60);
    }
    
    return count;
  } catch (error) {
    console.error('❌ Failed to record failed login:', error);
    return 0;
  }
}

/**
 * Get failed login attempts count
 */
export async function getFailedLoginAttempts(identifier: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;
  
  const key = `${LOGIN_ATTEMPTS_PREFIX}${identifier}`;
  try {
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    console.error('❌ Failed to get failed login attempts:', error);
    return 0;
  }
}

/**
 * Reset failed login attempts
 */
export async function resetFailedLoginAttempts(identifier: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  
  const key = `${LOGIN_ATTEMPTS_PREFIX}${identifier}`;
  try {
    await redis.del(key);
  } catch (error) {
    console.error('❌ Failed to reset failed login attempts:', error);
  }
}

/**
 * Lock account after too many failed attempts
 */
export async function lockAccount(identifier: string, durationSeconds: number): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  
  const key = `${LOGIN_LOCKOUT_PREFIX}${identifier}`;
  try {
    await redis.set(key, Date.now().toString(), 'EX', durationSeconds);
  } catch (error) {
    console.error('❌ Failed to lock account:', error);
  }
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(identifier: string): Promise<{ locked: boolean; ttl: number }> {
  const redis = getRedisClient();
  if (!redis) return { locked: false, ttl: 0 };
  
  const key = `${LOGIN_LOCKOUT_PREFIX}${identifier}`;
  
  try {
    const multi = redis.multi();
    multi.exists(key);
    multi.ttl(key);
    
    const results = await multi.exec();
    const exists = results?.[0]?.[1] as number;
    const ttl = results?.[1]?.[1] as number;
    
    return { locked: exists === 1, ttl: Math.max(0, ttl) };
  } catch (error) {
    console.error('❌ Failed to check account lock status:', error);
    return { locked: false, ttl: 0 };
  }
}

// Email verification tokens
const EMAIL_VERIFICATION_PREFIX = 'auth:verify:';
const EMAIL_VERIFICATION_TTL = 24 * 60 * 60; // 24 hours

/**
 * Store email verification token
 */
export async function storeEmailVerificationToken(
  userId: string,
  token: string
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  
  const key = `${EMAIL_VERIFICATION_PREFIX}${token}`;
  await redis.set(key, userId, 'EX', EMAIL_VERIFICATION_TTL);
}

/**
 * Verify email verification token and return userId
 */
export async function verifyEmailToken(token: string): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  
  const key = `${EMAIL_VERIFICATION_PREFIX}${token}`;
  const userId = await redis.get(key);
  
  if (userId) {
    // Delete token after use (one-time use)
    await redis.del(key);
  }
  
  return userId;
}

// Password reset tokens
const PASSWORD_RESET_PREFIX = 'auth:reset:';
const PASSWORD_RESET_TTL = 60 * 60; // 1 hour

/**
 * Store password reset token
 */
export async function storePasswordResetToken(
  userId: string,
  token: string
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  
  const key = `${PASSWORD_RESET_PREFIX}${token}`;
  await redis.set(key, userId, 'EX', PASSWORD_RESET_TTL);
}

/**
 * Verify password reset token and return userId
 */
export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  
  const key = `${PASSWORD_RESET_PREFIX}${token}`;
  try {
    const userId = await redis.get(key);
    
    if (userId) {
      // Delete token after use (one-time use)
      await redis.del(key);
    }
    
    return userId;
  } catch (error) {
    console.error('❌ Failed to verify password reset token:', error);
    return null;
  }
}

// Session management
const SESSION_PREFIX = 'auth:session:';

/**
 * Store user session
 */
export async function storeSession(
  userId: string,
  sessionId: string,
  data: object,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    console.warn('⚠️  Redis unavailable - session storage disabled');
    return;
  }
  const key = `${SESSION_PREFIX}${userId}:${sessionId}`;
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (error) {
    console.error('❌ Failed to store session:', error);
  }
}

/**
 * Get user session
 */
export async function getSession(userId: string, sessionId: string): Promise<object | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  
  const key = `${SESSION_PREFIX}${userId}:${sessionId}`;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ Failed to get session:', error);
    return null;
  }
}

/**
 * Delete user session
 */
export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  
  const key = `${SESSION_PREFIX}${userId}:${sessionId}`;
  try {
    await redis.del(key);
  } catch (error) {
    console.error('❌ Failed to delete session:', error);
  }
}

/**
 * Delete all user sessions (logout from all devices)
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  
  const pattern = `${SESSION_PREFIX}${userId}:*`;
  
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('❌ Failed to delete user sessions:', error);
  }
}

// Helper: Hash token for storage (don't store raw tokens)
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
