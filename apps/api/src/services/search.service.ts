import { prisma } from '../db';

export class SearchService {
  /**
   * Search products by query
   */
  async search(query: string, minPrice?: number, maxPrice?: number) {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { sku: { contains: query, mode: 'insensitive' } },
            ],
          },
          minPrice !== undefined ? { price: { gte: minPrice } } : {},
          maxPrice !== undefined ? { price: { lte: maxPrice } } : {},
        ],
      },
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        category: true,
      },
      take: 50,
    });

    return {
      products,
      total: products.length,
    };
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async suggest(query: string) {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        name: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        images: { orderBy: { order: 'asc' }, take: 1 },
      },
      take: 5,
    });

    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        name: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      take: 3,
    });

    return [
      ...products.map((p) => ({ type: 'product' as const, ...p })),
      ...categories.map((c) => ({ type: 'category' as const, ...c })),
    ];
  }
}