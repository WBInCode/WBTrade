import { prisma } from '../db';
import { getProductsIndex, PRODUCTS_INDEX, meiliClient, isMeilisearchAvailable, markMeilisearchUnavailable, markMeilisearchAvailable } from '../lib/meilisearch';

// Tagi dostawy - produkty MUSZĄ mieć przynajmniej jeden z tych tagów żeby być widoczne
const DELIVERY_TAGS = [
  'Paczkomaty i Kurier',
  'paczkomaty i kurier',
  'Tylko kurier',
  'tylko kurier',
  'do 2 kg',
  'do 5 kg',
  'do 10 kg',
  'do 20 kg',
  'do 31,5 kg',
];

// Tags that require "produkt w paczce" tag to be visible
const PACZKOMAT_TAGS = ['Paczkomaty i Kurier', 'paczkomaty i kurier'];
const PACKAGE_LIMIT_PATTERN = /produkt\s*w\s*paczce|produkty?\s*w\s*paczce/i;
// Tags that hide products completely
const HIDDEN_TAGS = ['błąd zdjęcia', 'błąd zdjęcia '];
// Image domains that block hotlinking - products with these images are hidden
// b2b.leker.pl usunięte - produkty Leker ponownie widoczne, tag "błąd zdjęcia" filtruje wadliwe
const BLOCKED_IMAGE_DOMAINS: string[] = [];

/**
 * Check if product should be visible based on delivery tags, error tags, and image URL
 * Products with "Paczkomaty i Kurier" must also have "produkt w paczce" tag
 * Products with "błąd zdjęcia" are always hidden
 * Products with images from blocked domains are hidden
 */
function shouldProductBeVisible(tags: string[], imageUrl?: string | null): boolean {
  // Hide products with error tags
  const hasHiddenTag = tags.some((tag: string) => 
    HIDDEN_TAGS.some(ht => tag.toLowerCase() === ht.toLowerCase())
  );
  if (hasHiddenTag) return false;
  
  // Hide products with images from blocked domains
  if (imageUrl) {
    const hasBlockedImage = BLOCKED_IMAGE_DOMAINS.some(domain => 
      imageUrl.includes(domain)
    );
    if (hasBlockedImage) return false;
  }

  // Produkty MUSZĄ mieć przynajmniej jeden tag dostawy
  const hasDeliveryTag = tags.some((tag: string) =>
    DELIVERY_TAGS.some(dt => tag.toLowerCase() === dt.toLowerCase())
  );
  if (!hasDeliveryTag) return false;
  
  const hasPaczkomatTag = tags.some((tag: string) => 
    PACZKOMAT_TAGS.some(pt => tag.toLowerCase() === pt.toLowerCase())
  );
  
  if (!hasPaczkomatTag) return true;
  
  const hasPackageLimitTag = tags.some((tag: string) => 
    PACKAGE_LIMIT_PATTERN.test(tag)
  );
  
  return hasPackageLimitTag;
}

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
  hasBaselinkerCategory: boolean; // true if category has baselinkerCategoryId
  tags: string[];
  popularityScore: number;
  inStock: boolean;
}

