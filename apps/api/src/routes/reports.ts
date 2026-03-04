import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { authGuard, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// Wszystkie endpointy wymagają zalogowania jako admin
router.use(authGuard, adminOnly);

// GET /api/reports/sales - raport sprzedaży
router.get('/sales', reportsController.getSalesReport);

// GET /api/reports/products - raport produktów
router.get('/products', reportsController.getProductsReport);

// GET /api/reports/customers - raport klientów
router.get('/customers', reportsController.getCustomersReport);

export default router;
