import { prisma } from '../db';
import { Prisma } from '@prisma/client';
import { getProductsIndex } from '../lib/meilisearch';
import { MeiliProduct } from './search.service';
import { queueProductIndex, queueProductDelete } from '../lib/queue';

interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: string;
  status?: string;
  hideOldZeroStock?: boolean; // Ukryj produkty ze stanem 0 starsze niż 14 dni
}

interface ProductsListResult {
  products: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Safely parse JSON fields that might already be objects or strings
 */
function parseJsonField(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Transform product to ensure JSON fields are properly parsed
 */
function transformProduct(product: any): any {
  if (!product) return product;
  
  // Transform variants with stock calculated from inventory
  const transformedVariants = product.variants?.map((variant: any) => ({
    ...variant,
    attributes: parseJsonField(variant.attributes) || {},
    // Calculate stock from inventory if available
    stock: variant.inventory?.reduce((sum: number, inv: any) => sum + (inv.quantity - inv.reserved), 0) ?? 0,
  }));
  
  // Calculate total stock as sum of all variant stocks
  const totalStock = transformedVariants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) ?? 0;
  
  return {
    ...product,
    specifications: parseJsonField(product.specifications),
    variants: transformedVariants,
    // Add total stock at product level for easy access
    stock: totalStock,
    // Ensure tags are always an array
    tags: product.tags || [],
  };
}

/**
 * Transform an array of products
 */
function transformProducts(products: any[]): any[] {
  return products.map(transformProduct);
}

/**
 * Filter out products with zero stock that haven't been updated in specified days
 * Only hides products that have 0 stock AND haven't had inventory updates recently
 */
function filterOldZeroStockProducts(products: any[], days: number = 14): any[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return products.filter(product => {
    // If product has stock > 0, always keep it
    if (product.stock > 0) return true;
    
    // Product has 0 stock - check if it was recently updated
    // Use updatedAt instead of createdAt to check for recent inventory changes
    const updatedAt = new Date(product.updatedAt);
    if (updatedAt > cutoffDate) return true;
    
    // Also check variants for recent updates (inventory syncs update variants)
    if (product.variants && product.variants.length > 0) {
      const hasRecentVariantUpdate = product.variants.some((variant: any) => {
        const variantUpdated = new Date(variant.updatedAt);
        return variantUpdated > cutoffDate;
      });
      if (hasRecentVariantUpdate) return true;
    }
    
    // Product has 0 stock and hasn't been updated in X days - hide it
    return false;
  });
}

export class ProductsService {
  /**
   * Check if a category exists by ID
   */
  async categoryExists(categoryId: string): Promise<boolean> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    return !!category;
  }

  /**
   * Get all descendant category IDs for a given category slug or ID (including the category itself)
   */
  private async getAllCategoryIds(categorySlugOrId: string): Promise<string[]> {
    // Try to find the category by exact slug first
    let categories = await prisma.category.findMany({
      where: { slug: categorySlugOrId },
      select: { id: true },
    });

    // If not found by exact slug, try with common prefixes from all suppliers
    if (categories.length === 0) {
      const prefixes = ['btp-', 'hp-', 'leker-', 'ikonka-'];
      
      // Find ALL matching categories from all suppliers
      categories = await prisma.category.findMany({
        where: { 
          OR: [
            ...prefixes.map(prefix => ({
              slug: {
                startsWith: `${prefix}${categorySlugOrId}`
              }
            })),
            // Also match if slug contains the search term (removes numeric IDs)
            {
              slug: {
                contains: categorySlugOrId,
                mode: 'insensitive' as const
              }
            }
          ]
        },
        select: { id: true },
      });
    }

    // If not found by slug patterns, try by ID
    if (categories.length === 0) {
      const categoryById = await prisma.category.findUnique({
        where: { id: categorySlugOrId },
        select: { id: true },
      });
      if (categoryById) {
        categories = [categoryById];
      }
    }

    if (categories.length === 0) {
      return [];
    }

    const categoryIds: string[] = categories.map(c => c.id);

    // Recursively get all descendant categories for each found category
    const getDescendants = async (parentIds: string[]): Promise<void> => {
      const children = await prisma.category.findMany({
        where: {
          parentId: { in: parentIds },
          isActive: true,
        },
        select: { id: true },
      });

      if (children.length > 0) {
        const childIds = children.map(c => c.id);
        categoryIds.push(...childIds);
        await getDescendants(childIds);
      }
    };

    await getDescendants(categoryIds);

    return categoryIds;
  }

