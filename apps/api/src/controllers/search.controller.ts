import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';

const searchService = new SearchService();

/**
 * Search products
 */
export async function searchProducts(req: Request, res: Response): Promise<void> {
  const { query, minPrice, maxPrice } = req.query;

  if (!query) {
    res.status(400).json({ message: 'Query parameter is required' });
    return;
  }

  try {
    const results = await searchService.search(
      query as string,
      minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice ? parseFloat(maxPrice as string) : undefined
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