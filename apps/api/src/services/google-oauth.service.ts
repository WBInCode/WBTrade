/**
 * Google OAuth Service
 * Handles Google OAuth authentication flow
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db';
import { AuthProvider } from '@prisma/client';
import {
  storeSession,
} from '../lib/redis';
import { logLoginSuccess, logRegistration } from '../lib/audit';
import { discountService } from './discount.service';
import { emailService } from './email.service';

// ============================================
// CONFIGURATION
// ============================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    console.warn(`⚠️ WARNING: Missing ${key} - Google OAuth will not work`);
    return '';
  }
  return value;
}

const ACCESS_TOKEN_SECRET = getEnvOrThrow('JWT_ACCESS_SECRET');
const REFRESH_TOKEN_SECRET = getEnvOrThrow('JWT_REFRESH_SECRET');
const ACCESS_TOKEN_EXPIRY = '60m';
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ============================================
// TYPES
// ============================================

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface GoogleAuthResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl: string | null;
    emailVerified: boolean;
  };
  tokens: AuthTokens;
  isNewUser: boolean;
}

// ============================================
// GOOGLE OAUTH SERVICE
// ============================================

class GoogleOAuthService {
  /**
   * Generate Google OAuth authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state }),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth is not configured');
    }

    // Debug logging
    console.log('[GoogleOAuth] Token exchange - redirect_uri:', GOOGLE_REDIRECT_URI);
    console.log('[GoogleOAuth] Token exchange - client_id starts with:', GOOGLE_CLIENT_ID?.substring(0, 15));

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID.trim(),
        client_secret: GOOGLE_CLIENT_SECRET.trim(),
        redirect_uri: GOOGLE_REDIRECT_URI.trim(),
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[GoogleOAuth] Token exchange failed:', error);
      throw new Error('Failed to exchange code for tokens');
    }

    return response.json();
  }

  /**
   * Get user info from Google
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user info from Google');
    }

    return response.json();
  }

  /**
   * Authenticate user with Google OAuth
   * Creates a new user if they don't exist, or logs in existing user
   */
  async authenticateWithGoogle(
    code: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<GoogleAuthResult> {
    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code);
    
    // Get user info from Google
    const googleUser = await this.getUserInfo(tokens.access_token);
    
    if (!googleUser.email) {
      throw new Error('Google account does not have an email');
    }

    // Check if user exists by Google ID or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleUser.id },
          { email: googleUser.email.toLowerCase() },
        ],
      },
    });

    let isNewUser = false;

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: googleUser.email.toLowerCase(),
          firstName: googleUser.given_name || googleUser.name?.split(' ')[0] || 'User',
          lastName: googleUser.family_name || googleUser.name?.split(' ').slice(1).join(' ') || '',
          password: null, // No password for OAuth users
          authProvider: AuthProvider.GOOGLE,
          googleId: googleUser.id,
          avatarUrl: googleUser.picture || null,
          emailVerified: googleUser.verified_email,
          emailVerifiedAt: googleUser.verified_email ? new Date() : null,
        },
      });
      
      isNewUser = true;
      await logRegistration(user.id, user.email, ipAddress, userAgent);
      console.log(`[GoogleOAuth] New user created: ${user.email}`);
      
      // Generate welcome discount code and send email (async, don't block registration)
      console.log(`[GoogleOAuth] Starting welcome discount for ${user.email}...`);
      this.sendWelcomeDiscount(user.id, user.email, user.firstName).catch((err) => {
        console.error('[GoogleOAuth] Failed to send welcome discount:', err.message);
      });
    } else {
      // Update existing user with Google info if not already linked
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.id,
            authProvider: AuthProvider.GOOGLE,
            avatarUrl: user.avatarUrl || googleUser.picture || null,
            emailVerified: true,
            emailVerifiedAt: user.emailVerifiedAt || new Date(),
          },
        });
        console.log(`[GoogleOAuth] Linked Google account to existing user: ${user.email}`);
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress || null,
        },
      });
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Generate JWT tokens
    const authTokens = await this.generateTokens(user.id, user.email, user.role, ipAddress, userAgent);

    await logLoginSuccess(user.id, user.email, ipAddress, userAgent);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      },
      tokens: authTokens,
      isNewUser,
    };
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthTokens> {
    const sessionId = crypto.randomUUID();

    const accessToken = jwt.sign(
      {
        userId,
        email,
        role,
        sessionId,
        type: 'access',
      },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      {
        userId,
        sessionId,
        type: 'refresh',
      },
      REFRESH_TOKEN_SECRET,
      { expiresIn: `${REFRESH_TOKEN_EXPIRY_SECONDS}s` }
    );

    // Store session in Redis
    await storeSession(userId, sessionId, {
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      createdAt: new Date().toISOString(),
    }, REFRESH_TOKEN_EXPIRY_SECONDS);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 60 minutes in seconds
    };
  }

  /**
   * Generate welcome discount and send email
   * Called after successful Google OAuth registration (async)
   */
  private async sendWelcomeDiscount(userId: string, email: string, firstName: string): Promise<void> {
    try {
      const discount = await discountService.generateWelcomeDiscount(userId, email);
      
      await emailService.sendWelcomeDiscountEmail(
        email,
        firstName || email.split('@')[0],
        discount.couponCode,
        discount.discountPercent,
        discount.expiresAt
      );
      
      console.log(`✅ [GoogleOAuth] Welcome discount sent to ${email}: ${discount.couponCode}`);
    } catch (err: any) {
      console.error(`[GoogleOAuth] Welcome discount error for ${email}:`, err.message);
      // Don't throw - registration should succeed even if discount email fails
    }
  }
}

export const googleOAuthService = new GoogleOAuthService();