  /**
   * Get all products with filters and pagination
   */
  async getAll(filters: ProductFilters = {}): Promise<ProductsListResult> {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      search,
      sort = 'newest',
      status,
      hideOldZeroStock = false,
    } = filters;

    // If search is provided, use Meilisearch for better results
    if (search && search.trim()) {
      return this.searchWithMeilisearch(filters);
    }

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ProductWhereInput = {};
    
    // Only filter by status if explicitly provided
    if (status) {
      where.status = status as Prisma.EnumProductStatusFilter;
    }

    // If category is specified, get all subcategory IDs and filter by them
    if (category) {
      const categoryIds = await this.getAllCategoryIds(category);
      if (categoryIds.length > 0) {
        where.categoryId = { in: categoryIds };
      } else {
        // Category not found, return empty results
        return {
          products: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = minPrice;
      if (maxPrice) where.price.lte = maxPrice;
    }

    // Build orderBy clause
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'name_asc':
        orderBy = { name: 'asc' };
        break;
      case 'name_desc':
        orderBy = { name: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Execute queries in parallel
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          category: true,
          variants: {
            include: {
              inventory: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Transform products
    let transformedProducts = transformProducts(products);
    
    // Filter out old zero-stock products if requested
    if (hideOldZeroStock) {
      transformedProducts = filterOldZeroStockProducts(transformedProducts, 14);
    }

    return {
      products: transformedProducts,
      total: hideOldZeroStock ? transformedProducts.length : total,
      page,
      limit,
      totalPages: Math.ceil((hideOldZeroStock ? transformedProducts.length : total) / limit),
    };
  }

  /**
   * Search products using Meilisearch for better full-text search
   */
  private async searchWithMeilisearch(filters: ProductFilters): Promise<ProductsListResult> {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      search,
      sort = 'newest',
      status,
      hideOldZeroStock = false,
    } = filters;

    try {
      const index = getProductsIndex();

      // Build filter array
      const meiliFilters: string[] = [];
      
      // Only filter by status if explicitly provided
      if (status) {
        meiliFilters.push(`status = "${status}"`);
      }
      
      if (category) {
        const categoryIds = await this.getAllCategoryIds(category);
        if (categoryIds.length > 0) {
          meiliFilters.push(`categoryId IN [${categoryIds.map(id => `"${id}"`).join(', ')}]`);
        }
      }
      
      if (minPrice !== undefined) {
        meiliFilters.push(`price >= ${minPrice}`);
      }
      if (maxPrice !== undefined) {
        meiliFilters.push(`price <= ${maxPrice}`);
      }

      // Build sort
      let meiliSort: string[] = [];
      switch (sort) {
        case 'price_asc':
          meiliSort = ['price:asc'];
          break;
        case 'price_desc':
          meiliSort = ['price:desc'];
          break;
        case 'name_asc':
          meiliSort = ['name:asc'];
          break;
        case 'name_desc':
          meiliSort = ['name:desc'];
          break;
        case 'newest':
        default:
          meiliSort = ['createdAt:desc'];
      }

      const results = await index.search<MeiliProduct>(search || '', {
        limit,
        offset: (page - 1) * limit,
        filter: meiliFilters.join(' AND '),
        sort: meiliSort,
      });

      // Get full product data from Prisma for the found IDs
      const productIds = results.hits.map((hit: MeiliProduct) => hit.id);
      
      if (productIds.length === 0) {
        return {
          products: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
        },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          category: true,
          variants: {
            include: {
              inventory: true,
            },
          },
        },
      });

      // Sort products to match Meilisearch order
      const sortedProducts = productIds.map((id: string) => 
        products.find(p => p.id === id)
      ).filter(Boolean);

      const total = results.estimatedTotalHits || results.hits.length;

      // Transform products
      let transformedProducts = transformProducts(sortedProducts as any[]);
      
      // Filter out old zero-stock products if requested
      if (hideOldZeroStock) {
        transformedProducts = filterOldZeroStockProducts(transformedProducts, 14);
      }

      return {
        products: transformedProducts,
        total: hideOldZeroStock ? transformedProducts.length : total,
        page,
        limit,
        totalPages: Math.ceil((hideOldZeroStock ? transformedProducts.length : total) / limit),
      };
    } catch (error) {
      console.error('Meilisearch search error, falling back to Prisma:', error);
      // Fallback to Prisma search
      return this.searchWithPrismaFallback(filters);
    }
  }

  /**
   * Fallback search using Prisma when Meilisearch is unavailable
   */
  private async searchWithPrismaFallback(filters: ProductFilters): Promise<ProductsListResult> {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      search,
      sort = 'newest',
      status,
      hideOldZeroStock = false,
    } = filters;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    
    // Only filter by status if explicitly provided
    if (status) {
      where.status = status as Prisma.EnumProductStatusFilter;
    }

    if (category) {
      const categoryIds = await this.getAllCategoryIds(category);
      if (categoryIds.length > 0) {
        where.categoryId = { in: categoryIds };
      }
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = minPrice;
      if (maxPrice) where.price.lte = maxPrice;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'name_asc':
        orderBy = { name: 'asc' };
        break;
      case 'name_desc':
        orderBy = { name: 'desc' };
        break;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: { orderBy: { order: 'asc' } },
          category: true,
          variants: { include: { inventory: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Transform products
    let transformedProducts = transformProducts(products);
    
    // Filter out old zero-stock products if requested
    if (hideOldZeroStock) {
      transformedProducts = filterOldZeroStockProducts(transformedProducts, 14);
    }

    return {
      products: transformedProducts,
      total: hideOldZeroStock ? transformedProducts.length : total,
      page,
      limit,
      totalPages: Math.ceil((hideOldZeroStock ? transformedProducts.length : total) / limit),
    };
  }

  /**
   * Get a single product by ID
   */
  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        category: true,
        variants: {
          include: {
            inventory: true,
          },
        },
      },
    });
    return transformProduct(product);
  }

  /**
   * Get a single product by slug
   */
  async getBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        category: true,
        variants: {
          include: {
            inventory: true,
          },
        },
      },
    });
    return transformProduct(product);
  }

  /**
   * Create a new product
   */
  async create(data: Prisma.ProductCreateInput, initialStock?: number) {
    console.log('ProductsService.create called with:', JSON.stringify(data, null, 2));
    try {
      const product = await prisma.product.create({
        data,
        include: {
          images: true,
          category: true,
          variants: true,
        },
      });
      
      // Create inventory entries for variants with default location
      if (product.variants && product.variants.length > 0) {
        // Get default location (first available)
        const defaultLocation = await prisma.location.findFirst({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        });
        
        if (defaultLocation) {
          await prisma.inventory.createMany({
            data: product.variants.map(variant => ({
              variantId: variant.id,
              locationId: defaultLocation.id,
              quantity: initialStock || 0,
              reserved: 0,
              minimum: 0,
            })),
            skipDuplicates: true,
          });
        }
      }
      
      // Queue product for Meilisearch indexing
      await queueProductIndex(product.id).catch(err => 
        console.error('Failed to queue product index:', err)
      );
      
      return product;
    } catch (error: any) {
      console.error('Prisma create error:', error.message);
      console.error('Prisma error code:', error.code);
      console.error('Prisma error meta:', error.meta);
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  async update(id: string, data: Prisma.ProductUpdateInput) {
    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        images: true,
        category: true,
        variants: {
          include: {
            inventory: true,
          },
        },
      },
    });
    
    // Queue product for Meilisearch reindexing
    await queueProductIndex(product.id).catch(err => 
      console.error('Failed to queue product reindex:', err)
    );
    
    return product;
  }

  /**
   * Update stock for multiple variants
   */
  async updateVariantsStock(variantIds: string[], quantity: number) {
    // Get default location
    const defaultLocation = await prisma.location.findFirst({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    
    if (!defaultLocation) {
      console.error('No default location found for inventory update');
      return;
    }

    for (const variantId of variantIds) {
      await prisma.inventory.upsert({
        where: {
          variantId_locationId: {
            variantId,
            locationId: defaultLocation.id,
          },
        },
        update: {
          quantity,
        },
        create: {
          variantId,
          locationId: defaultLocation.id,
          quantity,
          reserved: 0,
          minimum: 0,
        },
      });
    }
  }

  /**
   * Soft delete a product (set status to ARCHIVED)
   */
  async delete(id: string) {
    const product = await prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    
    // Queue product for removal from Meilisearch
    await queueProductDelete(id).catch(err => 
      console.error('Failed to queue product delete:', err)
    );
    
    return product;
  }

  /**
   * Bulk import products from CSV/XLSX
   */
  async bulkImport(products: Prisma.ProductCreateInput[]) {
    return prisma.$transaction(
      products.map((product) =>
        prisma.product.create({ data: product })
      )
    );
  }

  /**
   * Get available filters for products based on category
   */
  async getFilters(categorySlug?: string) {
    // Build where clause
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
    };

    // If category specified, get all subcategory IDs as well
    let categoryIds: string[] = [];
    if (categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
        include: {
          children: {
            include: {
              children: true,
            },
          },
        },
      });

      if (category) {
        categoryIds = [category.id];
        // Add children
        category.children.forEach((child) => {
          categoryIds.push(child.id);
          // Add grandchildren
          child.children.forEach((grandchild) => {
            categoryIds.push(grandchild.id);
          });
        });
        where.categoryId = { in: categoryIds };
      }
    }

    // Get all products matching criteria
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        price: true,
        specifications: true,
        category: {
          select: {
            slug: true,
            parent: {
              select: {
                slug: true,
                parent: {
                  select: { slug: true },
                },
              },
            },
          },
        },
      },
    });

    // Extract brands from specifications
    const brandCounts: Record<string, number> = {};
    const specificationKeys: Set<string> = new Set();
    const specificationValues: Record<string, Record<string, number>> = {};
    let minPrice = Infinity;
    let maxPrice = 0;

    products.forEach((product) => {
      // Price range
      const price = Number(product.price);
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;

      // Specifications
      const specs = product.specifications as Record<string, any> | null;
      if (specs) {
        // Brand
        if (specs.brand) {
          brandCounts[specs.brand] = (brandCounts[specs.brand] || 0) + 1;
        }

        // Other specs
        Object.entries(specs).forEach(([key, value]) => {
          if (key !== 'brand' && value !== null && value !== undefined) {
            specificationKeys.add(key);
            if (!specificationValues[key]) {
              specificationValues[key] = {};
            }
            const strValue = String(value);
            specificationValues[key][strValue] = (specificationValues[key][strValue] || 0) + 1;
          }
        });
      }
    });

    // Determine which spec filters to show based on category
    const categoryPath = categorySlug ? await this.getCategoryPath(categorySlug) : [];
    const relevantSpecs = this.getRelevantSpecsForCategory(categoryPath);

    // Format brands
    const brands = Object.entries(brandCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Format specifications - only include relevant ones
    const specifications: Record<string, { value: string; count: number }[]> = {};
    relevantSpecs.forEach((specKey) => {
      if (specificationValues[specKey]) {
        specifications[specKey] = Object.entries(specificationValues[specKey])
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => {
            // Sort numerically if possible
            const numA = parseFloat(a.value);
            const numB = parseFloat(b.value);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.value.localeCompare(b.value);
          });
      }
    });

    return {
      priceRange: {
        min: minPrice === Infinity ? 0 : Math.floor(minPrice),
        max: maxPrice === 0 ? 10000 : Math.ceil(maxPrice),
      },
      brands,
      specifications,
      totalProducts: products.length,
    };
  }

  private async getCategoryPath(slug: string): Promise<string[]> {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!category) return [];

    const path = [category.slug];
    if (category.parent) {
      path.unshift(category.parent.slug);
      if (category.parent.parent) {
        path.unshift(category.parent.parent.slug);
      }
    }
    return path;
  }

  private getRelevantSpecsForCategory(categoryPath: string[]): string[] {
    // Define which specs are relevant for which categories
    const specsByCategory: Record<string, string[]> = {
      'elektronika': ['brand'],
      'laptopy': ['ram', 'processor', 'storage', 'screenSize', 'graphicsCard'],
      'smartfony': ['ram', 'storage', 'screenSize', 'batteryCapacity'],
      'telewizory': ['screenSize', 'resolution', 'panelType'],
      'sluchawki': ['type', 'connectivity', 'noiseCancellation'],
      'moda': ['size', 'material', 'color'],
      'agd': ['powerConsumption', 'energyClass', 'capacity'],
    };

    const specs = new Set<string>();
    categoryPath.forEach((slug) => {
      const categorySpecs = specsByCategory[slug];
      if (categorySpecs) {
        categorySpecs.forEach((spec) => specs.add(spec));
      }
    });

    return Array.from(specs);
  }
}

export const productsService = new ProductsService();