export class SearchService {
  /**
   * Search products using Meilisearch with Prisma fallback
   */
  async search(query: string, minPrice?: number, maxPrice?: number, limit = 100) {
    // Skip Meilisearch entirely if it's known to be down
    if (!isMeilisearchAvailable()) {
      return this.searchWithPrisma(query, minPrice, maxPrice, limit);
    }

    try {
      const index = getProductsIndex();

      // Build filter array - te same filtry co w products.service.ts
      const filters: string[] = ['status = "ACTIVE"', 'price > 0'];
      
      // Produkty muszą być na stanie
      filters.push('inStock = true');
      
      // Produkty MUSZĄ mieć tag dostawy
      const deliveryTagsFilter = DELIVERY_TAGS.map(tag => `"${tag}"`).join(', ');
      filters.push(`tags IN [${deliveryTagsFilter}]`);
      
      // Produkty MUSZĄ mieć przypisaną kategorię z Baselinker
      filters.push('hasBaselinkerCategory = true');
      
      if (minPrice !== undefined) {
        filters.push(`price >= ${minPrice}`);
      }
      if (maxPrice !== undefined) {
        filters.push(`price <= ${maxPrice}`);
      }

      // Fetch more results to account for post-filtering
      const results = await index.search<MeiliProduct>(query, {
        limit: limit * 2, // Fetch extra to filter out hidden products
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

      // Mark Meilisearch as available on success
      markMeilisearchAvailable();

      // Get product IDs to fetch tags for filtering
      const productIds = results.hits.map(hit => hit.id);
      const productsWithTags = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, tags: true },
      });
      const tagsMap = new Map(productsWithTags.map(p => [p.id, p.tags]));

      // Filter products based on visibility rules (including image URL check)
      const visibleHits = results.hits
        .filter(hit => shouldProductBeVisible(tagsMap.get(hit.id) || [], hit.image))
        .slice(0, limit);

      return {
        products: visibleHits.map((hit) => ({
          id: hit.id,
          name: hit.name,
          slug: hit.slug,
          description: hit.description,
          price: hit.price,
          compareAtPrice: hit.compareAtPrice,
          category: { name: hit.categoryName },
          images: hit.image ? [{ url: hit.image }] : [],
        })),
        total: visibleHits.length,
        processingTimeMs: results.processingTimeMs,
      };
    } catch (error) {
      console.error('Meilisearch search error, falling back to Prisma:', error);
      markMeilisearchUnavailable();
      return this.searchWithPrisma(query, minPrice, maxPrice, limit);
    }
  }

  /**
   * Fallback search using Prisma (when Meilisearch is unavailable)
   */
  private async searchWithPrisma(query: string, minPrice?: number, maxPrice?: number, limit = 100) {
    try {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        price: { gt: 0 },
        // Musi mieć tag dostawy
        tags: { hasSome: DELIVERY_TAGS },
        // Musi mieć kategorię z Baselinker
        category: { baselinkerCategoryId: { not: null } },
        // Musi być na stanie
        variants: { some: { inventory: { some: { quantity: { gt: 0 } } } } },
        // Nie pokazuj produktów z tagami błędów + warunek paczkomatu
        NOT: { tags: { hasSome: HIDDEN_TAGS } },
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
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
      take: Math.min(limit * 2, 200), // Fetch extra to account for filtering
    });

    // Filter products based on visibility rules (including image URL check)
    const visibleProducts = products.filter(p => 
      shouldProductBeVisible(p.tags, p.images[0]?.url)
    );

    // Map to consistent response format (same shape as Meilisearch path)
    const mapped = visibleProducts.slice(0, limit).map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: (p as any).description || '',
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      category: { name: p.category?.name || '' },
      images: p.images?.length ? [{ url: p.images[0].url }] : [],
    }));

    return {
      products: mapped,
      total: mapped.length,
      processingTimeMs: 0,
    };
    } catch (error) {
      console.error('Prisma search fallback error:', error);
      // Return empty results instead of throwing
      return { products: [], total: 0, processingTimeMs: 0 };
    }
  }

  /**
   * Get all descendant category IDs for a given slug (including the category itself)
   */
  private async getAllCategoryIds(categorySlug: string): Promise<string[]> {
    const category = await prisma.category.findFirst({
      where: { slug: categorySlug, isActive: true },
      select: { id: true },
    });

    if (!category) return [];

    const categoryIds: string[] = [category.id];

    const getDescendants = async (parentIds: string[]): Promise<void> => {
      const children = await prisma.category.findMany({
        where: { parentId: { in: parentIds }, isActive: true },
        select: { id: true },
      });
      if (children.length > 0) {
        const childIds = children.map(c => c.id);
        categoryIds.push(...childIds);
        await getDescendants(childIds);
      }
    };

    await getDescendants(categoryIds);
    return [...new Set(categoryIds)];
  }

  /**
   * Get search suggestions (autocomplete) using Meilisearch
   */
  async suggest(query: string, categorySlug?: string) {
    // Skip Meilisearch if it's known to be down
    if (!isMeilisearchAvailable()) {
      return this.suggestWithPrisma(query, categorySlug);
    }

    try {
      const index = getProductsIndex();

      // Build filter - te same filtry co w products.service.ts
      const filters: string[] = ['status = "ACTIVE"', 'price > 0'];
      
      // Produkty muszą być na stanie
      filters.push('inStock = true');
      
      // Produkty MUSZĄ mieć tag dostawy
      const deliveryTagsFilter = DELIVERY_TAGS.map(tag => `"${tag}"`).join(', ');
      filters.push(`tags IN [${deliveryTagsFilter}]`);
      
      // Produkty MUSZĄ mieć przypisaną kategorię z Baselinker
      filters.push('hasBaselinkerCategory = true');
      
      // If category slug provided, resolve to all descendant categoryIds and filter
      if (categorySlug) {
        const allCategoryIds = await this.getAllCategoryIds(categorySlug);
        if (allCategoryIds.length > 0) {
          const categoryFilter = allCategoryIds.map(id => `categoryId = "${id}"`).join(' OR ');
          filters.push(`(${categoryFilter})`);
        }
      }
      
      const results = await index.search<MeiliProduct>(query, {
        limit: 20, // Fetch more to account for filtering
        filter: filters.join(' AND '),
        attributesToRetrieve: ['id', 'name', 'slug', 'image', 'price', 'categoryName'],
      });

      markMeilisearchAvailable();

      // Get product IDs to fetch tags from database
      const productIds = results.hits.map(hit => hit.id);
      
      // Fetch tags for these products
      const productsWithTags = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, tags: true },
      });
      
      const tagsMap = new Map(productsWithTags.map(p => [p.id, p.tags]));
      
      // Filter products based on delivery tag rules and image URL
      const filteredHits = results.hits.filter(hit => {
        const tags = tagsMap.get(hit.id) || [];
        return shouldProductBeVisible(tags, hit.image);
      }).slice(0, 8); // Limit to 8 after filtering

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
        products: filteredHits.map((hit) => ({
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
      markMeilisearchUnavailable();
      return this.suggestWithPrisma(query, categorySlug);
    }
  }

  /**
   * Fallback suggestions using Prisma
   */
  private async suggestWithPrisma(query: string, categorySlug?: string) {
    try {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        price: { gt: 0 },
        name: { contains: query, mode: 'insensitive' },
        // Musi mieć tag dostawy
        tags: { hasSome: DELIVERY_TAGS },
        // Musi mieć kategorię z Baselinker
        category: { baselinkerCategoryId: { not: null } },
        // Musi być na stanie
        variants: { some: { inventory: { some: { quantity: { gt: 0 } } } } },
        // Nie pokazuj produktów z tagami błędów
        NOT: { tags: { hasSome: HIDDEN_TAGS } },
        ...(categorySlug ? { categoryId: { in: await this.getAllCategoryIds(categorySlug) } } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        tags: true,
        images: { orderBy: { order: 'asc' }, take: 1 },
        category: { select: { name: true } },
      },
      take: 20, // Fetch more to account for filtering
    });

    // Filter products based on delivery tag rules and image URL
    const filteredProducts = products.filter(p => 
      shouldProductBeVisible(p.tags, p.images[0]?.url)
    ).slice(0, 8);

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
      products: filteredProducts.map((p) => ({
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
    } catch (error) {
      console.error('Prisma suggest fallback error:', error);
      return { products: [], categories: [], processingTimeMs: 0 };
    }
  }

  /**
   * Index all products to Meilisearch
   */
  async reindexAllProducts(): Promise<{ indexed: number; taskUid: number }> {
    const products = await prisma.product.findMany({
      where: {
        price: { gt: 0 },
      },
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        category: true,
        variants: { include: { inventory: true } },
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
      hasBaselinkerCategory: !!product.category?.baselinkerCategoryId,
      tags: product.tags || [],
      popularityScore: product.popularityScore || 0,
      inStock: product.variants.some(v => v.inventory.some(i => i.quantity > 0)),
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
        variants: { include: { inventory: true } },
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
      hasBaselinkerCategory: !!product.category?.baselinkerCategoryId,
      tags: product.tags || [],
      popularityScore: product.popularityScore || 0,
      inStock: product.variants.some(v => v.inventory.some(i => i.quantity > 0)),
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