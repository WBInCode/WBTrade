import { Router } from 'express';
import { 
  getProducts, 
  getProductById, 
  getProductBySlug,
  createProduct, 
  updateProduct, 
  deleteProduct,
  getFilters
} from '../controllers/products.controller';
import { reviewsController } from '../controllers/reviews.controller';
import { optionalAuth, authGuard, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// ========================================
// PUBLIC ROUTES - No authentication required
// ========================================

// Route to get all products (with filters & pagination)
router.get('/', getProducts);

// Route to get available filters for products
router.get('/filters', getFilters);

// Route to get a specific product by slug (SEO-friendly)
router.get('/slug/:slug', getProductBySlug);

// Route to get a specific product by ID
router.get('/:id', getProductById);

// Product reviews routes (public read, optional auth for can-review check)
router.get('/:productId/reviews', reviewsController.getProductReviews);
router.get('/:productId/reviews/stats', reviewsController.getProductReviewStats);
router.get('/:productId/reviews/can-review', optionalAuth, reviewsController.canUserReview);

// ========================================
// ADMIN ROUTES - Require admin authentication
// ========================================

// Route to create a new product (admin only)
router.post('/', authGuard, adminOnly, createProduct);

// Route to update an existing product (admin only)
router.put('/:id', authGuard, adminOnly, updateProduct);

// Route to delete a product (admin only)
router.delete('/:id', authGuard, adminOnly, deleteProduct);

export default router;