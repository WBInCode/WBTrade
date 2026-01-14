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
    const num = parseInt(val || '48', 10);
    return isNaN(num) || num < 1 ? 48 : Math.min(num, 500);
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
  // Ukryj produkty ze stanem 0 starsze niż 14 dni (domyślnie false - trzeba jawnie włączyć)
  hideOldZeroStock: z.string().optional().transform((val) => val === 'true'),
});

/**
 * Product variant schema
 */
const productVariantSchema = z.object({
  id: z.string().optional(), // Existing variant ID
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(200).transform(sanitizeText),
  price: z.number().positive().max(9999999),
  compareAtPrice: z.number().positive().max(9999999).optional().nullable(),
  stock: z.number().int().min(0).optional(),
  attributes: z.record(z.string().max(200)).optional(),
});

/**
 * Product image schema
 */
const productImageSchema = z.object({
  id: z.string().optional(), // Existing image ID
  url: z.string().url().max(2000),
  alt: z.string().max(200).optional().nullable().transform((val) => val ? sanitizeText(val) : undefined),
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
  compareAtPrice: z.number().positive().max(9999999).nullable().optional(),
  sku: z.string().min(1).max(100).optional(),
  barcode: z.string().max(50).optional(),
  categoryId: z.string().optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional().default('DRAFT'),
  specifications: z.record(z.string().max(500)).optional(),
  metaTitle: z.string().max(100).optional().transform((val) => val ? sanitizeText(val) : undefined),
  metaDescription: z.string().max(300).optional().transform((val) => val ? sanitizeText(val) : undefined),
  variants: z.array(productVariantSchema).optional(),
  images: z.array(productImageSchema).optional(),
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  weight: z.number().min(0).nullable().optional(),
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
    console.log('Creating product, req.body:', JSON.stringify(req.body, null, 2));
    
    const validation = createProductSchema.safeParse(req.body);
    
    if (!validation.success) {
      console.log('Validation failed:', validation.error.flatten());
      res.status(400).json({
        message: 'Validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    console.log('Validation passed, data:', JSON.stringify(validation.data, null, 2));

    const { images, variants, categoryId, stock, lowStockThreshold, weight, shortDescription, ...productData } = validation.data;
    
    // Build Prisma-compatible data structure
    const prismaData: any = {
      ...productData,
      // Connect category if provided
      ...(categoryId && {
        category: { connect: { id: categoryId } }
      }),
      // Create images if provided
      ...(images && images.length > 0 && {
        images: {
          create: images.map((img, index) => ({
            url: img.url,
            alt: img.alt || productData.name,
            order: img.order ?? index,
          }))
        }
      }),
      // Create variants if provided
      ...(variants && variants.length > 0 && {
        variants: {
          create: variants.map((variant) => ({
            name: variant.name,
            sku: variant.sku,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            attributes: variant.attributes || {},
          }))
        }
      }),
    };

    console.log('Prisma data:', JSON.stringify(prismaData, null, 2));

    // If categoryId is provided, verify it exists first
    if (categoryId) {
      const categoryExists = await productsService.categoryExists(categoryId);
      if (!categoryExists) {
        res.status(400).json({ message: 'Kategoria nie istnieje', details: `Category ID: ${categoryId}` });
        return;
      }
    }

    const product = await productsService.create(prismaData, stock);
    res.status(201).json(product);
  } catch (error: any) {
    console.error('Error creating product:', error);
    console.error('Error details:', error?.message, error?.code, error?.meta);
    res.status(500).json({ message: 'Error creating product', details: error?.message });
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
    
    console.log('Update product req.body:', JSON.stringify(req.body, null, 2));
    const validation = updateProductSchema.safeParse(req.body);
    
    if (!validation.success) {
      console.log('Update validation failed:', validation.error.flatten());
      res.status(400).json({
        message: 'Validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }
    
    // Extract fields that need special handling
    const { images, variants, categoryId, stock, lowStockThreshold, weight, shortDescription, ...productData } = validation.data;
    
    // Build Prisma-compatible data structure for update
    const prismaData: any = {
      ...productData,
      // Connect/disconnect category
      ...(categoryId !== undefined && {
        category: categoryId ? { connect: { id: categoryId } } : { disconnect: true }
      }),
    };
    
    const product = await productsService.update(id, prismaData);

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Update inventory for variants if stock value is provided
    if (stock !== undefined && product.variants && product.variants.length > 0) {
      await productsService.updateVariantsStock(product.variants.map((v: any) => v.id), stock);
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