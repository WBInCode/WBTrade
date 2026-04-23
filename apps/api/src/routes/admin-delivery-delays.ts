/**
 * Admin Delivery Delay Alerts Routes
 *
 * GET    /api/admin/delivery-delays           — List alerts (with filters)
 * GET    /api/admin/delivery-delays/presets    — Available message presets
 * GET    /api/admin/delivery-delays/settings   — Current alert threshold settings
 * POST   /api/admin/delivery-delays/:id/notify — Send notification to customer
 * POST   /api/admin/delivery-delays/:id/dismiss — Dismiss alert
 * POST   /api/admin/delivery-delays/detect     — Manually trigger detection
 * PATCH  /api/admin/delivery-delays/settings   — Update alert threshold
 */

import { Router, Request, Response } from 'express';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import { prisma } from '../db';
import { deliveryDelayService } from '../services/delivery-delay.service';

const router = Router();

router.use(authGuard, adminOnly);

// ────────────────────────────────────────────────────────
// GET /api/admin/delivery-delays
// ────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'all';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {
      order: { paymentStatus: 'PAID' },
    };
    if (status !== 'all') {
      where.status = status;
    }

    const [alerts, total, pendingCount, notifiedCount] = await Promise.all([
      prisma.deliveryDelayAlert.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              estimatedDeliveryDate: true,
              shippingMethod: true,
              total: true,
              createdAt: true,
              userId: true,
              guestEmail: true,
              guestFirstName: true,
              guestLastName: true,
              user: { select: { firstName: true, lastName: true, email: true } },
              items: {
                select: { productName: true, quantity: true },
                take: 3,
              },
            },
          },
        },
        orderBy: [{ status: 'asc' }, { detectedAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.deliveryDelayAlert.count({ where }),
      prisma.deliveryDelayAlert.count({ where: { status: 'pending', order: { paymentStatus: 'PAID' } } }),
      prisma.deliveryDelayAlert.count({ where: { status: 'notified', order: { paymentStatus: 'PAID' } } }),
    ]);

    res.json({
      alerts,
      pendingCount,
      notifiedCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching delivery delay alerts:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania alertów opóźnień' });
  }
});

// ────────────────────────────────────────────────────────
// GET /api/admin/delivery-delays/presets
// ────────────────────────────────────────────────────────
router.get('/presets', async (_req: Request, res: Response) => {
  try {
    const presets = await deliveryDelayService.getPresets();
    res.json({ presets });
  } catch (error) {
    console.error('Error fetching presets:', error);
    res.status(500).json({ message: 'Błąd pobierania szablonów' });
  }
});

// ────────────────────────────────────────────────────────
// GET /api/admin/delivery-delays/settings
// ────────────────────────────────────────────────────────
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const hours = await deliveryDelayService.getAlertThresholdHours();
    res.json({ alertHours: hours });
  } catch (error) {
    console.error('Error fetching delay settings:', error);
    res.status(500).json({ message: 'Błąd pobierania ustawień' });
  }
});

// ────────────────────────────────────────────────────────
// PATCH /api/admin/delivery-delays/settings
// ────────────────────────────────────────────────────────
router.patch('/settings', async (req: Request, res: Response) => {
  try {
    const { alertHours } = req.body;
    const hours = parseInt(alertHours, 10);

    if (isNaN(hours) || hours < 1 || hours > 168) {
      res.status(400).json({ message: 'alertHours must be between 1 and 168' });
      return;
    }

    await prisma.settings.upsert({
      where: { key: 'delivery_delay_alert_hours' },
      update: { value: String(hours) },
      create: { key: 'delivery_delay_alert_hours', value: String(hours) },
    });

    res.json({ success: true, alertHours: hours });
  } catch (error) {
    console.error('Error updating delay settings:', error);
    res.status(500).json({ message: 'Błąd aktualizacji ustawień' });
  }
});

