import { Request, Response } from 'express';
import { reviewsService } from '../services/reviews.service';

export const reviewsController = {
  /**
   * Create a new review
   * POST /api/reviews
   */
  async createReview(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { productId, rating, title, content } = req.body;

      if (!productId) {
        return res.status(400).json({ message: 'Product ID is required' });
      }

      if (!rating || typeof rating !== 'number') {
        return res.status(400).json({ message: 'Rating is required and must be a number' });
      }

      if (!content || typeof content !== 'string' || content.trim().length < 10) {
        return res.status(400).json({ message: 'Review content must be at least 10 characters' });
      }

      const review = await reviewsService.createReview(userId, {
        productId,
        rating,
        title,
        content: content.trim(),
      });

      res.status(201).json(review);
    } catch (error) {
      console.error('Error creating review:', error);
      const message = error instanceof Error ? error.message : 'Failed to create review';
      res.status(400).json({ message });
    }
  },

  /**
   * Get reviews for a product
   * GET /api/products/:productId/reviews
   */
  async getProductReviews(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const { page, limit, sort } = req.query;

      const result = await reviewsService.getProductReviews(productId, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 10,
        sort: sort as 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful',
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  },

  /**
   * Get review statistics for a product
   * GET /api/products/:productId/reviews/stats
   */
  async getProductReviewStats(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const stats = await reviewsService.getProductReviewStats(productId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching review stats:', error);
      res.status(500).json({ message: 'Failed to fetch review statistics' });
    }
  },

  /**
   * Check if user can review a product
   * GET /api/products/:productId/reviews/can-review
   */
  async canUserReview(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.json({
          canReview: false,
          hasPurchased: false,
          hasReviewed: false,
          isVerifiedPurchase: false,
          reason: 'authentication_required',
        });
      }

      const { productId } = req.params;
      const result = await reviewsService.canUserReviewProduct(userId, productId);
      res.json(result);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      res.status(500).json({ message: 'Failed to check review eligibility' });
    }
  },

  /**
   * Update a review
   * PUT /api/reviews/:reviewId
   */
  async updateReview(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { reviewId } = req.params;
      const { rating, title, content } = req.body;

      const review = await reviewsService.updateReview(reviewId, userId, {
        rating,
        title,
        content,
      });

      res.json(review);
    } catch (error) {
      console.error('Error updating review:', error);
      const message = error instanceof Error ? error.message : 'Failed to update review';
      res.status(400).json({ message });
    }
  },

  /**
   * Delete a review
   * DELETE /api/reviews/:reviewId
   */
  async deleteReview(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { reviewId } = req.params;
      const isAdmin = req.user?.role === 'ADMIN';

      await reviewsService.deleteReview(reviewId, userId, isAdmin);
      res.json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
      console.error('Error deleting review:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete review';
      res.status(400).json({ message });
    }
  },

  /**
   * Mark a review as helpful/not helpful
   * POST /api/reviews/:reviewId/helpful
   */
  async markHelpful(req: Request, res: Response) {
    try {
      const { reviewId } = req.params;
      const { helpful } = req.body;

      if (typeof helpful !== 'boolean') {
        return res.status(400).json({ message: 'helpful must be a boolean' });
      }

      const review = await reviewsService.markReviewHelpful(reviewId, helpful);
      res.json(review);
    } catch (error) {
      console.error('Error marking review helpful:', error);
      const message = error instanceof Error ? error.message : 'Failed to mark review';
      res.status(400).json({ message });
    }
  },
};
