import { Request, Response } from 'express';
import { secureAuthService } from '../services/auth.service.secure';
import { getClientIp, getUserAgent } from '../middleware/auth.middleware.secure';

/**
 * Secure Auth Controller
 * Handles all authentication-related HTTP requests with full security features
 */
export class SecureAuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate required fields
      if (!email || !password) {
        res.status(400).json({
          message: 'Email and password are required',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      const result = await secureAuthService.register({
        email,
        password,
        firstName,
        lastName,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });

      res.status(201).json({
        message: 'Registration successful. Please verify your email.',
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
        },
        tokens: result.tokens,
        // In production, send verification token via email, not in response
        ...(process.env.NODE_ENV !== 'production' && {
          verificationToken: result.verificationToken,
        }),
      });
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific errors
        if (error.message === 'Email already exists') {
          res.status(409).json({
            message: 'An account with this email already exists',
            code: 'EMAIL_EXISTS',
          });
          return;
        }

        if (error.message.includes('Password')) {
          res.status(400).json({
            message: error.message,
            code: 'WEAK_PASSWORD',
          });
          return;
        }

        if (error.message.includes('Invalid email')) {
          res.status(400).json({
            message: error.message,
            code: 'INVALID_EMAIL',
          });
          return;
        }
      }

      console.error('Registration error:', error);
      res.status(500).json({
        message: 'Registration failed',
        code: 'REGISTRATION_ERROR',
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          message: 'Email and password are required',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      const result = await secureAuthService.login({
        email,
        password,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });

      res.json({
        message: 'Login successful',
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
        },
        tokens: result.tokens,
        requiresEmailVerification: !result.user.emailVerified,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Account is locked') {
          res.status(423).json({
            message: 'Account is temporarily locked due to too many failed login attempts. Please try again later.',
            code: 'ACCOUNT_LOCKED',
          });
          return;
        }

        if (error.message === 'Invalid credentials') {
          res.status(401).json({
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          });
          return;
        }
      }

      console.error('Login error:', error);
      res.status(500).json({
        message: 'Login failed',
        code: 'LOGIN_ERROR',
      });
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          message: 'Refresh token is required',
          code: 'MISSING_TOKEN',
        });
        return;
      }

      const result = await secureAuthService.refreshToken({
        refreshToken,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });

      res.json({
        message: 'Token refreshed successfully',
        tokens: result.tokens,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Invalid or expired refresh token') {
          res.status(401).json({
            message: 'Invalid or expired refresh token',
            code: 'INVALID_REFRESH_TOKEN',
          });
          return;
        }

        if (error.message === 'Refresh token has been revoked') {
          res.status(401).json({
            message: 'Session has been terminated. Please login again.',
            code: 'TOKEN_REVOKED',
          });
          return;
        }
      }

      console.error('Token refresh error:', error);
      res.status(500).json({
        message: 'Failed to refresh token',
        code: 'REFRESH_ERROR',
      });
    }
  }

  /**
   * Logout current session
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(' ')[1];

      const { refreshToken } = req.body;

      if (!accessToken) {
        res.status(400).json({
          message: 'Access token is required',
          code: 'MISSING_TOKEN',
        });
        return;
      }

      await secureAuthService.logout({
        accessToken,
        refreshToken,
        ipAddress: getClientIp(req),
      });

      res.json({
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Always return success for logout to prevent token probing
      res.json({
        message: 'Logged out successfully',
      });
    }
  }

  /**
   * Logout from all devices
   * POST /api/auth/logout-all
   */
  async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(' ')[1];

      await secureAuthService.logoutAll({
        userId: req.user.userId,
        currentAccessToken: accessToken || '',
        ipAddress: getClientIp(req),
      });

      res.json({
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json({
        message: 'Failed to logout from all devices',
        code: 'LOGOUT_ALL_ERROR',
      });
    }
  }

  /**
   * Verify email
   * POST /api/auth/verify-email
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          message: 'Verification token is required',
          code: 'MISSING_TOKEN',
        });
        return;
      }

      await secureAuthService.verifyEmail(token);

      res.json({
        message: 'Email verified successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Invalid or expired verification token') {
          res.status(400).json({
            message: 'Invalid or expired verification token',
            code: 'INVALID_TOKEN',
          });
          return;
        }
      }

      console.error('Email verification error:', error);
      res.status(500).json({
        message: 'Email verification failed',
        code: 'VERIFICATION_ERROR',
      });
    }
  }

  /**
   * Resend verification email
   * POST /api/auth/resend-verification
   */
  async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          message: 'Email is required',
          code: 'MISSING_EMAIL',
        });
        return;
      }

      const token = await secureAuthService.resendVerificationEmail(
        email,
        getClientIp(req)
      );

      res.json({
        message: 'Verification email sent if account exists',
        // In production, send via email, not in response
        ...(process.env.NODE_ENV !== 'production' && { verificationToken: token }),
      });
    } catch {
      // Always return success to prevent user enumeration
      res.json({
        message: 'Verification email sent if account exists',
      });
    }
  }

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          message: 'Email is required',
          code: 'MISSING_EMAIL',
        });
        return;
      }

      const token = await secureAuthService.requestPasswordReset(
        email,
        getClientIp(req)
      );

      res.json({
        message: 'Password reset instructions sent if account exists',
        // In production, send via email, not in response
        ...(process.env.NODE_ENV !== 'production' && { resetToken: token }),
      });
    } catch {
      // Always return success to prevent user enumeration
      res.json({
        message: 'Password reset instructions sent if account exists',
      });
    }
  }

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        res.status(400).json({
          message: 'Token and new password are required',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      await secureAuthService.resetPassword({
        token,
        newPassword: password,
        ipAddress: getClientIp(req),
      });

      res.json({
        message: 'Password reset successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Invalid or expired reset token') {
          res.status(400).json({
            message: 'Invalid or expired reset token',
            code: 'INVALID_TOKEN',
          });
          return;
        }

        if (error.message.includes('Password')) {
          res.status(400).json({
            message: error.message,
            code: 'WEAK_PASSWORD',
          });
          return;
        }
      }

      console.error('Password reset error:', error);
      res.status(500).json({
        message: 'Password reset failed',
        code: 'RESET_ERROR',
      });
    }
  }

  /**
   * Change password (authenticated)
   * POST /api/auth/change-password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          message: 'Current password and new password are required',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      await secureAuthService.changePassword({
        userId: req.user.userId,
        currentPassword,
        newPassword,
        ipAddress: getClientIp(req),
      });

      res.json({
        message: 'Password changed successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Current password is incorrect') {
          res.status(400).json({
            message: 'Current password is incorrect',
            code: 'WRONG_PASSWORD',
          });
          return;
        }

        if (error.message.includes('Password')) {
          res.status(400).json({
            message: error.message,
            code: 'WEAK_PASSWORD',
          });
          return;
        }
      }

      console.error('Change password error:', error);
      res.status(500).json({
        message: 'Failed to change password',
        code: 'CHANGE_PASSWORD_ERROR',
      });
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const user = await secureAuthService.getUserById(req.user.userId);

      if (!user) {
        res.status(404).json({
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        message: 'Failed to get profile',
        code: 'PROFILE_ERROR',
      });
    }
  }

  /**
   * Get active sessions
   * GET /api/auth/sessions
   */
  async getSessions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const sessions = await secureAuthService.getActiveSessions(req.user.userId);

      res.json({
        sessions: sessions.map(session => ({
          id: session.id,
          deviceInfo: session.deviceInfo,
          ipAddress: session.ipAddress,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          isCurrent: session.id === req.user?.sessionId,
        })),
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        message: 'Failed to get sessions',
        code: 'SESSIONS_ERROR',
      });
    }
  }

  /**
   * Revoke specific session
   * DELETE /api/auth/sessions/:sessionId
   */
  async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const { sessionId } = req.params;

      await secureAuthService.revokeSession(
        req.user.userId,
        sessionId,
        getClientIp(req)
      );

      res.json({
        message: 'Session revoked successfully',
      });
    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({
        message: 'Failed to revoke session',
        code: 'REVOKE_SESSION_ERROR',
      });
    }
  }
}

export const secureAuthController = new SecureAuthController();
