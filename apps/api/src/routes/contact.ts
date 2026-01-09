/**
 * Contact Routes
 * Endpoints for contact forms and support requests
 */

import { Router } from 'express';
import {
  sendGeneralContact,
  sendProductInquiry,
  sendOrderHelp,
  sendSupportRequest,
  getUserTickets,
  getTicketStatus,
} from '../controllers/contact.controller';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for contact endpoints (5 requests per 15 minutes)
const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    message: 'Zbyt wiele próśb kontaktu. Spróbuj ponownie za 15 minut.',
    code: 'CONTACT_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/contact/general
 * @desc    Send general contact message
 * @access  Public
 */
router.post('/general', contactRateLimit, sendGeneralContact);

/**
 * @route   POST /api/contact/product
 * @desc    Send product inquiry
 * @access  Public
 */
router.post('/product', contactRateLimit, sendProductInquiry);

/**
 * @route   POST /api/contact/order
 * @desc    Send order help request
 * @access  Public
 */
router.post('/order', contactRateLimit, sendOrderHelp);

/**
 * @route   POST /api/contact/support
 * @desc    Send technical support request
 * @access  Public
 */
router.post('/support', contactRateLimit, sendSupportRequest);

/**
 * @route   GET /api/contact/tickets
 * @desc    Get user's tickets by email
 * @access  Public
 */
router.get('/tickets', getUserTickets);

/**
 * @route   GET /api/contact/tickets/:ticketId
 * @desc    Get specific ticket status
 * @access  Public
 */
router.get('/tickets/:ticketId', getTicketStatus);

export default router;
