import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import DOMPurify from 'isomorphic-dompurify';

const router = Router();

// All admin review routes require auth + admin
router.use(authGuard, adminOnly);

/**
 * Sanitize text — strips all HTML/JS, returns plain text only
 */
function sanitizeText(text: string): string {
  const clean = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  return clean
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * GET /api/admin/reviews
 * List all reviews with filters, pagination, search
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      search,
      rating,
      status,
      hasReply,
      sort = 'newest',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Search by product name, user name, or review content
    if (search) {
      const s = search as string;
      where.OR = [
        { content: { contains: s, mode: 'insensitive' } },
        { title: { contains: s, mode: 'insensitive' } },
        { product: { name: { contains: s, mode: 'insensitive' } } },
        { user: { firstName: { contains: s, mode: 'insensitive' } } },
        { user: { lastName: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Filter by rating
    if (rating) {
      const r = parseInt(rating as string);
      if (r >= 1 && r <= 5) {
        where.rating = r;
      }
    }

    // Filter by approval status
    if (status === 'approved') {
      where.isApproved = true;
    } else if (status === 'rejected') {
      where.isApproved = false;
    }

    // Filter by reply status
    if (hasReply === 'yes') {
      where.adminReply = { not: null };
    } else if (hasReply === 'no') {
      where.adminReply = null;
    }

    // Sort
    let orderBy: any;
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
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                orderBy: { order: 'asc' },
                take: 1,
              },
            },
          },
          images: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.review.count({ where }),
    ]);

    res.json({
      reviews,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Admin: Error fetching reviews:', error);
    res.status(500).json({ message: 'Nie udało się pobrać opinii' });
  }
});

/**
 * GET /api/admin/reviews/stats
 * Dashboard stats for reviews
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      total,
      approved,
      rejected,
      withReply,
      avgRating,
      ratingDist,
      recentCount,
    ] = await Promise.all([
      prisma.review.count(),
      prisma.review.count({ where: { isApproved: true } }),
      prisma.review.count({ where: { isApproved: false } }),
      prisma.review.count({ where: { adminReply: { not: null } } }),
      prisma.review.aggregate({ _avg: { rating: true } }),
      prisma.review.groupBy({
        by: ['rating'],
        _count: { rating: true },
      }),
      prisma.review.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDist.forEach((d) => {
      distribution[d.rating] = d._count.rating;
    });

    res.json({
      total,
      approved,
      rejected,
      withReply,
      withoutReply: total - withReply,
      averageRating: avgRating._avg.rating
        ? Number(avgRating._avg.rating.toFixed(1))
        : 0,
      distribution,
      recentCount,
    });
  } catch (error) {
    console.error('Admin: Error fetching review stats:', error);
    res.status(500).json({ message: 'Nie udało się pobrać statystyk opinii' });
  }
});

/**
 * PATCH /api/admin/reviews/:reviewId/approve
 * Approve or reject a review
 */
router.patch('/:reviewId/approve', async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { isApproved } = req.body;

    if (typeof isApproved !== 'boolean') {
      return res.status(400).json({ message: 'Pole isApproved musi być typu boolean' });
    }

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { isApproved },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        product: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Recalculate product rating after approval change
    const stats = await prisma.review.aggregate({
      where: { productId: review.productId, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id: review.productId },
      data: {
        average_rating: stats._avg.rating ? Number(stats._avg.rating.toFixed(2)) : 0,
        review_count: stats._count.rating,
      },
    });

    res.json({ success: true, review });
  } catch (error) {
    console.error('Admin: Error updating review approval:', error);
    res.status(500).json({ message: 'Nie udało się zaktualizować statusu opinii' });
  }
});

/**
 * POST /api/admin/reviews/:reviewId/reply
 * Add or update admin reply to a review
 */
router.post('/:reviewId/reply', async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { reply } = req.body;

    if (!reply || typeof reply !== 'string' || reply.trim().length < 2) {
      return res.status(400).json({ message: 'Odpowiedź musi mieć co najmniej 2 znaki' });
    }

    if (reply.length > 2000) {
      return res.status(400).json({ message: 'Odpowiedź nie może przekraczać 2000 znaków' });
    }

    const sanitizedReply = sanitizeText(reply);
    const adminName = req.user?.firstName
      ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
      : 'Admin';

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        adminReply: sanitizedReply,
        adminReplyAt: new Date(),
        adminReplyBy: adminName,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        product: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.json({ success: true, review });
  } catch (error) {
    console.error('Admin: Error replying to review:', error);
    res.status(500).json({ message: 'Nie udało się dodać odpowiedzi' });
  }
});

/**
 * DELETE /api/admin/reviews/:reviewId/reply
 * Remove admin reply from a review
 */
router.delete('/:reviewId/reply', async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        adminReply: null,
        adminReplyAt: null,
        adminReplyBy: null,
      },
    });

    res.json({ success: true, review });
  } catch (error) {
    console.error('Admin: Error removing reply:', error);
    res.status(500).json({ message: 'Nie udało się usunąć odpowiedzi' });
  }
});

/**
 * DELETE /api/admin/reviews/:reviewId
 * Delete a review entirely
 */
router.delete('/:reviewId', async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { productId: true },
    });

    if (!review) {
      return res.status(404).json({ message: 'Opinia nie została znaleziona' });
    }

    await prisma.review.delete({ where: { id: reviewId } });

    // Recalculate product rating
    const stats = await prisma.review.aggregate({
      where: { productId: review.productId, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id: review.productId },
      data: {
        average_rating: stats._avg.rating ? Number(stats._avg.rating.toFixed(2)) : 0,
        review_count: stats._count.rating,
      },
    });

    res.json({ success: true, message: 'Opinia została usunięta' });
  } catch (error) {
    console.error('Admin: Error deleting review:', error);
    res.status(500).json({ message: 'Nie udało się usunąć opinii' });
  }
});

export default router;
