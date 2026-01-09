/**
 * Baselinker Admin Routes
 * 
 * All routes require admin authentication
 * Prefix: /api/admin/baselinker
 */

import { Router } from 'express';
import { baselinkerController } from '../controllers/baselinker.controller';
import { authGuard, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authGuard);
router.use(adminOnly);

// Configuration endpoints
router.post('/config', baselinkerController.saveConfig);
router.get('/config', baselinkerController.getConfig);
router.delete('/config', baselinkerController.deleteConfig);

// Connection test
router.post('/test', baselinkerController.testConnection);

// Sync endpoints
router.post('/sync', baselinkerController.triggerSync);
router.get('/status', baselinkerController.getStatus);
router.delete('/sync/:id', baselinkerController.cancelSync);

// Inventories list
router.get('/inventories', baselinkerController.getInventories);

export default router;
