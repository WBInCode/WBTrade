import { Request, Response } from 'express';
import { categoriesService } from '../services/categories.service';

export const categoriesController = {
  /**
   * GET /api/categories
   * Get all categories in tree structure
   */
  async getAll(req: Request, res: Response) {
    try {
      const categories = await categoriesService.getCategoryTree();
      res.json({ categories });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  },

  /**
   * GET /api/categories/main
   * Get main (root) categories only
   */
  async getMain(req: Request, res: Response) {
    try {
      const categories = await categoriesService.getMainCategories();
      res.json({ categories });
    } catch (error) {
      console.error('Error fetching main categories:', error);
      res.status(500).json({ message: 'Failed to fetch main categories' });
    }
  },

  /**
   * GET /api/categories/:slug
   * Get category by slug with children
   */
  async getBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const category = await categoriesService.getCategoryBySlug(slug);
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      res.json({ category });
    } catch (error) {
      console.error('Error fetching category:', error);
      res.status(500).json({ message: 'Failed to fetch category' });
    }
  },

  /**
   * GET /api/categories/:slug/path
   * Get category breadcrumb path
   */
  async getPath(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const path = await categoriesService.getCategoryPath(slug);
      
      if (path.length === 0) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      res.json({ path });
    } catch (error) {
      console.error('Error fetching category path:', error);
      res.status(500).json({ message: 'Failed to fetch category path' });
    }
  },

  /**
   * POST /api/categories
   * Create a new category
   */
  async create(req: Request, res: Response) {
    try {
      const { name, slug, description, image, parentId } = req.body;

      if (!name || !slug) {
        return res.status(400).json({ message: 'Nazwa i slug są wymagane' });
      }

      const category = await categoriesService.createCategory({
        name,
        slug,
        description,
        image,
        parentId,
      });

      res.status(201).json({ category });
    } catch (error: any) {
      console.error('Error creating category:', error);
      res.status(400).json({ message: error.message || 'Failed to create category' });
    }
  },

  /**
   * PUT /api/categories/:id
   * Update an existing category
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, slug, description, image, parentId } = req.body;

      const category = await categoriesService.updateCategory(id, {
        name,
        slug,
        description,
        image,
        parentId,
      });

      res.json({ category });
    } catch (error: any) {
      console.error('Error updating category:', error);
      res.status(400).json({ message: error.message || 'Failed to update category' });
    }
  },

  /**
   * DELETE /api/categories/:id
   * Delete a category
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await categoriesService.deleteCategory(id);

      res.json({ message: 'Kategoria została usunięta' });
    } catch (error: any) {
      console.error('Error deleting category:', error);
      res.status(400).json({ message: error.message || 'Failed to delete category' });
    }
  },

  /**
   * GET /api/categories/id/:id
   * Get category by ID
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const category = await categoriesService.getCategoryById(id);

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json({ category });
    } catch (error) {
      console.error('Error fetching category by ID:', error);
      res.status(500).json({ message: 'Failed to fetch category' });
    }
  },
};
