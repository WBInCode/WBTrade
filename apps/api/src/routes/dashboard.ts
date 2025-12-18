/**
 * Dashboard Routes
 * API endpoints for user dashboard, recommendations, and payment simulation
 */

import { Router } from 'express';
import {
  getDashboardOverview,
  getRecommendations,
  recordSearch,
  simulatePayment,
  getSearchHistory,
  clearSearchHistory,
} from '../controllers/dashboard.controller';
import { authGuard, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// ============================================
// DASHBOARD ENDPOINTS
// ============================================

/**
 * GET /api/dashboard
 * Get dashboard overview with stats and recent orders
 * Requires authentication
 */
router.get('/', authGuard, getDashboardOverview);

/**
 * GET /api/dashboard/recommendations
 * Get personalized product recommendations
 * Optional authentication - returns popular products for guests
 */
router.get('/recommendations', optionalAuth, getRecommendations);

/**
 * POST /api/dashboard/search
 * Record a search query for recommendation purposes
 * Optional authentication - only records for logged in users
 */
router.post('/search', optionalAuth, recordSearch);

/**
 * GET /api/dashboard/search-history
 * Get user's search history
 * Requires authentication
 */
router.get('/search-history', authGuard, getSearchHistory);

/**
 * DELETE /api/dashboard/search-history
 * Clear user's search history
 * Requires authentication
 */
router.delete('/search-history', authGuard, clearSearchHistory);

// ============================================
// PAYMENT SIMULATION (Development/Testing)
// ============================================

/**
 * POST /api/dashboard/orders/:orderId/simulate-payment
 * Simulate payment completion for an order
 * Body: { action: 'pay' | 'fail' }
 * Requires authentication
 */
router.post('/orders/:orderId/simulate-payment', authGuard, simulatePayment);

export default router;
