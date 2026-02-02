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
        message: 'Błąd walidacji', 
        errors: validation.error.flatten().fieldErrors 
      });
      return;
    }

    const result = await authService.register(validation.data);

    res.status(201).json({
      message: 'Rejestracja zakończona pomyślnie',
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({ message: 'Użytkownik z tym adresem email już istnieje' });
        return;
      }
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Rejestracja nie powiodła się' });
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
        message: 'Błąd walidacji', 
        errors: validation.error.flatten().fieldErrors 
      });
      return;
    }

    const result = await authService.login(validation.data);

    res.status(200).json({
      message: 'Zalogowano pomyślnie',
      user: result.user,
      tokens: result.tokens,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid email or password')) {
        res.status(401).json({ message: 'Nieprawidłowy email lub hasło' });
        return;
      }
      if (error.message.includes('deactivated')) {
        res.status(403).json({ message: error.message });
        return;
      }
    }
    console.error('Login error:', error);
    res.status(500).json({ message: 'Logowanie nie powiodło się' });
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
      res.status(400).json({ message: 'Token odświeżania jest wymagany' });
      return;
    }

    const tokens = await authService.refreshToken(refreshToken);

    res.status(200).json({
      message: 'Token odświeżony pomyślnie',
      tokens,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        res.status(401).json({ message: 'Token odświeżania wygasł', code: 'TOKEN_EXPIRED' });
        return;
      }
      if (error.message.includes('revoked') || error.message.includes('Invalid')) {
        res.status(401).json({ message: 'Nieprawidłowy token odświeżania' });
        return;
      }
    }
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Odświeżanie tokena nie powiodło się' });
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

    res.status(200).json({ message: 'Wylogowano pomyślnie' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Wylogowanie nie powiodło się' });
  }
}

/**
 * Get current user profile
 * GET /api/auth/me
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Nie zalogowany' });
      return;
    }

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({ message: 'Nie znaleziono użytkownika' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Nie udało się pobrać danych użytkownika' });
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
        message: 'Błąd walidacji', 
        errors: validation.error.flatten().fieldErrors 
      });
      return;
    }

    const result = await authService.forgotPassword(validation.data.email);

    // In production, don't return the token - send it via email
    res.status(200).json({ 
      message: 'Jeśli ten email istnieje, link do resetowania hasła zostanie wysłany',
      // Remove in production - only for development/testing:
      ...(process.env.NODE_ENV === 'development' && { 
        resetToken: result.resetToken,
        expiresAt: result.expiresAt 
      }),
    });
  } catch (error) {
    // Don't reveal if email exists
    res.status(200).json({ message: 'Jeśli ten email istnieje, link do resetowania hasła zostanie wysłany' });
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
        message: 'Błąd walidacji', 
        errors: validation.error.flatten().fieldErrors 
      });
      return;
    }

    await authService.resetPassword(validation.data.token, validation.data.password);

    res.status(200).json({ message: 'Hasło zresetowane pomyślnie' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        res.status(400).json({ message: 'Token resetowania hasła wygasł' });
        return;
      }
      if (error.message.includes('Invalid')) {
        res.status(400).json({ message: 'Nieprawidłowy token resetowania hasła' });
        return;
      }
    }
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Resetowanie hasła nie powiodło się' });
  }
}

/**
 * Change password (authenticated)
 * POST /api/auth/change-password
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Nie zalogowany' });
      return;
    }

    const validation = changePasswordSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ 
        message: 'Błąd walidacji', 
        errors: validation.error.flatten().fieldErrors 
      });
      return;
    }

    await authService.changePassword(
      req.user.userId,
      validation.data.currentPassword,
      validation.data.newPassword
    );

    res.status(200).json({ message: 'Hasło zmienione pomyślnie' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('incorrect')) {
        res.status(400).json({ message: 'Obecne hasło jest nieprawidłowe' });
        return;
      }
    }
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Zmiana hasła nie powiodła się' });
  }
}

/**
 * Update user profile
 * PATCH /api/auth/profile
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Nie zalogowany' });
      return;
    }

    const validation = updateProfileSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ 
        message: 'Błąd walidacji', 
        errors: validation.error.flatten().fieldErrors 
      });
      return;
    }

    const user = await authService.updateProfile(req.user.userId, validation.data);

    res.status(200).json({ message: 'Profil zaktualizowany pomyślnie', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Aktualizacja profilu nie powiodła się' });
  }
}

/**
 * Delete user account permanently
 * DELETE /api/auth/delete-account
 */
export async function deleteAccount(req: Request, res: Response): Promise<void> {
  console.log('[AUTH] Delete account request received');
  console.log('[AUTH] User:', req.user);
  console.log('[AUTH] Body:', req.body);
  
  try {
    if (!req.user) {
      console.log('[AUTH] No user in request');
      res.status(401).json({ message: 'Nie zalogowany' });
      return;
    }

    const { password } = req.body;

    if (!password) {
      res.status(400).json({ message: 'Hasło jest wymagane do usunięcia konta' });
      return;
    }

    await authService.deleteAccount(req.user.userId, password);

    res.status(200).json({ message: 'Konto zostało trwale usunięte' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('incorrect')) {
        res.status(400).json({ message: 'Nieprawidłowe hasło' });
        return;
      }
      if (error.message.includes('not found')) {
        res.status(404).json({ message: 'Użytkownik nie znaleziony' });
        return;
      }
    }
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Usunięcie konta nie powiodło się' });
  }
}
