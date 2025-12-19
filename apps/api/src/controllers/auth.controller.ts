import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../lib/validation';

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ 
        message: 'Validation error', 
        errors: validation.error.flatten().fieldErrors 
      });
      return;
    }

    const result = await authService.register(validation.data);

    res.status(201).json({
      message: 'Registration successful',
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({ message: error.message });
        return;
      }
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ 
        message: 'Validation error', 
        errors: validation.error.flatten().fieldErrors 
      });
      return;
    }

    const result = await authService.login(validation.data);

    res.status(200).json({
      message: 'Login successful',
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid email or password')) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }
      if (error.message.includes('deactivated')) {
        res.status(403).json({ message: error.message });
        return;
      }
    }
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token is required' });
      return;
    }

    const tokens = await authService.refreshToken(refreshToken);

    res.status(200).json({
      message: 'Token refreshed successfully',
      tokens,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        res.status(401).json({ message: 'Refresh token expired', code: 'TOKEN_EXPIRED' });
        return;
      }
      if (error.message.includes('revoked') || error.message.includes('Invalid')) {
        res.status(401).json({ message: 'Invalid refresh token' });
        return;
      }
    }
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
}

/**
 * Logout user
 * POST /api/auth/logout
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.split(' ')[1];
    const { refreshToken } = req.body;

    if (accessToken) {
      await authService.logout(accessToken, refreshToken);
    }

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
}

/**
 * Get current user profile
 * GET /api/auth/me
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
}

/**
 * Forgot password - request reset
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ 
        message: 'Validation error', 
        errors: validation.error.flatten().fieldErrors 
      });
      return;
    }

    const result = await authService.forgotPassword(validation.data.email);

    // In production, don't return the token - send it via email
    res.status(200).json({ 
      message: 'If this email exists, a reset link will be sent',
      // Remove in production - only for development/testing:
      ...(process.env.NODE_ENV === 'development' && { 
        resetToken: result.resetToken,
        expiresAt: result.expiresAt 
      }),
    });
  } catch (error) {
    // Don't reveal if email exists
    res.status(200).json({ message: 'If this email exists, a reset link will be sent' });
  }
}

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ 
        message: 'Validation error', 
        errors: validation.error.flatten().fieldErrors 
      });
      return;
    }

    await authService.resetPassword(validation.data.token, validation.data.password);

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        res.status(400).json({ message: 'Reset token has expired' });
        return;
      }
      if (error.message.includes('Invalid')) {
        res.status(400).json({ message: 'Invalid reset token' });
        return;
      }
    }
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Password reset failed' });
  }
}

/**
 * Change password (authenticated)
 * POST /api/auth/change-password
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const validation = changePasswordSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ 
        message: 'Validation error', 
        errors: validation.error.flatten().fieldErrors 
      });
      return;
    }

    await authService.changePassword(
      req.user.userId,
      validation.data.currentPassword,
      validation.data.newPassword
    );

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('incorrect')) {
        res.status(400).json({ message: 'Current password is incorrect' });
        return;
      }
    }
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Password change failed' });
  }
}

/**
 * Update user profile
 * PATCH /api/auth/profile
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const validation = updateProfileSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ 
        message: 'Validation error', 
        errors: validation.error.flatten().fieldErrors 
      });
      return;
    }

    const user = await authService.updateProfile(req.user.userId, validation.data);

    res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Profile update failed' });
  }
}
