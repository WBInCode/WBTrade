/**
 * Recommendations Service
 * Provides personalized product recommendations based on user search history,
 * purchase history, and browsing behavior
 */

import { prisma } from '../db';

interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  images: { url: string; alt: string | null }[];
  category: { id: string; name: string } | null;
  score: number;
  reason: 'search' | 'category' | 'popular' | 'similar';
}

export class RecommendationsService {
  /**
   * Record a user's search query for recommendation purposes
   */
  async recordSearch(
    userId: string,
    query: string,
    categoryId?: string | null,
    resultsCount = 0
  ) {
    // Only record non-empty searches
    if (!query.trim()) return;

    await prisma.searchHistory.create({
      data: {
        userId,
        query: query.trim().toLowerCase(),
        categoryId: categoryId || undefined,
        resultsCount,
      },
    });

    // Clean up old search history (keep last 100 searches per user)
    const oldSearches = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 100,
      select: { id: true },
    });

    if (oldSearches.length > 0) {
      await prisma.searchHistory.deleteMany({
        where: {
          id: { in: oldSearches.map((s) => s.id) },
        },
      });
    }
  }

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(userId: string, limit = 8): Promise<RecommendedProduct[]> {
    const recommendations: RecommendedProduct[] = [];
    const addedProductIds = new Set<string>();

    // 1. Get products matching recent search queries
    const recentSearches = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      distinct: ['query'],
    });

    if (recentSearches.length > 0) {
      const searchTerms = recentSearches.map((s) => s.query);
      
      // Find products matching search terms
      const searchProducts = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          OR: searchTerms.flatMap((term) => [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
          ]),
        },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: true,
        },
        take: limit,
      });

      for (const product of searchProducts) {
        if (!addedProductIds.has(product.id)) {
          addedProductIds.add(product.id);
          recommendations.push({
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: Number(product.price),
            compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
            images: product.images.map((img) => ({ url: img.url, alt: img.alt })),
            category: product.category ? { id: product.category.id, name: product.category.name } : null,
            score: 100,
            reason: 'search',
          });
        }
      }
    }

    // 2. Get products from frequently searched categories
    const categorySearches = await prisma.searchHistory.groupBy({
      by: ['categoryId'],
      where: { userId, categoryId: { not: null } },
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: 5,
    });

    if (categorySearches.length > 0 && recommendations.length < limit) {
      const categoryIds = categorySearches
        .filter((c) => c.categoryId !== null)
        .map((c) => c.categoryId as string);

      const categoryProducts = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          categoryId: { in: categoryIds },
          id: { notIn: Array.from(addedProductIds) },
        },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: true,
        },
        take: limit - recommendations.length,
        orderBy: { createdAt: 'desc' },
      });

      for (const product of categoryProducts) {
        if (!addedProductIds.has(product.id)) {
          addedProductIds.add(product.id);
          recommendations.push({
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: Number(product.price),
            compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
            images: product.images.map((img) => ({ url: img.url, alt: img.alt })),
            category: product.category ? { id: product.category.id, name: product.category.name } : null,
            score: 80,
            reason: 'category',
          });
        }
      }
    }

    // 3. Get products similar to user's past orders
    const userOrders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { include: { category: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (userOrders.length > 0 && recommendations.length < limit) {
      const orderedCategoryIds = new Set<string>();
      for (const order of userOrders) {
        for (const item of order.items) {
          if (item.variant?.product?.categoryId) {
            orderedCategoryIds.add(item.variant.product.categoryId);
          }
        }
      }

      if (orderedCategoryIds.size > 0) {
        const similarProducts = await prisma.product.findMany({
          where: {
            status: 'ACTIVE',
            categoryId: { in: Array.from(orderedCategoryIds) },
            id: { notIn: Array.from(addedProductIds) },
          },
          include: {
            images: { orderBy: { order: 'asc' }, take: 1 },
            category: true,
          },
          take: limit - recommendations.length,
          orderBy: { createdAt: 'desc' },
        });

        for (const product of similarProducts) {
          if (!addedProductIds.has(product.id)) {
            addedProductIds.add(product.id);
            recommendations.push({
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: Number(product.price),
              compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
              images: product.images.map((img) => ({ url: img.url, alt: img.alt })),
              category: product.category ? { id: product.category.id, name: product.category.name } : null,
              score: 70,
              reason: 'similar',
            });
          }
        }
      }
    }

    // 4. Fill remaining spots with popular products
    if (recommendations.length < limit) {
      const popularProducts = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          price: { gt: 0 }, // Don't show products with price 0
          id: { notIn: Array.from(addedProductIds) },
        },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: true,
        },
        take: limit - recommendations.length,
        orderBy: { createdAt: 'desc' },
      });

      for (const product of popularProducts) {
        if (!addedProductIds.has(product.id)) {
          addedProductIds.add(product.id);
          recommendations.push({
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: Number(product.price),
            compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
            images: product.images.map((img) => ({ url: img.url, alt: img.alt })),
            category: product.category ? { id: product.category.id, name: product.category.name } : null,
            score: 50,
            reason: 'popular',
          });
        }
      }
    }

    // Sort by score and return
    return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get user's search history
   */
  async getSearchHistory(userId: string, limit = 10) {
    return prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  /**
   * Clear user's search history
   */
  async clearSearchHistory(userId: string) {
    await prisma.searchHistory.deleteMany({
      where: { userId },
    });
  }
}
