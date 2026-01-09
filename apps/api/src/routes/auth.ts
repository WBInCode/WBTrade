import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  verifyEmail,
  resendVerification,
} from '../controllers/auth.controller';
import { authGuard } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);

// Protected routes (require authentication)
router.post('/logout', authGuard, logout);
router.get('/me', authGuard, getCurrentUser);
router.post('/change-password', authGuard, changePassword);
router.patch('/profile', authGuard, updateProfile);

export default router;
