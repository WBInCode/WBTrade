/**
 * User Notifications Routes
 *
 * GET   /api/notifications              — List notifications (paginated)
 * GET   /api/notifications/unread-count  — Get unread count
 * PATCH /api/notifications/:id/read      — Mark one as read
 * PATCH /api/notifications/read-all      — Mark all as read
 */

import { Router, Request, Response } from 'express';
import { authGuard } from '../middleware/auth.middleware';
import { prisma } from '../db';

const router = Router();

router.use(authGuard);

// ────────────────────────────────────────────────────────
// GET /api/notifications
// ────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.userNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.userNotification.count({ where: { userId } }),
    ]);

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({ message: 'Błąd pobierania powiadomień' });
  }
});

// ────────────────────────────────────────────────────────
// GET /api/notifications/unread-count
// ────────────────────────────────────────────────────────
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const count = await prisma.userNotification.count({
      where: { userId, isRead: false },
    });

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Błąd pobierania liczby powiadomień' });
  }
});

// ────────────────────────────────────────────────────────
// PATCH /api/notifications/:id/read
// ────────────────────────────────────────────────────────
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const notification = await prisma.userNotification.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    await prisma.userNotification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Błąd oznaczania powiadomienia' });
  }
});

// ────────────────────────────────────────────────────────
// PATCH /api/notifications/read-all
// ────────────────────────────────────────────────────────
router.patch('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return; }

    await prisma.userNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Błąd oznaczania powiadomień' });
  }
});

export default router;
