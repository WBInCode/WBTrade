import { Router } from 'express';
import { secureAuthController } from '../controllers/auth.controller.secure';
import { authGuard } from '../middleware/auth.middleware.secure';
import {
  authRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
} from '../middleware/rate-limit.middleware';
import { googleOAuthService } from '../services/google-oauth.service';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public (rate limited)
 */
router.post(
  '/register',
  registerRateLimiter,
  secureAuthController.register.bind(secureAuthController)
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public (rate limited)
 */
router.post(
  '/login',
  loginRateLimiter,
  secureAuthController.login.bind(secureAuthController)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (rate limited)
 */
router.post(
  '/refresh',
  authRateLimiter,
  secureAuthController.refreshToken.bind(secureAuthController)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout current session
 * @access  Public (invalidates tokens)
 */
router.post(
  '/logout',
  authRateLimiter,
  secureAuthController.logout.bind(secureAuthController)
);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post(
  '/logout-all',
  authGuard,
  secureAuthController.logoutAll.bind(secureAuthController)
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public (rate limited)
 */
router.post(
  '/verify-email',
  authRateLimiter,
  secureAuthController.verifyEmail.bind(secureAuthController)
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public (rate limited)
 */
router.post(
  '/resend-verification',
  passwordResetRateLimiter, // Use same limiter as password reset
  secureAuthController.resendVerification.bind(secureAuthController)
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public (rate limited)
 */
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  secureAuthController.forgotPassword.bind(secureAuthController)
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public (rate limited)
 */
router.post(
  '/reset-password',
  authRateLimiter,
  secureAuthController.resetPassword.bind(secureAuthController)
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
router.post(
  '/change-password',
  authGuard,
  secureAuthController.changePassword.bind(secureAuthController)
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/me',
  authGuard,
  secureAuthController.getProfile.bind(secureAuthController)
);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get active sessions
 * @access  Private
 */
router.get(
  '/sessions',
  authGuard,
  secureAuthController.getSessions.bind(secureAuthController)
);

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Revoke specific session
 * @access  Private
 */
router.delete(
  '/sessions/:sessionId',
  authGuard,
  secureAuthController.revokeSession.bind(secureAuthController)
);

// ============================================
// GOOGLE OAUTH ROUTES
// ============================================

// Helper to get frontend URL (handles comma-separated list)
const getFrontendUrl = (): string => {
  const urls = process.env.FRONTEND_URL || 'http://localhost:3000';
  return urls.split(',')[0].trim();
};

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth flow
 * @access  Public
 */
router.get('/google', (req, res) => {
  try {
    const state = req.query.redirect as string || '/account';
    const authUrl = googleOAuthService.getAuthorizationUrl(state);
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('[GoogleOAuth] Error initiating OAuth:', error);
    res.redirect(`${getFrontendUrl()}/login?error=oauth_error`);
  }
});

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('[GoogleOAuth] OAuth error:', error);
      return res.redirect(`${getFrontendUrl()}/login?error=oauth_denied`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${getFrontendUrl()}/login?error=no_code`);
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await googleOAuthService.authenticateWithGoogle(code, ipAddress, userAgent);

    // Redirect to frontend with tokens in URL params (will be stored by frontend)
    const redirectPath = (state as string) || '/account';
    const frontendUrl = getFrontendUrl();
    
    // Encode tokens for URL
    const params = new URLSearchParams({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn.toString(),
      isNewUser: result.isNewUser.toString(),
    });

    res.redirect(`${frontendUrl}/auth/callback?${params.toString()}&redirect=${encodeURIComponent(redirectPath)}`);
  } catch (error: any) {
    console.error('[GoogleOAuth] Callback error:', error);
    res.redirect(`${getFrontendUrl()}/login?error=oauth_failed`);
  }
});

/**
 * @route   POST /api/auth/google/token
 * @desc    Exchange Google OAuth code for tokens (for mobile/SPA flow)
 * @access  Public
 */
router.post('/google/token', authRateLimiter, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await googleOAuthService.authenticateWithGoogle(code, ipAddress, userAgent);

    res.json({
      success: true,
      user: result.user,
      tokens: result.tokens,
      isNewUser: result.isNewUser,
    });
  } catch (error: any) {
    console.error('[GoogleOAuth] Token exchange error:', error);
    res.status(400).json({ error: error.message || 'OAuth authentication failed' });
  }
});

export default router;
