/**
 * Admin Email Templates CRUD Routes
 *
 * GET    /api/admin/email-templates              — List templates (with filters)
 * GET    /api/admin/email-templates/placeholders  — Available placeholders
 * GET    /api/admin/email-templates/:id            — Get single template
 * POST   /api/admin/email-templates                — Create template
 * PUT    /api/admin/email-templates/:id            — Update template
 * DELETE /api/admin/email-templates/:id            — Delete template
 */

import { Router, Request, Response } from 'express';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import { prisma } from '../db';

const router = Router();

router.use(authGuard, adminOnly);

// Available placeholders for templates
const PLACEHOLDERS = [
  { key: '{orderNumber}', description: 'Numer zamówienia klienta', example: 'WB-20260414-001' },
  { key: '{customerName}', description: 'Imię i nazwisko klienta', example: 'Jan Kowalski' },
  { key: '{discountCode}', description: 'Wygenerowany kod rabatowy (tylko gdy szablon ma rabat)', example: '10-K3BN7WHP' },
  { key: '{discountPercent}', description: 'Procent zniżki z szablonu', example: '10' },
  { key: '{discountExpiry}', description: 'Data ważności kodu rabatowego', example: '14.05.2026' },
];

// ────────────────────────────────────────────────────────
// GET /api/admin/email-templates
// ────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const isActive = req.query.isActive as string | undefined;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    res.json({ templates });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania szablonów' });
  }
});

// ────────────────────────────────────────────────────────
// GET /api/admin/email-templates/placeholders
// ────────────────────────────────────────────────────────
router.get('/placeholders', (_req: Request, res: Response) => {
  res.json({ placeholders: PLACEHOLDERS });
});

// ────────────────────────────────────────────────────────
// GET /api/admin/email-templates/:id
// ────────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: req.params.id },
    });

    if (!template) {
      res.status(404).json({ message: 'Szablon nie znaleziony' });
      return;
    }

    res.json({ template });
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania szablonu' });
  }
});

// ────────────────────────────────────────────────────────
// POST /api/admin/email-templates
// ────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { slug, name, description, subject, content, category, includesDiscount, discountPercent, discountValidDays, isActive, sortOrder } = req.body;

    if (!slug || !name || !subject || !content) {
      res.status(400).json({ message: 'Wymagane pola: slug, name, subject, content' });
      return;
    }

    // Validate slug format (lowercase, dashes, alphanumeric)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      res.status(400).json({ message: 'Slug może zawierać tylko małe litery, cyfry i myślniki' });
      return;
    }

    // Check slug uniqueness
    const existing = await prisma.emailTemplate.findUnique({ where: { slug } });
    if (existing) {
      res.status(400).json({ message: `Szablon o slug "${slug}" już istnieje` });
      return;
    }

    // Validate discount fields
    if (includesDiscount) {
      if (!discountPercent || discountPercent < 1 || discountPercent > 100) {
        res.status(400).json({ message: 'discountPercent musi być między 1 a 100' });
        return;
      }
      if (!discountValidDays || discountValidDays < 1 || discountValidDays > 365) {
        res.status(400).json({ message: 'discountValidDays musi być między 1 a 365' });
        return;
      }
    }

    const template = await prisma.emailTemplate.create({
      data: {
        slug,
        name,
        description: description || null,
        subject,
        content,
        category: category || 'DELIVERY_DELAY',
        includesDiscount: includesDiscount || false,
        discountPercent: includesDiscount ? discountPercent : null,
        discountValidDays: includesDiscount ? discountValidDays : null,
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
      },
    });

    res.status(201).json({ template });
  } catch (error) {
    console.error('Error creating email template:', error);
    res.status(500).json({ message: 'Błąd podczas tworzenia szablonu' });
  }
});

// ────────────────────────────────────────────────────────
// PUT /api/admin/email-templates/:id
// ────────────────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, subject, content, category, includesDiscount, discountPercent, discountValidDays, isActive, sortOrder } = req.body;

    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Szablon nie znaleziony' });
      return;
    }

    // Validate discount fields
    if (includesDiscount) {
      if (!discountPercent || discountPercent < 1 || discountPercent > 100) {
        res.status(400).json({ message: 'discountPercent musi być między 1 a 100' });
        return;
      }
      if (!discountValidDays || discountValidDays < 1 || discountValidDays > 365) {
        res.status(400).json({ message: 'discountValidDays musi być między 1 a 365' });
        return;
      }
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        description: description !== undefined ? description : existing.description,
        subject: subject ?? existing.subject,
        content: content ?? existing.content,
        category: category ?? existing.category,
        includesDiscount: includesDiscount !== undefined ? includesDiscount : existing.includesDiscount,
        discountPercent: includesDiscount ? discountPercent : null,
        discountValidDays: includesDiscount ? discountValidDays : null,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
      },
    });

    res.json({ template });
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({ message: 'Błąd podczas aktualizacji szablonu' });
  }
});

// ────────────────────────────────────────────────────────
// DELETE /api/admin/email-templates/:id
// ────────────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Szablon nie znaleziony' });
      return;
    }

    await prisma.emailTemplate.delete({ where: { id } });

    res.json({ success: true, message: 'Szablon usunięty' });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ message: 'Błąd podczas usuwania szablonu' });
  }
});

export default router;
