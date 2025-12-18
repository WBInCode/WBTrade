import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { authGuard, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication and admin role
router.use(authGuard);
router.use(adminOnly);

// GET /api/users/stats - Get user statistics
router.get('/stats', usersController.getStats);

// GET /api/users - List all users
router.get('/', usersController.getAll);

// GET /api/users/:id - Get single user
router.get('/:id', usersController.getById);

// POST /api/users - Create new user
router.post('/', usersController.create);

// PUT /api/users/:id - Update user
router.put('/:id', usersController.update);

// PATCH /api/users/:id/role - Change user role
router.patch('/:id/role', usersController.changeRole);

// POST /api/users/:id/block - Block user
router.post('/:id/block', usersController.blockUser);

// POST /api/users/:id/unblock - Unblock user
router.post('/:id/unblock', usersController.unblockUser);

// POST /api/users/:id/unlock - Unlock account (clear failed attempts)
router.post('/:id/unlock', usersController.unlockAccount);

// POST /api/users/:id/reset-password - Reset user password
router.post('/:id/reset-password', usersController.resetPassword);

// DELETE /api/users/:id - Delete user
router.delete('/:id', usersController.delete);

export default router;
