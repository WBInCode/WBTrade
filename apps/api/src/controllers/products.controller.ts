import { Request, Response } from 'express';
import { z } from 'zod';
import { ProductsService } from '../services/products.service';

const productsService = new ProductsService();

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Helper to sanitize text - removes potential XSS and trims
 */
const sanitizeText = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .trim();
};

/**
 * Query params validation for product listing
 */
const productQuerySchema = z.object({
  page: z.string().optional().transform((val) => {
    const num = parseInt(val || '1', 10);
    return isNaN(num) || num < 1 ? 1 : Math.min(num, 1000);
  }),
  limit: z.string().optional().transform((val) => {
    const num = parseInt(val || '20', 10);
    return isNaN(num) || num < 1 ? 20 : Math.min(num, 100);
  }),
  category: z.string().max(100).optional(),
  minPrice: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const num = parseFloat(val);
    return isNaN(num) || num < 0 ? undefined : num;
  }),
  maxPrice: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const num = parseFloat(val);
    return isNaN(num) || num < 0 ? undefined : num;
  }),
  search: z.string().max(200).optional().transform((val) => val ? sanitizeText(val) : undefined),
  sort: z.enum(['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest', 'oldest', 'popular']).optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
});

/**
 * Product variant schema
 */
const productVariantSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(200).transform(sanitizeText),
  price: z.number().positive().max(9999999),
  compareAtPrice: z.number().positive().max(9999999).optional(),
  stock: z.number().int().min(0).optional(),
  attributes: z.record(z.string().max(200)).optional(),
});

/**
 * Product image schema
 */
const productImageSchema = z.object({
  url: z.string().url().max(2000),
  alt: z.string().max(200).optional().transform((val) => val ? sanitizeText(val) : undefined),
  order: z.number().int().min(0).max(100).optional(),
});

/**
 * Create product validation schema
 */
const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200).transform(sanitizeText),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format').optional(),
  description: z.string().max(10000).optional().transform((val) => val ? sanitizeText(val) : undefined),
  shortDescription: z.string().max(500).optional().transform((val) => val ? sanitizeText(val) : undefined),
  price: z.number().positive('Price must be positive').max(9999999),
  compareAtPrice: z.number().positive().max(9999999).optional(),
  sku: z.string().min(1).max(100).optional(),
  barcode: z.string().max(50).optional(),
  categoryId: z.string().regex(/^c[a-z0-9]{20,}$/i, 'Invalid category ID').optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional().default('DRAFT'),
  specifications: z.record(z.string().max(500)).optional(),
  metaTitle: z.string().max(100).optional().transform((val) => val ? sanitizeText(val) : undefined),
  metaDescription: z.string().max(300).optional().transform((val) => val ? sanitizeText(val) : undefined),
  variants: z.array(productVariantSchema).optional(),
  images: z.array(productImageSchema).optional(),
});

/**
 * Update product validation schema (all fields optional)
 */
const updateProductSchema = createProductSchema.partial();

/**
 * Get all products with optional filters and pagination
 */
export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    const validation = productQuerySchema.safeParse(req.query);
    
    if (!validation.success) {
      res.status(400).json({
        message: 'Invalid query parameters',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const filters = validation.data;
    const result = await productsService.getAll(filters);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error retrieving products' });
  }
}

/**
 * Get a single product by ID
 */
export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const product = await productsService.getById(id);

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Error retrieving product', error });
  }
}

/**
 * Get a single product by slug (for SEO-friendly URLs)
 */
export async function getProductBySlug(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const product = await productsService.getBySlug(slug);

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Error retrieving product', error });
  }
}

/**
 * Create a new product
 */
export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const validation = createProductSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    // Data is validated by Zod, safe to pass to Prisma
    const product = await productsService.create(validation.data as any);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Error creating product' });
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    // Validate CUID format (Prisma uses CUID by default)
    const cuidRegex = /^c[a-z0-9]{20,}$/i;
    if (!cuidRegex.test(id)) {
      res.status(400).json({ message: 'Invalid product ID format' });
      return;
    }
    
    const validation = updateProductSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }
    
    // Data is validated by Zod, safe to pass to Prisma
    const product = await productsService.update(id, validation.data as any);

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product' });
  }
}

/**
 * Delete a product (soft delete)
 */
export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await productsService.delete(id);

    if (!result) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product', error });
  }
}

/**
 * Get available filters for products
 */
export async function getFilters(req: Request, res: Response): Promise<void> {
  try {
    const { category } = req.query;
    const filters = await productsService.getFilters(category as string | undefined);
    res.status(200).json(filters);
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ message: 'Error retrieving filters', error });
  }
}