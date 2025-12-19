import { Router } from 'express';
import { locationsController } from '../controllers/locations.controller';
import { authGuard, warehouseAccess } from '../middleware/auth.middleware';

const router = Router();

// Public - get location tree
router.get('/tree', locationsController.getTree.bind(locationsController));

// Protected routes - require authentication and warehouse access
router.get('/', authGuard, warehouseAccess, locationsController.getAll.bind(locationsController));
router.get('/type/:type', authGuard, warehouseAccess, locationsController.getByType.bind(locationsController));
router.get('/:id', authGuard, warehouseAccess, locationsController.getById.bind(locationsController));
router.post('/', authGuard, warehouseAccess, locationsController.create.bind(locationsController));
router.put('/:id', authGuard, warehouseAccess, locationsController.update.bind(locationsController));
router.delete('/:id', authGuard, warehouseAccess, locationsController.delete.bind(locationsController));

export default router;
