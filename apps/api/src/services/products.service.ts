import { prisma } from '../db';
import { Prisma } from '@prisma/client';

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

export class ProductsService {
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

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      status: status as Prisma.EnumProductStatusFilter,
    };

    if (category) {
      where.category = { slug: category };
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
      products,
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
    return prisma.product.findUnique({
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
  }

  /**
   * Get a single product by slug
   */
  async getBySlug(slug: string) {
    return prisma.product.findUnique({
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
}

export const productsService = new ProductsService();