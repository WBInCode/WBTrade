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
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Route to get all products (with filters & pagination)
router.get('/', getProducts);

// Route to get available filters for products
router.get('/filters', getFilters);

// Route to get a specific product by slug (SEO-friendly)
router.get('/slug/:slug', getProductBySlug);

// Route to get a specific product by ID
router.get('/:id', getProductById);

// Product reviews routes
router.get('/:productId/reviews', reviewsController.getProductReviews);
router.get('/:productId/reviews/stats', reviewsController.getProductReviewStats);
router.get('/:productId/reviews/can-review', optionalAuth, reviewsController.canUserReview);

// Route to create a new product
router.post('/', createProduct);

// Route to update an existing product
router.put('/:id', updateProduct);

// Route to delete a product
router.delete('/:id', deleteProduct);

export default router;