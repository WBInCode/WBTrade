import { Router } from 'express';
import { createOrder, getOrder, updateOrder, deleteOrder, getAllOrders, refundOrder, restoreOrder } from '../controllers/orders.controller';

const router = Router();

// Route to get all orders (admin)
router.get('/', getAllOrders);

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