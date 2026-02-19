import { Router, Request, Response } from 'express';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.use(authGuard, adminOnly);

// GET /api/admin/activity-log — lista zdarzeń audytu
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const search = (req.query.search as string) || '';
    const severity = req.query.severity as string;
    const action = req.query.action as string;
    const success = req.query.success as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search } },
      ];
    }
    if (severity) where.severity = severity;
    if (action) where.action = action;
    if (success === 'true') where.success = true;
    if (success === 'false') where.success = false;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
      prisma.securityAuditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.securityAuditLog.count({ where }),
    ]);

    res.json({
      logs: logs.map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania logów' });
  }
});

// GET /api/admin/activity-log/stats — statystyki
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, last24hCount, last7dCount, failedCount, criticalCount, actionCounts] =
      await Promise.all([
        prisma.securityAuditLog.count(),
        prisma.securityAuditLog.count({ where: { createdAt: { gte: last24h } } }),
        prisma.securityAuditLog.count({ where: { createdAt: { gte: last7d } } }),
        prisma.securityAuditLog.count({ where: { success: false, createdAt: { gte: last7d } } }),
        prisma.securityAuditLog.count({
          where: { severity: { in: ['CRITICAL', 'ERROR'] }, createdAt: { gte: last7d } },
        }),
        prisma.securityAuditLog.groupBy({
          by: ['action'],
          _count: true,
          where: { createdAt: { gte: last7d } },
          orderBy: { _count: { action: 'desc' } },
          take: 10,
        }),
      ]);

    res.json({
      total,
      last24h: last24hCount,
      last7d: last7dCount,
      failedLast7d: failedCount,
      criticalLast7d: criticalCount,
      topActions: actionCounts.map((a) => ({
        action: a.action,
        count: a._count,
      })),
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania statystyk' });
  }
});

// GET /api/admin/activity-log/actions — lista unikalnych akcji
router.get('/actions', async (req: Request, res: Response) => {
  try {
    const actions = await prisma.securityAuditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });
    res.json(actions.map((a) => a.action));
  } catch (error) {
    console.error('Error fetching actions:', error);
    res.status(500).json({ message: 'Błąd' });
  }
});

export default router;
