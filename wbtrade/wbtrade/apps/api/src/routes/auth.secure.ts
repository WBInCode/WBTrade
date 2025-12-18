import { Router } from 'express';
import { secureAuthController } from '../controllers/auth.controller.secure';
import { authGuard } from '../middleware/auth.middleware.secure';
import {
  authRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
} from '../middleware/rate-limit.middleware';

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

export default router;
