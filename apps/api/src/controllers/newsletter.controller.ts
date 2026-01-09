import { Request, Response } from 'express';
import { newsletterService } from '../services/newsletter.service';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
});

/**
 * Subscribe to newsletter
 * POST /api/newsletter/subscribe
 */
export async function subscribe(req: Request, res: Response): Promise<void> {
  try {
    const validation = subscribeSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: 'Nieprawidłowy adres email',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await newsletterService.subscribe(validation.data);

    res.status(200).json(result);
  } catch (error) {
    console.error('[Newsletter] Subscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas zapisywania do newslettera',
    });
  }
}

/**
 * Verify newsletter subscription
 * GET /api/newsletter/verify/:token
 */
export async function verify(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Token jest wymagany',
      });
      return;
    }

    const result = await newsletterService.verify(token);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Nieprawidłowy token')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }
    console.error('[Newsletter] Verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas weryfikacji',
    });
  }
}

/**
 * Unsubscribe from newsletter
 * GET /api/newsletter/unsubscribe/:token
 */
export async function unsubscribe(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Token jest wymagany',
      });
      return;
    }

    const result = await newsletterService.unsubscribe(token);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Nieprawidłowy token')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }
    console.error('[Newsletter] Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas wypisywania z newslettera',
    });
  }
}

/**
 * Get newsletter stats (admin only)
 * GET /api/newsletter/stats
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await newsletterService.getStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('[Newsletter] Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania statystyk',
    });
  }
}

/**
 * Get all subscribers (admin only)
 * GET /api/newsletter/subscribers
 */
export async function getSubscribers(req: Request, res: Response): Promise<void> {
  try {
    const subscribers = await newsletterService.getSubscribers();
    res.status(200).json({
      success: true,
      subscribers,
    });
  } catch (error) {
    console.error('[Newsletter] Get subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania subskrybentów',
    });
  }
}
