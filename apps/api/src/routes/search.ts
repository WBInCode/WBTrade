import { Router } from 'express';
import { searchProducts, getSuggestions, reindexProducts, getSearchStats } from '../controllers/search.controller';

const router = Router();

// Route for searching products
router.get('/', searchProducts);

// Route for search suggestions (autocomplete)
router.get('/suggest', getSuggestions);

// Route for reindexing products to Meilisearch
router.post('/reindex', reindexProducts);

// Route for getting Meilisearch stats
router.get('/stats', getSearchStats);

export default router;