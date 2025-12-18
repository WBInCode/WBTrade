import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';

const router = Router();

// Get current cart
router.get('/', (req, res) => cartController.getCart(req, res));

// Add item to cart
router.post('/items', (req, res) => cartController.addItem(req, res));

// Update item quantity
router.patch('/items/:itemId', (req, res) => cartController.updateItem(req, res));

// Remove item from cart
router.delete('/items/:itemId', (req, res) => cartController.removeItem(req, res));

// Clear cart
router.delete('/', (req, res) => cartController.clearCart(req, res));

// Apply coupon
router.post('/coupon', (req, res) => cartController.applyCoupon(req, res));

// Remove coupon
router.delete('/coupon', (req, res) => cartController.removeCoupon(req, res));

// Merge carts after login
router.post('/merge', (req, res) => cartController.mergeCarts(req, res));

export default router;
