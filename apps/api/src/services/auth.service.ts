import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db';
import { UserRole } from '@prisma/client';
import { emailQueue } from '../lib/queue';

// Types
interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  createdAt: Date;
}

// Constants
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '60m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 12;

// Token blacklist (in production use Redis)
const tokenBlacklist = new Set<string>();

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'CUSTOMER',
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Send verification email
    try {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
      const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
      
      await emailQueue.add('send-email', {
        to: user.email,
        template: 'email-verification',
        context: {
          name: user.firstName,
          verificationUrl,
        },
      });
      console.log(`[Auth] Verification email queued for ${user.email}`);
    } catch (emailError) {
      // Don't fail registration if email fails
      console.error('[Auth] Failed to queue verification email:', emailError);
    }

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      return {
        success: true,
        message: 'Email already verified',
      };
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Send confirmation email
    try {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
      await emailQueue.add('send-email', {
        to: user.email,
        template: 'email-verified',
        context: {
          name: user.firstName,
          shopUrl: frontendUrl,
        },
      });
    } catch (emailError) {
      console.error('[Auth] Failed to queue confirmation email:', emailError);
    }

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      return {
        success: false,
        message: 'Email already verified',
      };
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    // Send verification email
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    
    await emailQueue.add('send-email', {
      to: user.email,
      template: 'email-verification',
      context: {
        name: user.firstName,
        verificationUrl,
      },
    });

    return {
      success: true,
      message: 'Verification email sent',
    };
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated. Please contact support.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Check if token is blacklisted
    if (tokenBlacklist.has(refreshToken)) {
      throw new Error('Token has been revoked');
    }

    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as TokenPayload;

      // Check if user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Blacklist old refresh token
      tokenBlacklist.add(refreshToken);

      // Generate new tokens
      return this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Logout - blacklist token
   */
  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    // Blacklist access token
    tokenBlacklist.add(accessToken);

    // Blacklist refresh token if provided
    if (refreshToken) {
      tokenBlacklist.add(refreshToken);
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    // Check blacklist
    if (tokenBlacklist.has(token)) {
      throw new Error('Token has been revoked');
    }

    try {
      return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Forgot password - generate reset token
   */
  async forgotPassword(email: string): Promise<{ resetToken: string; expiresAt: Date }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists
      throw new Error('If this email exists, a reset link will be sent');
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password-reset' },
      ACCESS_TOKEN_SECRET,
      { expiresIn: '1h' }
    );

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Send password reset email
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      await emailQueue.add('send-email', {
        to: user.email,
        template: 'password-reset',
        context: {
          resetUrl,
          name: user.firstName,
        },
      });
      console.log(`[Auth] Password reset email queued for ${user.email}`);
    } catch (emailError) {
      console.error('[Auth] Failed to queue password reset email:', emailError);
      throw new Error('Failed to send password reset email');
    }

    return { resetToken, expiresAt };
  }

  /**
   * Reset password using token
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    try {
      const payload = jwt.verify(resetToken, ACCESS_TOKEN_SECRET) as {
        userId: string;
        purpose: string;
      };

      if (payload.purpose !== 'password-reset') {
        throw new Error('Invalid reset token');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password
      await prisma.user.update({
        where: { id: payload.userId },
        data: { password: hashedPassword },
      });

      // Blacklist the reset token
      tokenBlacklist.add(resetToken);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Reset token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid reset token');
      }
      throw error;
    }
  }

  /**
   * Change password (for logged in users)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string }
  ): Promise<UserResponse> {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.sanitizeUser(user);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Generate access and refresh tokens
   */
  private generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: UserRole;
    createdAt: Date;
    password?: string;
  }): UserResponse {
    const { password, ...sanitized } = user;
    return sanitized as UserResponse;
  }
}

// Export singleton instance
export const authService = new AuthService();
