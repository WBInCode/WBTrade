import { Router, Request, Response } from 'express';
import { authGuard } from '../middleware/auth.middleware';
import { b2bService } from '../services/b2b.service';
import { z } from 'zod';
import { nipSchema } from '../lib/validation';

const router = Router();

/**
 * GET /api/b2b/status - Check B2B application status
 * Requires authentication
 */
router.get('/status', authGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await b2bService.getApplicationStatus(req.user!.userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * POST /api/b2b/apply - Submit B2B application
 * For existing users who want to upgrade to B2B
 */
const applySchema = z.object({
  companyName: z.string().min(2).max(200),
  nip: nipSchema,
  companyStreet: z.string().min(2).max(200),
  companyCity: z.string().min(2).max(100),
  companyPostalCode: z.string().regex(/^\d{2}-\d{3}$/),
  phone: z.string().min(9).max(20),
});

router.post('/apply', authGuard, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = applySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        message: 'Błąd walidacji',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await b2bService.submitApplication(req.user!.userId, validation.data);
    res.json({ message: 'Wniosek o współpracę B2B został złożony', ...result });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
