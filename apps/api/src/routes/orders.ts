import { Router } from 'express';
import { createOrder, getOrder, updateOrder, deleteOrder, getAllOrders, getUserOrders, refundOrder, restoreOrder, simulatePayment, checkRefundEligibility, requestRefund } from '../controllers/orders.controller';
import { authGuard } from '../middleware/auth.middleware';

const router = Router();

// Route to get current user's orders (must be before /:id to avoid conflicts)
router.get('/', authGuard, getUserOrders);

// Route to get all orders (admin)
router.get('/admin/all', getAllOrders);

// Route to create a new order (requires authentication)
router.post('/', authGuard, createOrder);

// Route to get an order by ID
router.get('/:id', getOrder);

// Route to update an order by ID
router.put('/:id', updateOrder);

// Route to delete an order by ID
router.delete('/:id', deleteOrder);

// Route to check refund eligibility (customer - no auth required, works with order ID/number)
router.get('/:id/refund-eligibility', checkRefundEligibility);

// Route to request refund (customer - no auth required, validates 14-day period)
router.post('/:id/request-refund', requestRefund);

// Route to refund an order (admin)
router.post('/:id/refund', refundOrder);

// Route to restore a cancelled/refunded order
router.post('/:id/restore', restoreOrder);

// Route to simulate payment (development only)
router.post('/:id/simulate-payment', simulatePayment);

export default router;