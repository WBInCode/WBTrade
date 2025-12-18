import { Router } from 'express';
import { wishlistController } from '../controllers/wishlist.controller';
import { authGuard, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Get wishlist (requires auth)
router.get('/', authGuard, (req, res) => wishlistController.getWishlist(req, res));

// Add to wishlist (requires auth)
router.post('/', authGuard, (req, res) => wishlistController.addToWishlist(req, res));

// Remove from wishlist (requires auth)
router.delete('/:productId', authGuard, (req, res) => wishlistController.removeFromWishlist(req, res));

// Check if product is in wishlist (optional auth - returns false if not logged in)
router.get('/check/:productId', optionalAuth, (req, res) => wishlistController.checkWishlist(req, res));

// Clear wishlist (requires auth)
router.delete('/', authGuard, (req, res) => wishlistController.clearWishlist(req, res));

// Merge local wishlist with user's wishlist (requires auth)
router.post('/merge', authGuard, (req, res) => wishlistController.mergeWishlist(req, res));

export default router;
