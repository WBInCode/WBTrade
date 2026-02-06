import { Router, Request, Response } from 'express';
import { generateGoogleMerchantFeed, getFeedStats } from '../services/google-feed.service';
import { authGuard, adminOnly } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/feed/google
 * Returns Google Merchant Center XML feed
 * Public endpoint - accessible by Google bots
 */
router.get('/google', async (req: Request, res: Response) => {
  try {
    // Determine base URL from request or environment
    const baseUrl = process.env.FRONTEND_URL?.split(',')[0]?.trim() 
      || `${req.protocol}://${req.get('host')}`;

    const xmlFeed = await generateGoogleMerchantFeed(baseUrl);

    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'X-Robots-Tag': 'noindex', // Don't index the feed itself
    });

    res.send(xmlFeed);
  } catch (error) {
    console.error('Error generating Google feed:', error);
    res.status(500).json({ 
      error: 'Failed to generate feed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/feed/google/stats
 * Returns feed statistics (admin only)
 */
router.get('/google/stats', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const stats = await getFeedStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting feed stats:', error);
    res.status(500).json({ 
      error: 'Failed to get feed stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/feed/google.xml
 * Alternative URL with .xml extension
 */
router.get('/google.xml', async (req: Request, res: Response) => {
  try {
    const baseUrl = process.env.FRONTEND_URL?.split(',')[0]?.trim() 
      || `${req.protocol}://${req.get('host')}`;

    const xmlFeed = await generateGoogleMerchantFeed(baseUrl);

    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'noindex',
    });

    res.send(xmlFeed);
  } catch (error) {
    console.error('Error generating Google feed:', error);
    res.status(500).json({ 
      error: 'Failed to generate feed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
