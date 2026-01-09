import { Router } from 'express';
import { categoriesController } from '../controllers/categories.controller';

const router = Router();

// GET /api/categories - Get all categories in tree structure
router.get('/', categoriesController.getAll);

// GET /api/categories/main - Get main (root) categories only
router.get('/main', categoriesController.getMain);

// POST /api/categories - Create a new category
router.post('/', categoriesController.create);

// GET /api/categories/id/:id - Get category by ID
router.get('/id/:id', categoriesController.getById);

// PUT /api/categories/:id - Update a category
router.put('/:id', categoriesController.update);

// DELETE /api/categories/:id - Delete a category
router.delete('/:id', categoriesController.delete);

// GET /api/categories/:slug - Get category by slug
router.get('/:slug', categoriesController.getBySlug);

// GET /api/categories/:slug/path - Get category breadcrumb path
router.get('/:slug/path', categoriesController.getPath);

export default router;
