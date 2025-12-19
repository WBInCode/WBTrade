/**
 * Checkout Routes
 * API endpoints for checkout, shipping, and payment operations
 */

import { Router } from 'express';
import {
  getShippingMethods,
  getPickupPoints,
  getPaymentMethods,
  createCheckout,
  verifyPayment,
  paymentWebhook,
  payuWebhook,
  shippingWebhook,
  getOrderTracking,
} from '../controllers/checkout.controller';
import { authGuard, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// ============================================
// SHIPPING ENDPOINTS
// ============================================

/**
 * GET /api/checkout/shipping/methods
 * Get available shipping methods with rates
 * Query params: postalCode (required), city (optional), country (optional)
 */
router.get('/shipping/methods', optionalAuth, getShippingMethods);

/**
 * GET /api/checkout/shipping/pickup-points
 * Get pickup points (Paczkomaty) near a location
 * Query params: postalCode (required), city (optional), provider (optional), limit (optional)
 */
router.get('/shipping/pickup-points', optionalAuth, getPickupPoints);

// ============================================
// PAYMENT ENDPOINTS
// ============================================

/**
 * GET /api/checkout/payment/methods
 * Get available payment methods
 */
router.get('/payment/methods', optionalAuth, getPaymentMethods);

/**
 * GET /api/checkout/payment/verify/:sessionId
 * Verify payment status after redirect from payment gateway
 */
router.get('/payment/verify/:sessionId', optionalAuth, verifyPayment);

// ============================================
// CHECKOUT ENDPOINTS
// ============================================

/**
 * POST /api/checkout
 * Create order and initiate payment
 * Body: {
 *   shippingAddressId: string,
 *   billingAddressId?: string,
 *   shippingMethod: string,
 *   pickupPointCode?: string,
 *   paymentMethod: string,
 *   customerNotes?: string,
 *   acceptTerms: boolean
 * }
 */
router.post('/', authGuard, createCheckout);

/**
 * GET /api/checkout/tracking/:orderId
 * Get shipment tracking info for an order
 */
router.get('/tracking/:orderId', authGuard, getOrderTracking);

// ============================================
// WEBHOOK ENDPOINTS
// ============================================

/**
 * POST /api/webhooks/payu
 * Handle PayU payment webhooks
 * PayU sends signature in OpenPayU-Signature header
 */
router.post('/webhooks/payu', payuWebhook);

/**
 * POST /api/webhooks/payment/:provider?
 * Handle payment provider webhooks
 */
router.post('/webhooks/payment/:provider?', paymentWebhook);

/**
 * POST /api/webhooks/shipping/:provider
 * Handle shipping provider webhooks
 */
router.post('/webhooks/shipping/:provider', shippingWebhook);

export default router;
