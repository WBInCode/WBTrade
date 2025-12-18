import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authGuard, roleGuard, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Tymczasowo bez autoryzacji dla testow - USUNAC w produkcji!
// router.use(authGuard);
// router.use(roleGuard('ADMIN', 'MANAGER', 'WAREHOUSE'));

// GET /api/admin/dashboard - wszystkie dane naraz
router.get('/', dashboardController.getSummary);

// GET /api/admin/dashboard/kpis - KPI cards
router.get('/kpis', dashboardController.getKPIs);

// GET /api/admin/dashboard/sales-chart - wykres sprzedazy
router.get('/sales-chart', dashboardController.getSalesChart);

// GET /api/admin/dashboard/recent-orders - ostatnie zamowienia
router.get('/recent-orders', dashboardController.getRecentOrders);

// GET /api/admin/dashboard/low-stock - niski stan
router.get('/low-stock', dashboardController.getLowStock);

// GET /api/admin/dashboard/alerts - alerty
router.get('/alerts', dashboardController.getAlerts);

export default router;
