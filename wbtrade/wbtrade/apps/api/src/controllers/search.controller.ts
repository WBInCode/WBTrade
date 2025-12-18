import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';

const searchService = new SearchService();

/**
 * Search products
 */
export async function searchProducts(req: Request, res: Response): Promise<void> {
  const { query, minPrice, maxPrice, limit } = req.query;

  if (!query) {
    res.status(400).json({ message: 'Query parameter is required' });
    return;
  }

  try {
    const results = await searchService.search(
      query as string,
      minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice ? parseFloat(maxPrice as string) : undefined,
      limit ? parseInt(limit as string, 10) : undefined
    );
    res.status(200).json(results);
  } catch (error) {
    console.error('Search error:', error);
    const message = error instanceof Error ? error.message : 'Search failed';
    res.status(500).json({ message: 'Internal Server Error', error: message });
  }
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSuggestions(req: Request, res: Response): Promise<void> {
  const { query } = req.query;

  if (!query) {
    res.status(400).json({ message: 'Query parameter is required' });
    return;
  }

  try {
    const suggestions = await searchService.suggest(query as string);
    res.status(200).json(suggestions);
  } catch (error) {
    console.error('Suggestion error:', error);
    res.status(500).json({ message: 'Failed to get suggestions' });
  }
}

/**
 * Reindex all products to Meilisearch
 */
export async function reindexProducts(req: Request, res: Response): Promise<void> {
  try {
    const result = await searchService.reindexAllProducts();
    res.status(200).json({
      message: 'Reindex started successfully',
      ...result,
    });
  } catch (error) {
    console.error('Reindex error:', error);
    const message = error instanceof Error ? error.message : 'Reindex failed';
    res.status(500).json({ message: 'Failed to reindex products', error: message });
  }
}

/**
 * Get Meilisearch index stats
 */
export async function getSearchStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await searchService.getIndexStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Failed to get stats' });
  }
}