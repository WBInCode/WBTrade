import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { authGuard } from '../middleware/auth.middleware';

const router = Router();

// Wszystkie endpointy wymagają zalogowania
router.use(authGuard);

// GET /api/reports/sales - raport sprzedaży
router.get('/sales', reportsController.getSalesReport);

// GET /api/reports/products - raport produktów
router.get('/products', reportsController.getProductsReport);

// GET /api/reports/customers - raport klientów
router.get('/customers', reportsController.getCustomersReport);

export default router;
