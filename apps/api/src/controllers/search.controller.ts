import { Request, Response } from 'express';
import { z } from 'zod';
import { SearchService } from '../services/search.service';
import { prisma } from '../db';

const searchService = new SearchService();

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Helper to sanitize search query - removes potential injection attacks
 */
const sanitizeSearchQuery = (query: string): string => {
  return query
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .slice(0, 200); // Max 200 characters
};

/**
 * Search query validation schema
 */
const searchQuerySchema = z.object({
  query: z
    .string()
    .min(1, 'Query parameter is required')
    .max(200, 'Zapytanie jest za dlugie')
    .transform(sanitizeSearchQuery),
  minPrice: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const num = parseFloat(val);
    return isNaN(num) || num < 0 ? undefined : num;
  }),
  maxPrice: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const num = parseFloat(val);
    return isNaN(num) || num < 0 ? undefined : num;
  }),
  limit: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 20 : Math.min(num, 100);
  }),
});

/**
 * Suggestions query validation schema
 */
const suggestionsQuerySchema = z.object({
  query: z
    .string()
    .min(1, 'Query parameter is required')
    .max(100, 'Zapytanie jest za dlugie')
    .transform(sanitizeSearchQuery),
});

/**
 * Search products
 */
export async function searchProducts(req: Request, res: Response): Promise<void> {
  const validation = searchQuerySchema.safeParse(req.query);
  
  if (!validation.success) {
    res.status(400).json({
      message: 'Validation error',
      errors: validation.error.flatten().fieldErrors,
    });
    return;
  }

  const { query, minPrice, maxPrice, limit } = validation.data;

  try {
    const results = await searchService.search(query, minPrice, maxPrice, limit);
    res.status(200).json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Wyszukiwanie nie powiodlo sie' });
  }
}

/**
 * Get search suggestions (autocomplete)
 */
export async function getSuggestions(req: Request, res: Response): Promise<void> {
  const validation = suggestionsQuerySchema.safeParse(req.query);
  
  if (!validation.success) {
    res.status(400).json({
      message: 'Validation error',
      errors: validation.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const suggestions = await searchService.suggest(validation.data.query);
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
    res.status(500).json({ message: 'Failed to reindex products' });
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

/**
 * Get popular searches from the last 30 days
 * Returns most frequently searched terms
 */
export async function getPopularSearches(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Get most common search queries from SearchHistory
    const popularSearches = await prisma.searchHistory.groupBy({
      by: ['query'],
      where: {
        createdAt: { gte: dateThreshold },
        query: { not: '' },
      },
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: limit,
    });

    // If no search history, return default popular searches
    if (popularSearches.length === 0) {
      res.status(200).json({
        searches: [
          'Zabawki',
          'Przytulanka',
          'Dekoracje',
          'Kuchnia',
          'Akcesoria',
        ],
        isDefault: true,
      });
      return;
    }

    res.status(200).json({
      searches: popularSearches.map(s => s.query),
      isDefault: false,
    });
  } catch (error) {
    console.error('Popular searches error:', error);
    // Return defaults on error
    res.status(200).json({
      searches: [
        'Zabawki',
        'Przytulanka',
        'Dekoracje',
        'Kuchnia',
        'Akcesoria',
      ],
      isDefault: true,
    });
  }
}
