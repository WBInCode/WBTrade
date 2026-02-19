import { Router } from 'express';
import { shoppingListController } from '../controllers/shopping-list.controller';
import { authGuard, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Get all user's shopping lists (requires auth)
router.get('/', authGuard, (req, res) => shoppingListController.getLists(req, res));

// Get lists containing a specific product (optional auth)
router.get('/product/:productId', optionalAuth, (req, res) => shoppingListController.getListsForProduct(req, res));

// Get a single shopping list (requires auth)
router.get('/:id', authGuard, (req, res) => shoppingListController.getList(req, res));

// Create a new shopping list (requires auth)
router.post('/', authGuard, (req, res) => shoppingListController.createList(req, res));

// Update a shopping list (requires auth)
router.put('/:id', authGuard, (req, res) => shoppingListController.updateList(req, res));

// Delete a shopping list (requires auth)
router.delete('/:id', authGuard, (req, res) => shoppingListController.deleteList(req, res));

// Add item to shopping list (requires auth)
router.post('/:id/items', authGuard, (req, res) => shoppingListController.addItem(req, res));

// Remove item from shopping list (requires auth)
router.delete('/:id/items/:itemId', authGuard, (req, res) => shoppingListController.removeItem(req, res));

export default router;
