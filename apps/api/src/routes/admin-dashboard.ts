import { Router } from 'express';
import { adminDashboardController } from '../controllers/admin-dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Wszystkie endpointy wymagaja zalogowania i roli admina/managera
router.use(authMiddleware);

// GET /api/admin/dashboard - wszystkie dane naraz
router.get('/', adminDashboardController.getSummary);

// GET /api/admin/dashboard/kpis - KPI cards
router.get('/kpis', adminDashboardController.getKPIs);

// GET /api/admin/dashboard/sales-chart - wykres sprzedazy
router.get('/sales-chart', adminDashboardController.getSalesChart);

// GET /api/admin/dashboard/recent-orders - ostatnie zamowienia
router.get('/recent-orders', adminDashboardController.getRecentOrders);

// GET /api/admin/dashboard/low-stock - niski stan
router.get('/low-stock', adminDashboardController.getLowStock);

// GET /api/admin/dashboard/alerts - alerty
router.get('/alerts', adminDashboardController.getAlerts);

export default router;
