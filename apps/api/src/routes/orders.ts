import { Router } from 'express';
import { createOrder, getOrder, updateOrder, deleteOrder, getAllOrders, getUserOrders, refundOrder, restoreOrder } from '../controllers/orders.controller';
import { authGuard } from '../middleware/auth.middleware';

const router = Router();

// Route to get current user's orders (must be before /:id to avoid conflicts)
router.get('/', authGuard, getUserOrders);

// Route to get all orders (admin)
router.get('/admin/all', getAllOrders);

// Route to create a new order
router.post('/', createOrder);

// Route to get an order by ID
router.get('/:id', getOrder);

// Route to update an order by ID
router.put('/:id', updateOrder);

// Route to delete an order by ID
router.delete('/:id', deleteOrder);

// Route to refund an order
router.post('/:id/refund', refundOrder);

// Route to restore a cancelled/refunded order
router.post('/:id/restore', restoreOrder);

export default router;