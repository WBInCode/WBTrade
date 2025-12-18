import { prisma } from '../db';
import { getProductsIndex, PRODUCTS_INDEX, meiliClient } from '../lib/meilisearch';

export interface MeiliProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  categoryId: string;
  categoryName: string;
  image: string | null;
  status: string;
  createdAt: number;
}

export class SearchService {
  /**
   * Search products using Meilisearch
   */
  async search(query: string, minPrice?: number, maxPrice?: number, limit = 50) {
    try {
      const index = getProductsIndex();

      // Build filter array
      const filters: string[] = ['status = "ACTIVE"'];
      if (minPrice !== undefined) {
        filters.push(`price >= ${minPrice}`);
      }
      if (maxPrice !== undefined) {
        filters.push(`price <= ${maxPrice}`);
      }

      const results = await index.search<MeiliProduct>(query, {
        limit,
        filter: filters.join(' AND '),
        attributesToRetrieve: [
          'id',
          'name',
          'slug',
          'description',
          'price',
          'compareAtPrice',
          'categoryName',
          'image',
        ],
      });

      return {
        products: results.hits.map((hit) => ({
          id: hit.id,
          name: hit.name,
          slug: hit.slug,
          description: hit.description,
          price: hit.price,
          compareAtPrice: hit.compareAtPrice,
          category: { name: hit.categoryName },
          images: hit.image ? [{ url: hit.image }] : [],
        })),
        total: results.estimatedTotalHits || results.hits.length,
        processingTimeMs: results.processingTimeMs,
      };
    } catch (error) {
      console.error('Meilisearch search error, falling back to Prisma:', error);
      // Fallback to Prisma search
      return this.searchWithPrisma(query, minPrice, maxPrice);
    }
  }

  /**
   * Fallback search using Prisma (when Meilisearch is unavailable)
   */
  private async searchWithPrisma(query: string, minPrice?: number, maxPrice?: number) {
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
      processingTimeMs: 0,
    };
  }

  /**
   * Get search suggestions (autocomplete) using Meilisearch
   */
  async suggest(query: string) {
    try {
      const index = getProductsIndex();
      
      const results = await index.search<MeiliProduct>(query, {
        limit: 8,
        filter: 'status = "ACTIVE"',
        attributesToRetrieve: ['id', 'name', 'slug', 'image', 'price', 'categoryName'],
      });

      // Also get category suggestions from Prisma
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

      return {
        products: results.hits.map((hit) => ({
          type: 'product' as const,
          id: hit.id,
          name: hit.name,
          slug: hit.slug,
          price: hit.price,
          image: hit.image,
          categoryName: hit.categoryName,
        })),
        categories: categories.map((c) => ({
          type: 'category' as const,
          ...c,
        })),
        processingTimeMs: results.processingTimeMs,
      };
    } catch (error) {
      console.error('Meilisearch suggest error, falling back to Prisma:', error);
      return this.suggestWithPrisma(query);
    }
  }

  /**
   * Fallback suggestions using Prisma
   */
  private async suggestWithPrisma(query: string) {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        name: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        images: { orderBy: { order: 'asc' }, take: 1 },
        category: { select: { name: true } },
      },
      take: 8,
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

    return {
      products: products.map((p) => ({
        type: 'product' as const,
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        image: p.images[0]?.url || null,
        categoryName: p.category?.name || null,
      })),
      categories: categories.map((c) => ({
        type: 'category' as const,
        ...c,
      })),
      processingTimeMs: 0,
    };
  }

  /**
   * Index all products to Meilisearch
   */
  async reindexAllProducts(): Promise<{ indexed: number; taskUid: number }> {
    const products = await prisma.product.findMany({
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        category: true,
      },
    });

    const documents: MeiliProduct[] = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      sku: product.sku,
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      categoryId: product.categoryId || '',
      categoryName: product.category?.name || '',
      image: product.images[0]?.url || null,
      status: product.status,
      createdAt: product.createdAt.getTime(),
    }));

    const index = getProductsIndex();
    const task = await index.addDocuments(documents);

    return {
      indexed: documents.length,
      taskUid: task.taskUid,
    };
  }

  /**
   * Index a single product (for use after product creation/update)
   */
  async indexProduct(productId: string): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        category: true,
      },
    });

    if (!product) return;

    const document: MeiliProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      sku: product.sku,
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      categoryId: product.categoryId || '',
      categoryName: product.category?.name || '',
      image: product.images[0]?.url || null,
      status: product.status,
      createdAt: product.createdAt.getTime(),
    };

    const index = getProductsIndex();
    await index.addDocuments([document]);
  }

  /**
   * Remove a product from Meilisearch index
   */
  async removeProductFromIndex(productId: string): Promise<void> {
    const index = getProductsIndex();
    await index.deleteDocument(productId);
  }

  /**
   * Alias for removeProductFromIndex (used by queue worker)
   */
  async deleteProduct(productId: string): Promise<void> {
    return this.removeProductFromIndex(productId);
  }

  /**
   * Alias for reindexAllProducts (used by queue worker)
   */
  async indexAllProducts(): Promise<{ indexed: number; taskUid: number }> {
    return this.reindexAllProducts();
  }

  /**
   * Get Meilisearch index stats
   */
  async getIndexStats() {
    try {
      const index = getProductsIndex();
      const stats = await index.getStats();
      const health = await meiliClient.health();
      
      return {
        healthy: health.status === 'available',
        numberOfDocuments: stats.numberOfDocuments,
        isIndexing: stats.isIndexing,
      };
    } catch (error) {
      return {
        healthy: false,
        numberOfDocuments: 0,
        isIndexing: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}