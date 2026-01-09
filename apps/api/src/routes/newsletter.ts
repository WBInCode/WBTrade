import { Router } from 'express';
import {
  subscribe,
  verify,
  unsubscribe,
  getStats,
  getSubscribers,
} from '../controllers/newsletter.controller';
import { authGuard, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/subscribe', subscribe);
router.get('/verify/:token', verify);
router.get('/unsubscribe/:token', unsubscribe);

// Admin routes
router.get('/stats', authGuard, adminOnly, getStats);
router.get('/subscribers', authGuard, adminOnly, getSubscribers);

export default router;
