import { Request, Response } from 'express';
import { z } from 'zod';
import { reviewsService } from '../services/reviews.service';

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Helper to sanitize text - removes potential XSS and HTML tags
 */
const sanitizeText = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * UUID validation helper
 */
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Create review validation schema
 */
const createReviewSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z
    .string()
    .max(200, 'Title is too long')
    .optional()
    .transform((val) => (val ? sanitizeText(val) : undefined)),
  content: z
    .string()
    .min(10, 'Review content must be at least 10 characters')
    .max(5000, 'Review content is too long')
    .transform(sanitizeText),
});

/**
 * Update review validation schema
 */
const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z
    .string()
    .max(200)
    .optional()
    .transform((val) => (val ? sanitizeText(val) : undefined)),
  content: z
    .string()
    .min(10)
    .max(5000)
    .optional()
    .transform((val) => (val ? sanitizeText(val) : undefined)),
});

/**
 * Reviews query params schema
 */
const reviewsQuerySchema = z.object({
  page: z.string().optional().transform((val) => {
    const num = parseInt(val || '1', 10);
    return isNaN(num) || num < 1 ? 1 : Math.min(num, 1000);
  }),
  limit: z.string().optional().transform((val) => {
    const num = parseInt(val || '10', 10);
    return isNaN(num) || num < 1 ? 10 : Math.min(num, 50);
  }),
  sort: z.enum(['newest', 'oldest', 'highest', 'lowest', 'helpful']).optional().default('newest'),
});

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

      const validation = createReviewSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          message: 'Validation error',
          errors: validation.error.flatten().fieldErrors,
        });
      }

      const review = await reviewsService.createReview(userId, validation.data);

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
      
      if (!isValidUUID(productId)) {
        return res.status(400).json({ message: 'Invalid product ID format' });
      }

      const validation = reviewsQuerySchema.safeParse(req.query);
      
      if (!validation.success) {
        return res.status(400).json({
          message: 'Invalid query parameters',
          errors: validation.error.flatten().fieldErrors,
        });
      }

      const result = await reviewsService.getProductReviews(productId, validation.data);

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
      
      if (!isValidUUID(productId)) {
        return res.status(400).json({ message: 'Invalid product ID format' });
      }
      
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
      
      if (!isValidUUID(productId)) {
        return res.status(400).json({ message: 'Invalid product ID format' });
      }
      
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
      
      if (!isValidUUID(reviewId)) {
        return res.status(400).json({ message: 'Invalid review ID format' });
      }

      const validation = updateReviewSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          message: 'Validation error',
          errors: validation.error.flatten().fieldErrors,
        });
      }

      const review = await reviewsService.updateReview(reviewId, userId, validation.data);

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
      
      if (!isValidUUID(reviewId)) {
        return res.status(400).json({ message: 'Invalid review ID format' });
      }
      
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
      
      if (!isValidUUID(reviewId)) {
        return res.status(400).json({ message: 'Invalid review ID format' });
      }
      
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
