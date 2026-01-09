import { prisma } from '../db';
import { Prisma } from '@prisma/client';

export interface CreateReviewInput {
  productId: string;
  rating: number;
  title?: string;
  content: string;
}

export interface ReviewsQueryParams {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
}

export const reviewsService = {
  /**
   * Update product rating statistics (averageRating and reviewCount)
   */
  async updateProductRatingStats(productId: string) {
    const stats = await prisma.review.aggregate({
      where: {
        productId,
        isApproved: true,
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    const averageRating = stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : null;
    const reviewCount = stats._count.rating;

    await prisma.product.update({
      where: { id: productId },
      data: {
        averageRating,
        reviewCount,
      },
    });

    return { averageRating, reviewCount };
  },

  /**
   * Check if user has purchased the product
   */
  async hasUserPurchasedProduct(userId: string, productId: string): Promise<boolean> {
    const order = await prisma.order.findFirst({
      where: {
        userId,
        status: {
          in: ['DELIVERED', 'SHIPPED', 'PROCESSING', 'CONFIRMED'],
        },
        items: {
          some: {
            variant: {
              productId,
            },
          },
        },
      },
    });
    return !!order;
  },

  /**
   * Get the order where product was purchased
   */
  async getOrderForProduct(userId: string, productId: string): Promise<string | null> {
    const order = await prisma.order.findFirst({
      where: {
        userId,
        status: {
          in: ['DELIVERED', 'SHIPPED', 'PROCESSING', 'CONFIRMED'],
        },
        items: {
          some: {
            variant: {
              productId,
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
      },
    });
    return order?.id || null;
  },

  /**
   * Check if user has already reviewed the product
   */
  async hasUserReviewedProduct(userId: string, productId: string): Promise<boolean> {
    const review = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
    return !!review;
  },

  /**
   * Create a new review
   */
  async createReview(userId: string, input: CreateReviewInput) {
    const { productId, rating, title, content } = input;

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new Error('Product not found');
    }

    // Check if user already reviewed this product
    const existingReview = await this.hasUserReviewedProduct(userId, productId);
    if (existingReview) {
      throw new Error('You have already reviewed this product');
    }

    // Check if user purchased the product
    const hasPurchased = await this.hasUserPurchasedProduct(userId, productId);
    const orderId = hasPurchased ? await this.getOrderForProduct(userId, productId) : null;

    // Create review
    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        orderId,
        rating,
        title,
        content,
        isVerifiedPurchase: hasPurchased,
        isApproved: true, // Auto-approve for now
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        images: true,
      },
    });

    // Update product rating statistics
    await this.updateProductRatingStats(productId);

    return review;
  },

  /**
   * Get reviews for a product
   */
  async getProductReviews(productId: string, params: ReviewsQueryParams = {}) {
    const { page = 1, limit = 10, sort = 'newest' } = params;
    const skip = (page - 1) * limit;

    // Build sort order
    let orderBy: Prisma.ReviewOrderByWithRelationInput;
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'highest':
        orderBy = { rating: 'desc' };
        break;
      case 'lowest':
        orderBy = { rating: 'asc' };
        break;
      case 'helpful':
        orderBy = { helpfulCount: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          productId,
          isApproved: true,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          images: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.review.count({
        where: {
          productId,
          isApproved: true,
        },
      }),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Get review statistics for a product
   */
  async getProductReviewStats(productId: string) {
    const stats = await prisma.review.aggregate({
      where: {
        productId,
        isApproved: true,
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    // Get distribution of ratings
    const distribution = await prisma.review.groupBy({
      by: ['rating'],
      where: {
        productId,
        isApproved: true,
      },
      _count: {
        rating: true,
      },
    });

    // Format distribution
    const ratingDistribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    distribution.forEach((d) => {
      ratingDistribution[d.rating] = d._count.rating;
    });

    const total = stats._count.rating;
    const ratingPercentages = {
      1: total > 0 ? Math.round((ratingDistribution[1] / total) * 100) : 0,
      2: total > 0 ? Math.round((ratingDistribution[2] / total) * 100) : 0,
      3: total > 0 ? Math.round((ratingDistribution[3] / total) * 100) : 0,
      4: total > 0 ? Math.round((ratingDistribution[4] / total) * 100) : 0,
      5: total > 0 ? Math.round((ratingDistribution[5] / total) * 100) : 0,
    };

    return {
      averageRating: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : 0,
      totalReviews: total,
      ratingDistribution,
      ratingPercentages,
    };
  },

  /**
   * Get a single review by ID
   */
  async getReviewById(reviewId: string) {
    return prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });
  },

  /**
   * Update a review (only by owner)
   */
  async updateReview(
    reviewId: string,
    userId: string,
    data: { rating?: number; title?: string; content?: string }
  ) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.userId !== userId) {
      throw new Error('You can only edit your own reviews');
    }

    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new Error('Rating must be between 1 and 5');
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: data.rating,
        title: data.title,
        content: data.content,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        images: true,
      },
    });

    // Update product rating statistics if rating changed
    if (data.rating !== undefined) {
      await this.updateProductRatingStats(review.productId);
    }

    return updatedReview;
  },

  /**
   * Delete a review (only by owner or admin)
   */
  async deleteReview(reviewId: string, userId: string, isAdmin = false) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    if (!isAdmin && review.userId !== userId) {
      throw new Error('You can only delete your own reviews');
    }

    const productId = review.productId;

    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Update product rating statistics after deletion
    await this.updateProductRatingStats(productId);

    return { success: true };
  },

  /**
   * Mark a review as helpful
   */
  async markReviewHelpful(reviewId: string, helpful: boolean) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    if (helpful) {
      return prisma.review.update({
        where: { id: reviewId },
        data: {
          helpfulCount: { increment: 1 },
        },
      });
    } else {
      return prisma.review.update({
        where: { id: reviewId },
        data: {
          notHelpfulCount: { increment: 1 },
        },
      });
    }
  },

  /**
   * Check if user can review a product
   */
  async canUserReviewProduct(userId: string, productId: string) {
    const [hasPurchased, hasReviewed] = await Promise.all([
      this.hasUserPurchasedProduct(userId, productId),
      this.hasUserReviewedProduct(userId, productId),
    ]);

    return {
      canReview: !hasReviewed, // Can review even if not purchased, but won't be verified
      hasPurchased,
      hasReviewed,
      isVerifiedPurchase: hasPurchased && !hasReviewed,
    };
  },
};
