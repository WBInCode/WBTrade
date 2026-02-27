import { Router, Request, Response } from 'express';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Normalise a question for deduplication:
 * lowercase, trim, collapse whitespace, strip trailing punctuation.
 */
function normaliseQuestion(q: string): string {
  // Limit input length to prevent abuse, then normalise safely
  const trimmed = q.slice(0, 500).toLowerCase().trim();
  // Collapse whitespace: split on any whitespace and rejoin
  const collapsed = trimmed.split(/\s/).filter(Boolean).join(' ');
  // Strip trailing punctuation (single char check, no quantifier)
  return collapsed.replace(/[?.!]$/, '');
}

// ─── PUBLIC ─────────────────────────────────────────────────────────
// POST /api/chatbot/unmatched — log an unmatched question (fire-and-forget from mobile)
router.post('/unmatched', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length < 2) {
      return res.status(400).json({ message: 'Brak pytania' });
    }

    const normalised = normaliseQuestion(question);

    // Upsert: if the normalised question already exists, increment count
    const existing = await prisma.chatbotUnmatched.findFirst({
      where: { question: normalised },
    });

    if (existing) {
      await prisma.chatbotUnmatched.update({
        where: { id: existing.id },
        data: { count: { increment: 1 } },
      });
    } else {
      await prisma.chatbotUnmatched.create({
        data: { question: normalised },
      });
    }

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Error logging unmatched question:', error);
    res.status(500).json({ message: 'Błąd zapisu pytania' });
  }
});

// ─── ADMIN ──────────────────────────────────────────────────────────
// GET /api/chatbot/admin/unmatched — paginated list for admin panel
router.get('/admin/unmatched', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const search = (req.query.search as string) || '';
    const sortBy = (req.query.sortBy as string) || 'count';
    const sortDir = (req.query.sortDir as string) === 'asc' ? 'asc' : 'desc';

    const where: any = {};
    if (search) {
      where.question = { contains: search, mode: 'insensitive' };
    }

    const orderBy =
      sortBy === 'date' ? { createdAt: sortDir as 'asc' | 'desc' } : { count: sortDir as 'asc' | 'desc' };

    const [data, total] = await Promise.all([
      prisma.chatbotUnmatched.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.chatbotUnmatched.count({ where }),
    ]);

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching unmatched questions:', error);
    res.status(500).json({ message: 'Błąd pobierania pytań' });
  }
});

// DELETE /api/chatbot/admin/unmatched/:id — remove a resolved question
router.delete('/admin/unmatched/:id', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    await prisma.chatbotUnmatched.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting unmatched question:', error);
    res.status(500).json({ message: 'Błąd usuwania pytania' });
  }
});

// DELETE /api/chatbot/admin/unmatched — bulk delete all
router.delete('/admin/unmatched', authGuard, adminOnly, async (req: Request, res: Response) => {
  try {
    const result = await prisma.chatbotUnmatched.deleteMany({});
    res.json({ ok: true, deleted: result.count });
  } catch (error) {
    console.error('Error deleting all unmatched questions:', error);
    res.status(500).json({ message: 'Błąd usuwania pytań' });
  }
});

export default router;
