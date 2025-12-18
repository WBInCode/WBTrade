# 🔐 WBTrade Security Documentation

## Overview

WBTrade implements production-grade authentication and authorization with multiple layers of security protection.

## Security Features

### 1. Password Security
- **Minimum requirements**:
  - 8+ characters
  - 1 uppercase letter
  - 1 lowercase letter
  - 1 number
  - 1 special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)
- **bcrypt hashing** with 12 salt rounds
- **Common password detection** - blocks known weak passwords
- **Password strength scoring** - weak/fair/good/strong

### 2. Account Protection
- **Account lockout** after 5 failed login attempts
- **15-minute lockout duration** (configurable)
- **Failed attempt tracking** in Redis (survives server restart)
- **Lockout notification** in audit logs

### 3. Token Security
- **JWT Access tokens** (15 minutes expiry)
- **JWT Refresh tokens** (7 days expiry, 30 days with "remember me")
- **Token rotation** - refresh tokens are single-use
- **Redis-based token blacklist** - revoked tokens are tracked
- **Separate secrets** for access and refresh tokens

### 4. Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 100 requests | 15 minutes |
| Login | Progressive | See below |
| Registration | 3 requests | 1 hour |
| Password Reset | 3 requests | 1 hour |

**Progressive Login Rate Limiting**:
- 1st-5th attempt: allowed
- After 5 failures: account locked for 15 minutes
- IP-based rate limiting: 10 attempts per 15 minutes

### 5. Security Headers (Helmet)
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection

### 6. Audit Logging
All security events are logged:
- Login success/failure
- Account lockouts
- Password changes
- Registration
- Suspicious activity

Logs include:
- User ID and email
- IP address
- User agent
- Timestamp
- Action result

### 7. Email Verification
- Secure random tokens (32 bytes hex)
- 24-hour token expiry
- Single-use tokens
- Prevents account enumeration

### 8. Password Reset
- Secure random tokens (32 bytes hex)
- 1-hour token expiry
- Single-use tokens
- Same response for existing/non-existing emails (prevents enumeration)

## Required Environment Variables

```bash
# CRITICAL - Must be set in production
JWT_ACCESS_SECRET=<64+ character random string>
JWT_REFRESH_SECRET=<64+ character random string>
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://...

# Generate secrets with:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## API Endpoints

### Public Endpoints (Rate Limited)
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/auth/logout | Logout |
| POST | /api/auth/verify-email | Verify email |
| POST | /api/auth/forgot-password | Request reset |
| POST | /api/auth/reset-password | Reset password |

### Protected Endpoints (Require Auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/auth/me | Get profile |
| POST | /api/auth/change-password | Change password |
| POST | /api/auth/logout-all | Logout all devices |
| GET | /api/auth/sessions | List active sessions |
| DELETE | /api/auth/sessions/:id | Revoke session |

## Security Best Practices

### For Development
1. Never commit `.env` files
2. Use different secrets for dev/staging/prod
3. Test rate limiting doesn't block legitimate use

### For Production
1. **Use strong, unique secrets** (64+ characters)
2. **Enable HTTPS only** - set HSTS headers
3. **Configure Redis** with authentication
4. **Set up monitoring** for suspicious patterns
5. **Regular security audits**
6. **Implement email verification** properly
7. **Use WAF** (Web Application Firewall)
8. **Enable logging** to external service

### Token Storage (Frontend)
- Store access token in memory only
- Store refresh token in HttpOnly cookie
- Never store tokens in localStorage
- Implement automatic token refresh

## Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| Brute force | Rate limiting + account lockout |
| Password spray | IP-based rate limiting |
| Token theft | Short expiry + blacklist + rotation |
| User enumeration | Same response for all emails |
| Timing attacks | Constant-time comparison + random delays |
| Session hijacking | IP/device tracking + audit logs |
| CSRF | CSRF tokens (when using cookies) |
| XSS | CSP headers + input sanitization |

## Incident Response

If security breach suspected:
1. Check audit logs (`SecurityAuditLog` table)
2. Revoke all sessions: `DELETE FROM "RefreshToken"`
3. Force password resets if needed
4. Clear Redis token blacklist if needed
5. Review and rotate all secrets

## Future Improvements

- [ ] Two-Factor Authentication (2FA/TOTP)
- [ ] OAuth2 providers (Google, GitHub)
- [ ] Device fingerprinting
- [ ] Geolocation-based alerts
- [ ] Password history (prevent reuse)
- [ ] Adaptive authentication
- [ ] Security questions for recovery
