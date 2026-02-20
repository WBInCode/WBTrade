import { Router } from 'express';
import { reviewsController } from '../controllers/reviews.controller';
import { authGuard } from '../middleware/auth.middleware';
import { reviewRateLimiter, reviewHelpfulRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Create a new review (requires authentication + rate limited)
router.post('/', authGuard, reviewRateLimiter, reviewsController.createReview);
// Get current user's reviews (requires authentication)
router.get('/mine', authGuard, reviewsController.getUserReviews);

// Create a new review (requires authentication)
router.post('/', authGuard, reviewsController.createReview);

// Update a review (requires authentication)
router.put('/:reviewId', authGuard, reviewsController.updateReview);

// Delete a review (requires authentication)
router.delete('/:reviewId', authGuard, reviewsController.deleteReview);

// Mark review as helpful (public, rate limited)
router.post('/:reviewId/helpful', reviewHelpfulRateLimiter, reviewsController.markHelpful);

export default router;
