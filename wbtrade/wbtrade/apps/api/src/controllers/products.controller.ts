import { Request, Response } from 'express';
import { ProductsService } from '../services/products.service';

const productsService = new ProductsService();

/**
 * Get all products with optional filters and pagination
 */
export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    const { 
      page = '1', 
      limit = '20', 
      category, 
      minPrice, 
      maxPrice, 
      search, 
      sort,
      status 
    } = req.query;

    const filters = {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      category: category as string | undefined,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      search: search as string | undefined,
      sort: sort as string | undefined,
      status: status as string | undefined,
    };

    const result = await productsService.getAll(filters);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error retrieving products', error });
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
    const productData = req.body;
    const product = await productsService.create(productData);
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Error creating product', error });
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const productData = req.body;
    
    const product = await productsService.update(id, productData);

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product', error });
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