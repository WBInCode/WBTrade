import { Router } from 'express';
import { categoriesController } from '../controllers/categories.controller';

const router = Router();

// GET /api/categories - Get all categories in tree structure
router.get('/', categoriesController.getAll);

// GET /api/categories/main - Get main (root) categories only
router.get('/main', categoriesController.getMain);

// GET /api/categories/:slug - Get category by slug
router.get('/:slug', categoriesController.getBySlug);

// GET /api/categories/:slug/path - Get category breadcrumb path
router.get('/:slug/path', categoriesController.getPath);

export default router;
