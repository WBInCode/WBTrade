import { Router } from 'express';
import { reviewsController } from '../controllers/reviews.controller';
import { authGuard } from '../middleware/auth.middleware';

const router = Router();

// Get current user's reviews (requires authentication)
router.get('/mine', authGuard, reviewsController.getUserReviews);

// Create a new review (requires authentication)
router.post('/', authGuard, reviewsController.createReview);

// Update a review (requires authentication)
router.put('/:reviewId', authGuard, reviewsController.updateReview);

// Delete a review (requires authentication)
router.delete('/:reviewId', authGuard, reviewsController.deleteReview);

// Mark review as helpful (public)
router.post('/:reviewId/helpful', reviewsController.markHelpful);

export default router;
