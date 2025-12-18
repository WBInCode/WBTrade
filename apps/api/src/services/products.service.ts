import { prisma } from '../db';
import { Prisma } from '@prisma/client';
import { getProductsIndex } from '../lib/meilisearch';
import { MeiliProduct } from './search.service';

interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: string;
  status?: string;
}

interface ProductsListResult {
  products: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Transform a product from database format to API response format.
 * Parses JSON attributes and calculates stock from inventory.
 */
function transformProduct(product: any): any {
  if (!product) return product;
  
  return {
    ...product,
    variants: product.variants?.map((variant: any) => {
      // Parse attributes if it's a string
      let attributes = variant.attributes;
      if (typeof attributes === 'string') {
        try {
          attributes = JSON.parse(attributes);
        } catch {
          attributes = {};
        }
      }
      
      // Calculate stock from inventory
      const stock = variant.inventory?.reduce(
        (sum: number, inv: any) => sum + (inv.quantity - inv.reserved),
        0
      ) ?? 0;
      
      return {
        ...variant,
        attributes,
        stock,
      };
    }),
  };
}

/**
 * Transform an array of products
 */
function transformProducts(products: any[]): any[] {
  return products.map(transformProduct);
}

export class ProductsService {
  /**
   * Get all descendant category IDs for a given category slug (including the category itself)
   */
  private async getAllCategoryIds(categorySlug: string): Promise<string[]> {
    // Find the category by slug
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true },
    });

    if (!category) {
      return [];
    }

    const categoryIds: string[] = [category.id];

    // Recursively get all descendant categories
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

    await getDescendants([category.id]);

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
      status = 'ACTIVE',
    } = filters;

    // If search is provided, use Meilisearch for better results
    if (search && search.trim()) {
      return this.searchWithMeilisearch(filters);
    }

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      status: status as Prisma.EnumProductStatusFilter,
    };

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

    return {
      products: transformProducts(products),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
      status = 'ACTIVE',
    } = filters;

    try {
      const index = getProductsIndex();

      // Build filter array
      const meiliFilters: string[] = [`status = "${status}"`];
      
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
      const productIds = results.hits.map(hit => hit.id);
      
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
      const sortedProducts = productIds.map(id => 
        products.find(p => p.id === id)
      ).filter(Boolean);

      const total = results.estimatedTotalHits || results.hits.length;

      return {
        products: transformProducts(sortedProducts as any[]),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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
      status = 'ACTIVE',
    } = filters;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      status: status as Prisma.EnumProductStatusFilter,
    };

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

    return {
      products: transformProducts(products),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
  async create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({
      data,
      include: {
        images: true,
        category: true,
        variants: true,
      },
    });
  }

  /**
   * Update an existing product
   */
  async update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({
      where: { id },
      data,
      include: {
        images: true,
        category: true,
        variants: true,
      },
    });
  }

  /**
   * Soft delete a product (set status to ARCHIVED)
   */
  async delete(id: string) {
    return prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
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