// ────────────────────────────────────────────────────────
// POST /api/admin/delivery-delays/bulk-notify
// ────────────────────────────────────────────────────────
router.post('/bulk-notify', async (req: Request, res: Response) => {
  try {
    const { alertIds, messageType, customMessage } = req.body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      res.status(400).json({ message: 'alertIds must be a non-empty array' });
      return;
    }

    if (alertIds.length > 50) {
      res.status(400).json({ message: 'Maximum 50 alerts at once' });
      return;
    }

    if (!messageType) {
      res.status(400).json({ message: 'messageType is required' });
      return;
    }

    if (messageType === 'custom' && !customMessage) {
      res.status(400).json({ message: 'customMessage is required when messageType is "custom"' });
      return;
    }

    const adminId = req.user?.userId;
    const results: { alertId: string; success: boolean; orderNumber?: string; error?: string }[] = [];

    for (const alertId of alertIds) {
      const result = await deliveryDelayService.sendDelayNotification(alertId, messageType, customMessage, adminId);
      const alert = await prisma.deliveryDelayAlert.findUnique({
        where: { id: alertId },
        select: { order: { select: { orderNumber: true } } },
      });
      results.push({
        alertId,
        success: result.success,
        orderNumber: alert?.order?.orderNumber,
        error: result.error,
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      message: `Wysłano ${successCount} powiadomień${failCount > 0 ? `, ${failCount} błędów` : ''}`,
      successCount,
      failCount,
      results,
    });
  } catch (error) {
    console.error('Error bulk notifying:', error);
    res.status(500).json({ message: 'Błąd masowego wysyłania powiadomień' });
  }
});

// ────────────────────────────────────────────────────────
// POST /api/admin/delivery-delays/bulk-dismiss
// ────────────────────────────────────────────────────────
router.post('/bulk-dismiss', async (req: Request, res: Response) => {
  try {
    const { alertIds } = req.body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      res.status(400).json({ message: 'alertIds must be a non-empty array' });
      return;
    }

    if (alertIds.length > 50) {
      res.status(400).json({ message: 'Maximum 50 alerts at once' });
      return;
    }

    const adminId = req.user?.userId;
    let successCount = 0;

    for (const alertId of alertIds) {
      const result = await deliveryDelayService.dismissAlert(alertId, adminId);
      if (result.success) successCount++;
    }

    res.json({
      success: true,
      message: `Odrzucono ${successCount} alertów`,
      successCount,
    });
  } catch (error) {
    console.error('Error bulk dismissing:', error);
    res.status(500).json({ message: 'Błąd masowego odrzucania alertów' });
  }
});

// ────────────────────────────────────────────────────────
// POST /api/admin/delivery-delays/:id/notify
// ────────────────────────────────────────────────────────
router.post('/:id/notify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { messageType, customMessage } = req.body;

    if (!messageType) {
      res.status(400).json({ message: 'messageType is required (preset_1, preset_2, preset_3, or custom)' });
      return;
    }

    if (messageType === 'custom' && !customMessage) {
      res.status(400).json({ message: 'customMessage is required when messageType is "custom"' });
      return;
    }

    const adminId = req.user?.userId;
    const result = await deliveryDelayService.sendDelayNotification(id, messageType, customMessage, adminId);

    if (!result.success) {
      res.status(400).json({ message: result.error });
      return;
    }

    res.json({ success: true, message: 'Powiadomienie wysłane pomyślnie' });
  } catch (error) {
    console.error('Error sending delay notification:', error);
    res.status(500).json({ message: 'Błąd wysyłania powiadomienia' });
  }
});

// ────────────────────────────────────────────────────────
// POST /api/admin/delivery-delays/:id/dismiss
// ────────────────────────────────────────────────────────
router.post('/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId;
    const result = await deliveryDelayService.dismissAlert(id, adminId);

    if (!result.success) {
      res.status(400).json({ message: result.error });
      return;
    }

    res.json({ success: true, message: 'Alert odrzucony' });
  } catch (error) {
    console.error('Error dismissing delay alert:', error);
    res.status(500).json({ message: 'Błąd odrzucania alertu' });
  }
});

// ────────────────────────────────────────────────────────
// POST /api/admin/delivery-delays/detect — Manual trigger
// ────────────────────────────────────────────────────────
router.post('/detect', async (_req: Request, res: Response) => {
  try {
    const result = await deliveryDelayService.detectDelays();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error detecting delays:', error);
    res.status(500).json({ message: 'Błąd wykrywania opóźnień' });
  }
});

// ────────────────────────────────────────────────────────
// PATCH /api/admin/delivery-delays/orders/:orderId/estimated-delivery
// ────────────────────────────────────────────────────────
router.patch('/orders/:orderId/estimated-delivery', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { estimatedDeliveryDate } = req.body;

    if (!estimatedDeliveryDate) {
      res.status(400).json({ message: 'estimatedDeliveryDate is required' });
      return;
    }

    const date = new Date(estimatedDeliveryDate);
    if (isNaN(date.getTime())) {
      res.status(400).json({ message: 'Invalid date format' });
      return;
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { estimatedDeliveryDate: date },
      select: { id: true, orderNumber: true, estimatedDeliveryDate: true },
    });

    res.json({ success: true, order });
  } catch (error) {
    console.error('Error updating estimated delivery date:', error);
    res.status(500).json({ message: 'Błąd aktualizacji daty dostawy' });
  }
});

export default router;
