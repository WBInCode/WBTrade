import { Router, Request, Response } from 'express';
import { wholesalerConfigService } from '../services/wholesaler-config.service';

const router = Router();

// GET /api/wholesalers/config - Public endpoint (cached) for frontend apps
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const config = await wholesalerConfigService.getPublicConfig();
    // Cache for 5 minutes on CDN/browser
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.json(config);
  } catch (err) {
    console.error('[Wholesalers] Public config error:', err);
    res.status(500).json({ message: 'Błąd pobierania konfiguracji hurtowni' });
  }
});

export default router;
