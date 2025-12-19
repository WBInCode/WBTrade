import { prisma } from '../db';

// ============================================
// SECURITY AUDIT LOGGING
// ============================================

export enum AuditAction {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_BLOCKED = 'LOGIN_BLOCKED',
  LOGOUT = 'LOGOUT',
  
  // Registration events
  REGISTER_SUCCESS = 'REGISTER_SUCCESS',
  REGISTER_FAILED = 'REGISTER_FAILED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  
  // Password events
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  PASSWORD_RESET_FAILED = 'PASSWORD_RESET_FAILED',
  
  // Account events
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  
  // Token events
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

interface AuditLogData {
  action: AuditAction;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  severity?: AuditSeverity;
  success?: boolean;
}

/**
 * Log security audit event
 */
export async function logAuditEvent(data: AuditLogData): Promise<void> {
  const {
    action,
    userId,
    email,
    ipAddress,
    userAgent,
    metadata,
    severity = AuditSeverity.INFO,
    success = true,
  } = data;

  try {
    // Log to database
    await prisma.securityAuditLog.create({
      data: {
        action,
        userId,
        email,
        ipAddress,
        userAgent,
        metadata: metadata ? JSON.stringify(metadata) : null,
        severity,
        success,
        createdAt: new Date(),
      },
    });

    // Also log to console for immediate visibility
    const logLevel = severity === AuditSeverity.CRITICAL ? 'error' :
                     severity === AuditSeverity.ERROR ? 'error' :
                     severity === AuditSeverity.WARNING ? 'warn' : 'info';
    
    console[logLevel](`[AUDIT] ${action}`, {
      userId,
      email,
      ipAddress,
      success,
      severity,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Log successful login
 */
export async function logLoginSuccess(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    action: AuditAction.LOGIN_SUCCESS,
    userId,
    email,
    ipAddress,
    userAgent,
    severity: AuditSeverity.INFO,
    success: true,
  });
}

/**
 * Log failed login attempt
 */
export async function logLoginFailed(
  email: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string,
  attemptCount?: number
): Promise<void> {
  await logAuditEvent({
    action: AuditAction.LOGIN_FAILED,
    email,
    ipAddress,
    userAgent,
    metadata: { reason, attemptCount },
    severity: attemptCount && attemptCount >= 3 ? AuditSeverity.WARNING : AuditSeverity.INFO,
    success: false,
  });
}

/**
 * Log account lockout
 */
export async function logAccountLocked(
  email: string,
  reason: string,
  duration: number,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    action: AuditAction.ACCOUNT_LOCKED,
    email,
    ipAddress,
    metadata: { reason, durationSeconds: duration },
    severity: AuditSeverity.WARNING,
    success: true,
  });
}

/**
 * Log registration
 */
export async function logRegistration(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    action: AuditAction.REGISTER_SUCCESS,
    userId,
    email,
    ipAddress,
    userAgent,
    severity: AuditSeverity.INFO,
    success: true,
  });
}

/**
 * Log password change
 */
export async function logPasswordChanged(
  userId: string,
  email: string,
  method: 'change' | 'reset',
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    action: AuditAction.PASSWORD_CHANGED,
    userId,
    email,
    ipAddress,
    metadata: { method },
    severity: AuditSeverity.INFO,
    success: true,
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  description: string,
  email?: string,
  userId?: string,
  ipAddress?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    action: AuditAction.SUSPICIOUS_ACTIVITY,
    userId,
    email,
    ipAddress,
    metadata: { description, ...metadata },
    severity: AuditSeverity.CRITICAL,
    success: false,
  });
}

/**
 * Get recent audit logs for user
 */
export async function getUserAuditLogs(
  userId: string,
  limit = 50
): Promise<Array<{
  action: string;
  ipAddress: string | null;
  createdAt: Date;
  success: boolean;
}>> {
  const logs = await prisma.securityAuditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      action: true,
      ipAddress: true,
      createdAt: true,
      success: true,
    },
  });

  return logs;
}

/**
 * Get failed login attempts for email
 */
export async function getFailedLoginAttempts(
  email: string,
  since: Date
): Promise<number> {
  const count = await prisma.securityAuditLog.count({
    where: {
      email,
      action: AuditAction.LOGIN_FAILED,
      createdAt: { gte: since },
    },
  });

  return count;
}

/**
 * Check for suspicious login patterns
 */
export async function checkSuspiciousLogin(
  userId: string,
  ipAddress: string
): Promise<{
  suspicious: boolean;
  reason?: string;
}> {
  // Get recent successful logins
  const recentLogins = await prisma.securityAuditLog.findMany({
    where: {
      userId,
      action: AuditAction.LOGIN_SUCCESS,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      ipAddress: true,
      createdAt: true,
    },
  });

  // Check if this is a new IP
  const knownIps = new Set(recentLogins.map((l) => l.ipAddress).filter(Boolean));
  const isNewIp = !knownIps.has(ipAddress) && knownIps.size > 0;

  // Check for rapid IP changes
  const uniqueRecentIps = new Set(
    recentLogins
      .filter((l) => l.createdAt > new Date(Date.now() - 60 * 60 * 1000)) // Last hour
      .map((l) => l.ipAddress)
  );

  if (uniqueRecentIps.size >= 3) {
    return {
      suspicious: true,
      reason: 'Multiple IP addresses used in short time period',
    };
  }

  if (isNewIp) {
    return {
      suspicious: true,
      reason: 'Login from new IP address',
    };
  }

  return { suspicious: false };
}
