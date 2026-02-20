import { Router, Request, Response } from 'express';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.use(authGuard, adminOnly);

// ──────────────── STATS / DASHBOARD ────────────────

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [totalLocations, activeLocations, totalInventoryRows, lowStockCount, movements7d] =
      await Promise.all([
        prisma.location.count(),
        prisma.location.count({ where: { isActive: true } }),
        prisma.inventory.count(),
        prisma.inventory.count({ where: { quantity: { lte: prisma.inventory.fields?.minimum as any } } })
          .catch(() =>
            // fallback: raw query for quantity <= minimum
            prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM inventory WHERE quantity <= minimum`.then(
              (r) => Number(r[0].count)
            )
          ),
        prisma.stockMovement.count({
          where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
        }),
      ]);

    const totalStock = await prisma.inventory
      .aggregate({ _sum: { quantity: true }, _sum2: { reserved: true } } as any)
      .catch(() => null);

    const stockAgg = await prisma.inventory.aggregate({
      _sum: { quantity: true, reserved: true },
    });

    res.json({
      totalLocations,
      activeLocations,
      totalInventoryRows,
      lowStockCount,
      movements7d,
      totalQuantity: stockAgg._sum.quantity || 0,
      totalReserved: stockAgg._sum.reserved || 0,
    });
  } catch (error) {
    console.error('Warehouse stats error:', error);
    res.status(500).json({ error: 'Błąd pobierania statystyk magazynu' });
  }
});

// ──────────────── INVENTORY (stan magazynowy) ────────────────

router.get('/inventory', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const search = (req.query.search as string) || '';
    const locationId = req.query.locationId as string;
    const lowStock = req.query.lowStock === 'true';

    const where: any = {};

    if (locationId) where.locationId = locationId;
    if (lowStock) {
      // quantity <= minimum — use raw fallback if Prisma can't do column compare
    }

    if (search) {
      where.variant = {
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, slug: true, images: { take: 1, select: { url: true } } } },
            },
          },
          location: { select: { id: true, name: true, code: true, type: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventory.count({ where }),
    ]);

    // If lowStock requested, filter in JS (Prisma can't compare two columns)
    let filtered = items;
    if (lowStock) {
      filtered = items.filter((i) => i.quantity <= i.minimum);
    }

    res.json({
      items: lowStock ? filtered : items,
      pagination: {
        page,
        limit,
        total: lowStock ? filtered.length : total,
        totalPages: Math.ceil((lowStock ? filtered.length : total) / limit),
      },
    });
  } catch (error) {
    console.error('Inventory list error:', error);
    res.status(500).json({ error: 'Błąd pobierania stanów magazynowych' });
  }
});

// PUT /inventory/:id — aktualizuj ilości
router.put('/inventory/:id', async (req: Request, res: Response) => {
  try {
    const { quantity, reserved, minimum } = req.body;
    const updated = await prisma.inventory.update({
      where: { id: req.params.id },
      data: {
        ...(quantity !== undefined && { quantity: parseInt(quantity) }),
        ...(reserved !== undefined && { reserved: parseInt(reserved) }),
        ...(minimum !== undefined && { minimum: parseInt(minimum) }),
      },
      include: {
        variant: { include: { product: { select: { name: true } } } },
        location: { select: { name: true, code: true } },
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('Inventory update error:', error);
    res.status(500).json({ error: 'Błąd aktualizacji stanu' });
  }
});

// ──────────────── STOCK MOVEMENTS (ruchy magazynowe) ────────────────

router.get('/movements', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const type = req.query.type as string;
    const search = (req.query.search as string) || '';
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    const where: any = {};
    if (type) where.type = type;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { variant: { sku: { contains: search, mode: 'insensitive' } } },
        { variant: { product: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          variant: {
            include: {
              product: { select: { name: true } },
            },
          },
          fromLocation: { select: { name: true, code: true } },
          toLocation: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({
      movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Stock movements error:', error);
    res.status(500).json({ error: 'Błąd pobierania ruchów magazynowych' });
  }
});

// POST /movements — nowy ruch magazynowy
router.post('/movements', async (req: Request, res: Response) => {
  try {
    const { variantId, type, quantity, fromLocationId, toLocationId, reference, notes } = req.body;

    if (!variantId || !type || !quantity) {
      return res.status(400).json({ error: 'variantId, type i quantity są wymagane' });
    }

    const movement = await prisma.$transaction(async (tx) => {
      // Create the movement record
      const mov = await tx.stockMovement.create({
        data: {
          variantId,
          type,
          quantity: parseInt(quantity),
          fromLocationId: fromLocationId || null,
          toLocationId: toLocationId || null,
          reference: reference || null,
          notes: notes || null,
          createdBy: (req as any).user?.id || null,
        },
      });

      const qty = parseInt(quantity);

      // Update inventory based on movement type
      if (type === 'RECEIVE' && toLocationId) {
        await tx.inventory.upsert({
          where: { variantId_locationId: { variantId, locationId: toLocationId } },
          update: { quantity: { increment: qty } },
          create: { variantId, locationId: toLocationId, quantity: qty },
        });
      } else if (type === 'SHIP' && fromLocationId) {
        await tx.inventory.update({
          where: { variantId_locationId: { variantId, locationId: fromLocationId } },
          data: { quantity: { decrement: qty } },
        });
      } else if (type === 'TRANSFER' && fromLocationId && toLocationId) {
        await tx.inventory.update({
          where: { variantId_locationId: { variantId, locationId: fromLocationId } },
          data: { quantity: { decrement: qty } },
        });
        await tx.inventory.upsert({
          where: { variantId_locationId: { variantId, locationId: toLocationId } },
          update: { quantity: { increment: qty } },
          create: { variantId, locationId: toLocationId, quantity: qty },
        });
      } else if (type === 'ADJUST' && toLocationId) {
        await tx.inventory.upsert({
          where: { variantId_locationId: { variantId, locationId: toLocationId } },
          update: { quantity: qty },
          create: { variantId, locationId: toLocationId, quantity: qty },
        });
      } else if (type === 'RESERVE' && fromLocationId) {
        await tx.inventory.update({
          where: { variantId_locationId: { variantId, locationId: fromLocationId } },
          data: { reserved: { increment: qty } },
        });
      } else if (type === 'RELEASE' && fromLocationId) {
        await tx.inventory.update({
          where: { variantId_locationId: { variantId, locationId: fromLocationId } },
          data: { reserved: { decrement: qty } },
        });
      }

      return mov;
    });

    res.status(201).json(movement);
  } catch (error) {
    console.error('Create movement error:', error);
    res.status(500).json({ error: 'Błąd tworzenia ruchu magazynowego' });
  }
});

// ──────────────── LOCATIONS (lokalizacje) ────────────────

router.get('/locations', async (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const where: any = {};
    if (!includeInactive) where.isActive = true;

    const locations = await prisma.location.findMany({
      where,
      include: {
        _count: { select: { inventory: true, children: true } },
        parent: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(locations);
  } catch (error) {
    console.error('Locations error:', error);
    res.status(500).json({ error: 'Błąd pobierania lokalizacji' });
  }
});

router.post('/locations', async (req: Request, res: Response) => {
  try {
    const { name, code, type, parentId, isActive } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'name i code są wymagane' });
    }

    const existing = await prisma.location.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: 'Lokalizacja o tym kodzie już istnieje' });
    }

    const location = await prisma.location.create({
      data: {
        name,
        code,
        type: type || 'WAREHOUSE',
        parentId: parentId || null,
        isActive: isActive !== false,
      },
    });
    res.status(201).json(location);
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ error: 'Błąd tworzenia lokalizacji' });
  }
});

router.put('/locations/:id', async (req: Request, res: Response) => {
  try {
    const { name, code, type, parentId, isActive } = req.body;
    const location = await prisma.location.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(type && { type }),
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(location);
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Błąd aktualizacji lokalizacji' });
  }
});

router.delete('/locations/:id', async (req: Request, res: Response) => {
  try {
    // Check for inventory
    const invCount = await prisma.inventory.count({ where: { locationId: req.params.id } });
    if (invCount > 0) {
      return res.status(400).json({ error: 'Nie można usunąć lokalizacji z przypisanym stanem magazynowym' });
    }
    await prisma.location.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ error: 'Błąd usuwania lokalizacji' });
  }
});

export default router;
