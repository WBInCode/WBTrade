import { Router, Request, Response } from 'express';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.use(authGuard, adminOnly);

// ────────────────────────────────────────────────────────
// GET /api/admin/omnibus — Przegląd cen Omnibus
// ────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const sort = (req.query.sort as string) || 'recent';

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const where: any = {
      priceHistory: { some: { changedAt: { gte: thirtyDaysAgo } } },
    };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const orderBy: any =
      sort === 'name' ? { name: 'asc' } :
      sort === 'price-asc' ? { price: 'asc' } :
      sort === 'price-desc' ? { price: 'desc' } :
      { updatedAt: 'desc' };

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          compareAtPrice: true,
          lowestPrice30Days: true,
          status: true,
          images: { take: 1, select: { url: true } },
          priceHistory: {
            where: { changedAt: { gte: thirtyDaysAgo } },
            orderBy: { changedAt: 'desc' },
            take: 10,
            select: {
              id: true,
              oldPrice: true,
              newPrice: true,
              changedAt: true,
              source: true,
              reason: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const mapped = products.map((p) => ({
      ...p,
      lowestPrice30d: p.lowestPrice30Days,
      isActive: p.status === 'ACTIVE',
    }));

    res.json({
      products: mapped,
      pagination: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) },
    });
  } catch (error) {
    console.error('Error fetching omnibus data:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania danych Omnibus' });
  }
});

// ────────────────────────────────────────────────────────
// GET /api/admin/omnibus/top-products — Top produkty
// ────────────────────────────────────────────────────────
router.get('/top-products', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '30d';
    const limitNum = parseInt(req.query.limit as string) || 10;

    const since = new Date();
    if (period === '7d') since.setDate(since.getDate() - 7);
    else if (period === '90d') since.setDate(since.getDate() - 90);
    else since.setDate(since.getDate() - 30);

    // Top selling — group by variantId
    const topSellingVariants = await prisma.orderItem.groupBy({
      by: ['variantId'],
      _sum: { quantity: true, total: true },
      _count: true,
      where: {
        order: {
          createdAt: { gte: since },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limitNum,
    });

    const variantIds = topSellingVariants.map((s) => s.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            lowestPrice30Days: true,
            images: { take: 1, select: { url: true } },
          },
        },
      },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const topSelling = topSellingVariants.map((s) => {
      const variant = variantMap.get(s.variantId);
      const product = variant?.product;
      return {
        productId: product?.id || s.variantId,
        name: product ? `${product.name}` : 'Nieznany',
        price: product?.price,
        lowestPrice30d: product?.lowestPrice30Days,
        imageUrl: product?.images[0]?.url || null,
        soldQuantity: s._sum?.quantity || 0,
        totalRevenue: s._sum?.total || 0,
        orderCount: s._count,
      };
    });

    // Top rated
    const topRated = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        reviews: { some: {} },
      },
      select: {
        id: true,
        name: true,
        price: true,
        average_rating: true,
        images: { take: 1, select: { url: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { average_rating: 'desc' },
      take: limitNum,
    });

    const topRatedMapped = topRated.map((p) => ({
      ...p,
      averageRating: p.average_rating,
    }));

    // Top searched — use server-side analytics (tracks ALL searches, not just authenticated)
    const { getTopSearches } = require('../services/search-analytics.service');
    const topSearched = getTopSearches(limitNum, since);

    res.json({
      topSelling,
      topRated: topRatedMapped,
      topSearched,
    });
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania top produktów' });
  }
});

// GET /api/admin/omnibus/stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalProducts, productsWithHistory, priceChanges30d, productsOnSale] =
      await Promise.all([
        prisma.product.count({ where: { status: 'ACTIVE' } }),
        prisma.product.count({
          where: {
            status: 'ACTIVE',
            priceHistory: { some: { changedAt: { gte: thirtyDaysAgo } } },
          },
        }),
        prisma.priceHistory.count({ where: { changedAt: { gte: thirtyDaysAgo } } }),
        prisma.product.count({
          where: {
            status: 'ACTIVE',
            compareAtPrice: { not: null },
          },
        }),
      ]);

    res.json({ totalProducts, productsWithHistory, priceChanges30d, productsOnSale });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Błąd' });
  }
});

export default router;
