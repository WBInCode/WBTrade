import { Router, Request, Response } from 'express';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { sendCampaign } from '../workers/newsletter-campaign.worker';

const router = Router();
const prisma = new PrismaClient();

router.use(authGuard, adminOnly);

// ────────────────────────────────────────────────────────
// SUBSKRYBENCI
// ────────────────────────────────────────────────────────

// GET /api/admin/newsletter/subscribers — lista subskrybentów
router.get('/subscribers', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const status = req.query.status as string; // verified, unverified, unsubscribed

    const where: any = {};
    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }
    if (status === 'verified') {
      where.is_verified = true;
      where.unsubscribed_at = null;
    } else if (status === 'unverified') {
      where.is_verified = false;
      where.unsubscribed_at = null;
    } else if (status === 'unsubscribed') {
      where.unsubscribed_at = { not: null };
    }

    const [subscribers, total] = await Promise.all([
      prisma.newsletter_subscriptions.findMany({
        where,
        orderBy: { subscribed_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.newsletter_subscriptions.count({ where }),
    ]);

    res.json({
      subscribers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania subskrybentów' });
  }
});

// GET /api/admin/newsletter/subscribers/stats
router.get('/subscribers/stats', async (req: Request, res: Response) => {
  try {
    const [total, verified, unverified, unsubscribed] = await Promise.all([
      prisma.newsletter_subscriptions.count(),
      prisma.newsletter_subscriptions.count({
        where: { is_verified: true, unsubscribed_at: null },
      }),
      prisma.newsletter_subscriptions.count({
        where: { is_verified: false, unsubscribed_at: null },
      }),
      prisma.newsletter_subscriptions.count({
        where: { unsubscribed_at: { not: null } },
      }),
    ]);

    res.json({ total, verified, unverified, unsubscribed });
  } catch (error) {
    console.error('Error fetching subscriber stats:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania statystyk' });
  }
});

// DELETE /api/admin/newsletter/subscribers/:id
router.delete('/subscribers/:id', async (req: Request, res: Response) => {
  try {
    await prisma.newsletter_subscriptions.delete({ where: { id: req.params.id } });
    res.json({ message: 'Subskrybent usunięty' });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({ message: 'Błąd podczas usuwania subskrybenta' });
  }
});

// GET /api/admin/newsletter/subscribers/export — eksport CSV
router.get('/subscribers/export', async (req: Request, res: Response) => {
  try {
    const subscribers = await prisma.newsletter_subscriptions.findMany({
      where: { is_verified: true, unsubscribed_at: null },
      orderBy: { subscribed_at: 'desc' },
    });

    const csv = [
      'email,subscribed_at,verified_at',
      ...subscribers.map(
        (s) =>
          `${s.email},${s.subscribed_at.toISOString()},${s.verified_at?.toISOString() || ''}`
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=newsletter-subscribers.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting subscribers:', error);
    res.status(500).json({ message: 'Błąd podczas eksportu' });
  }
});

// ────────────────────────────────────────────────────────
// KAMPANIE
// ────────────────────────────────────────────────────────

// GET /api/admin/newsletter/campaigns — lista kampanii
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [campaigns, total] = await Promise.all([
      prisma.newsletter_campaigns.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.newsletter_campaigns.count({ where }),
    ]);

    res.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania kampanii' });
  }
});

