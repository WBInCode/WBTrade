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
};
