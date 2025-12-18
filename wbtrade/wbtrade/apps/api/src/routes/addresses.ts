import { Router } from 'express';
import { addressesController } from '../controllers/addresses.controller';
import { authGuard } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authGuard);

// GET /api/addresses - Get all user addresses
router.get('/', addressesController.getAll);

// GET /api/addresses/default - Get default address
router.get('/default', addressesController.getDefault);

// GET /api/addresses/:id - Get single address
router.get('/:id', addressesController.getById);

// POST /api/addresses - Create new address
router.post('/', addressesController.create);

// PUT /api/addresses/:id - Update address
router.put('/:id', addressesController.update);

// DELETE /api/addresses/:id - Delete address
router.delete('/:id', addressesController.delete);

// POST /api/addresses/:id/default - Set as default
router.post('/:id/default', addressesController.setDefault);

export default router;