// GET /api/admin/newsletter/campaigns/stats
router.get('/campaigns/stats', async (req: Request, res: Response) => {
  try {
    const [total, drafts, scheduled, sent, failed] = await Promise.all([
      prisma.newsletter_campaigns.count(),
      prisma.newsletter_campaigns.count({ where: { status: 'DRAFT' } }),
      prisma.newsletter_campaigns.count({ where: { status: 'SCHEDULED' } }),
      prisma.newsletter_campaigns.count({ where: { status: 'SENT' } }),
      prisma.newsletter_campaigns.count({ where: { status: 'FAILED' } }),
    ]);

    // Łączne statystyki otwierania
    const aggregates = await prisma.newsletter_campaigns.aggregate({
      _sum: { recipient_count: true, opened_count: true, clicked_count: true },
    });

    res.json({
      total,
      drafts,
      scheduled,
      sent,
      failed,
      totals: {
        recipients: aggregates._sum.recipient_count || 0,
        opened: aggregates._sum.opened_count || 0,
        clicked: aggregates._sum.clicked_count || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania statystyk kampanii' });
  }
});

// GET /api/admin/newsletter/campaigns/:id
router.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.newsletter_campaigns.findUnique({
      where: { id: req.params.id },
    });
    if (!campaign) {
      return res.status(404).json({ message: 'Kampania nie znaleziona' });
    }
    res.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania kampanii' });
  }
});

// POST /api/admin/newsletter/campaigns — utwórz kampanię
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const { title, subject, content, scheduled_for } = req.body;

    if (!title || !subject || !content) {
      return res.status(400).json({ message: 'Tytuł, temat i treść są wymagane' });
    }

    const campaign = await prisma.newsletter_campaigns.create({
      data: {
        id: uuidv4(),
        title,
        subject,
        content,
        status: scheduled_for ? 'SCHEDULED' : 'DRAFT',
        scheduled_for: scheduled_for ? new Date(scheduled_for) : null,
        updated_at: new Date(),
      },
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ message: 'Błąd podczas tworzenia kampanii' });
  }
});

// PUT /api/admin/newsletter/campaigns/:id — edycja kampanii
router.put('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.newsletter_campaigns.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Kampania nie znaleziona' });
    }
    if (existing.status === 'SENT' || existing.status === 'SENDING') {
      return res.status(400).json({ message: 'Nie można edytować wysłanej/wysyłanej kampanii' });
    }

    const { title, subject, content, scheduled_for } = req.body;

    const campaign = await prisma.newsletter_campaigns.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(subject && { subject }),
        ...(content !== undefined && { content }),
        ...(scheduled_for !== undefined && {
          scheduled_for: scheduled_for ? new Date(scheduled_for) : null,
          status: scheduled_for ? 'SCHEDULED' : 'DRAFT',
        }),
        updated_at: new Date(),
      },
    });

    res.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ message: 'Błąd podczas aktualizowania kampanii' });
  }
});

// POST /api/admin/newsletter/campaigns/:id/send — wyślij kampanię natychmiast
router.post('/campaigns/:id/send', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.newsletter_campaigns.findUnique({
      where: { id: req.params.id },
    });
    if (!campaign) {
      return res.status(404).json({ message: 'Kampania nie znaleziona' });
    }
    if (campaign.status === 'SENT') {
      return res.status(400).json({ message: 'Kampania została już wysłana' });
    }
    if (campaign.status === 'SENDING') {
      return res.status(400).json({ message: 'Kampania jest w trakcie wysyłki' });
    }

    // Update status to SCHEDULED so the worker picks it up immediately
    await prisma.newsletter_campaigns.update({
      where: { id: req.params.id },
      data: { status: 'SCHEDULED', scheduled_for: new Date(), updated_at: new Date() },
    });

    // Send campaign directly (no Redis needed)
    // Run async — respond immediately so the UI doesn't timeout
    sendCampaign(req.params.id).catch((err) => {
      console.error(`[Newsletter] Background send failed for ${req.params.id}:`, err);
    });

    res.json({ message: 'Kampania została przekazana do wysyłki' });
  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ message: 'Błąd podczas wysyłania kampanii' });
  }
});

// DELETE /api/admin/newsletter/campaigns/:id
router.delete('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.newsletter_campaigns.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Kampania nie znaleziona' });
    }
    if (existing.status === 'SENDING') {
      return res.status(400).json({ message: 'Nie można usunąć kampanii w trakcie wysyłki' });
    }

    await prisma.newsletter_campaigns.delete({ where: { id: req.params.id } });
    res.json({ message: 'Kampania usunięta' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ message: 'Błąd podczas usuwania kampanii' });
  }
});

export default router;
