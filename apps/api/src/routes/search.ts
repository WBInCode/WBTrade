import { Router } from 'express';
import { searchProducts, getSuggestions } from '../controllers/search.controller';

const router = Router();

// Route for searching products
router.get('/', searchProducts);

// Route for search suggestions (autocomplete)
router.get('/suggest', getSuggestions);

export default router;