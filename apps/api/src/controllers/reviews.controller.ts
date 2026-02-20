import { Request, Response } from 'express';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { reviewsService } from '../services/reviews.service';

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Sanitize text using DOMPurify - strips ALL HTML/JS, returning plain text only.
 * Protects against XSS, HTML injection, entity encoding tricks, data URIs,
 * unicode bypasses, CSS expressions, SVG/MathML vectors, etc.
 */
const sanitizeText = (text: string): string => {
  // DOMPurify with ALLOWED_TAGS=[] strips all HTML, returning only text content
  const clean = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],      // No HTML tags allowed
    ALLOWED_ATTR: [],      // No attributes allowed
    KEEP_CONTENT: true,    // Keep text content of stripped tags
  });
  // Additional protection: strip any remaining control characters and normalize whitespace
  return clean
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
};

/**
 * CUID validation helper (Prisma uses CUID by default)
 */
const isValidCUID = (id: string): boolean => {
  // CUID format: starts with 'c', followed by lowercase alphanumeric characters
  const cuidRegex = /^c[a-z0-9]{20,}$/i;
  return cuidRegex.test(id);
};

/**
 * Create review validation schema
 */
const createReviewSchema = z.object({
  productId: z.string().regex(/^c[a-z0-9]{20,}$/i, 'Nieprawidlowy ID produktu'),
  rating: z.number().int().min(1, 'Ocena musi wynosic co najmniej 1').max(5, 'Ocena nie moze przekraczac 5'),
  title: z
    .string()
    .max(200, 'Tytul jest za dlugi')
    .optional()
    .transform((val) => (val ? sanitizeText(val) : undefined)),
  content: z
    .string()
    .min(10, 'Tresc opinii musi miec co najmniej 10 znak�w')
    .max(5000, 'Tresc opinii jest za dluga')
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
        return res.status(401).json({ message: 'Wymagane uwierzytelnienie' });
      }

      const validation = createReviewSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          message: 'Blad walidacji',
          errors: validation.error.flatten().fieldErrors,
        });
      }

      const review = await reviewsService.createReview(userId, validation.data);

      res.status(201).json(review);
    } catch (error) {
      console.error('Error creating review:', error);
      const message = error instanceof Error ? error.message : 'Nie udalo sie dodac opinii';
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
      
      if (!isValidCUID(productId)) {
        return res.status(400).json({ message: 'Nieprawidlowy format ID produktu' });
      }

      const validation = reviewsQuerySchema.safeParse(req.query);
      
      if (!validation.success) {
        return res.status(400).json({
          message: 'Nieprawidlowe parametry zapytania',
          errors: validation.error.flatten().fieldErrors,
        });
      }

      const result = await reviewsService.getProductReviews(productId, validation.data);

      res.json(result);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ message: 'Nie udalo sie pobrac opinii' });
    }
  },

  /**
   * Get review statistics for a product
   * GET /api/products/:productId/reviews/stats
   */
  async getProductReviewStats(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      
      if (!isValidCUID(productId)) {
        return res.status(400).json({ message: 'Nieprawidlowy format ID produktu' });
      }
      
      const stats = await reviewsService.getProductReviewStats(productId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching review stats:', error);
      res.status(500).json({ message: 'Nie udalo sie pobrac statystyk opinii' });
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
      
      if (!isValidCUID(productId)) {
        return res.status(400).json({ message: 'Nieprawidlowy format ID produktu' });
      }
      
      const result = await reviewsService.canUserReviewProduct(userId, productId);
      res.json(result);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      res.status(500).json({ message: 'Nie udalo sie sprawdzic uprawnienia do opinii' });
    }
  },

  /**
   * Get current user's reviews
   * GET /api/reviews/mine
   */
  async getUserReviews(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Wymagane uwierzytelnienie' });
      }

      const validation = reviewsQuerySchema.safeParse(req.query);

      if (!validation.success) {
        return res.status(400).json({
          message: 'Nieprawidlowe parametry zapytania',
          errors: validation.error.flatten().fieldErrors,
        });
      }

      const result = await reviewsService.getUserReviews(userId, validation.data);
      res.json(result);
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      res.status(500).json({ message: 'Nie udalo sie pobrac opinii' });
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
        return res.status(401).json({ message: 'Wymagane uwierzytelnienie' });
      }

      const { reviewId } = req.params;
      
      if (!isValidCUID(reviewId)) {
        return res.status(400).json({ message: 'Nieprawidlowy format ID opinii' });
      }

      const validation = updateReviewSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          message: 'Blad walidacji',
          errors: validation.error.flatten().fieldErrors,
        });
      }

      const review = await reviewsService.updateReview(reviewId, userId, validation.data);

      res.json(review);
    } catch (error) {
      console.error('Error updating review:', error);
      const message = error instanceof Error ? error.message : 'Nie udalo sie zaktualizowac opinii';
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
        return res.status(401).json({ message: 'Wymagane uwierzytelnienie' });
      }

      const { reviewId } = req.params;
      
      if (!isValidCUID(reviewId)) {
        return res.status(400).json({ message: 'Nieprawidlowy format ID opinii' });
      }
      
      const isAdmin = req.user?.role === 'ADMIN';

      await reviewsService.deleteReview(reviewId, userId, isAdmin);
      res.json({ success: true, message: 'Opinia zostala usunieta' });
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
      
      if (!isValidCUID(reviewId)) {
        return res.status(400).json({ message: 'Nieprawidlowy format ID opinii' });
      }
      
      const { helpful } = req.body;

      if (typeof helpful !== 'boolean') {
        return res.status(400).json({ message: 'Pole helpful musi byc typu boolean' });
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
