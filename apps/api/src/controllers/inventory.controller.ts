import { Request, Response } from 'express';
import { inventoryService } from '../services/inventory.service';
import { z } from 'zod';

// Validation schemas
const stockQuerySchema = z.object({
  locationId: z.string().optional(),
});

const movementSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  quantity: z.number().positive('Quantity must be positive'),
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

const adjustSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  locationId: z.string().min(1, 'Location ID is required'),
  newQuantity: z.number().nonnegative('Quantity cannot be negative'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

const minimumSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  locationId: z.string().min(1, 'Location ID is required'),
  minimum: z.number().nonnegative('Minimum cannot be negative'),
});

/**
 * Get stock for a variant
 * GET /api/inventory/:variantId
 */
export async function getStock(req: Request, res: Response): Promise<void> {
  try {
    const { variantId } = req.params;
    const { locationId } = req.query;

    const stock = await inventoryService.getStock(
      variantId,
      locationId as string | undefined
    );

    res.status(200).json({ stock });
  } catch (error) {
    console.error('Error getting stock:', error);
    res.status(500).json({ message: 'Failed to get stock' });
  }
}

/**
 * Get total available stock for a variant
 * GET /api/inventory/:variantId/available
 */
export async function getAvailableStock(req: Request, res: Response): Promise<void> {
  try {
    const { variantId } = req.params;

    const available = await inventoryService.getTotalAvailableStock(variantId);

    res.status(200).json({ variantId, available });
  } catch (error) {
    console.error('Error getting available stock:', error);
    res.status(500).json({ message: 'Failed to get available stock' });
  }
}

/**
 * Reserve stock
 * POST /api/inventory/reserve
 */
export async function reserveStock(req: Request, res: Response): Promise<void> {
  try {
    const validation = movementSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    await inventoryService.reserve({
      ...validation.data,
      createdBy: req.user?.userId,
    });

    res.status(200).json({ message: 'Stock reserved successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('Error reserving stock:', error);
    res.status(500).json({ message: 'Failed to reserve stock' });
  }
}

/**
 * Release reserved stock
 * POST /api/inventory/release
 */
export async function releaseStock(req: Request, res: Response): Promise<void> {
  try {
    const validation = movementSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    await inventoryService.release({
      ...validation.data,
      createdBy: req.user?.userId,
    });

    res.status(200).json({ message: 'Stock released successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('Error releasing stock:', error);
    res.status(500).json({ message: 'Failed to release stock' });
  }
}

/**
 * Receive goods (PZ)
 * POST /api/inventory/receive
 */
export async function receiveGoods(req: Request, res: Response): Promise<void> {
  try {
    const validation = movementSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    if (!validation.data.toLocationId) {
      res.status(400).json({ message: 'Target location is required' });
      return;
    }

    await inventoryService.receive({
      ...validation.data,
      createdBy: req.user?.userId,
    });

    res.status(200).json({ message: 'Goods received successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('Error receiving goods:', error);
    res.status(500).json({ message: 'Failed to receive goods' });
  }
}

/**
 * Ship goods (WZ)
 * POST /api/inventory/ship
 */
export async function shipGoods(req: Request, res: Response): Promise<void> {
  try {
    const validation = movementSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    if (!validation.data.fromLocationId) {
      res.status(400).json({ message: 'Source location is required' });
      return;
    }

    await inventoryService.ship({
      ...validation.data,
      createdBy: req.user?.userId,
    });

    res.status(200).json({ message: 'Goods shipped successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('Error shipping goods:', error);
    res.status(500).json({ message: 'Failed to ship goods' });
  }
}

/**
 * Transfer stock between locations
 * POST /api/inventory/transfer
 */
export async function transferStock(req: Request, res: Response): Promise<void> {
  try {
    const validation = movementSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    if (!validation.data.fromLocationId || !validation.data.toLocationId) {
      res.status(400).json({ message: 'Both source and target locations are required' });
      return;
    }

    await inventoryService.transfer({
      ...validation.data,
      createdBy: req.user?.userId,
    });

    res.status(200).json({ message: 'Stock transferred successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('Error transferring stock:', error);
    res.status(500).json({ message: 'Failed to transfer stock' });
  }
}

/**
 * Adjust inventory
 * POST /api/inventory/adjust
 */
export async function adjustStock(req: Request, res: Response): Promise<void> {
  try {
    const validation = adjustSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    await inventoryService.adjust({
      variantId: validation.data.variantId,
      quantity: 0, // Not used in adjust
      toLocationId: validation.data.locationId,
      newQuantity: validation.data.newQuantity,
      reference: validation.data.reference,
      notes: validation.data.notes,
      createdBy: req.user?.userId,
    });

    res.status(200).json({ message: 'Stock adjusted successfully' });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('Error adjusting stock:', error);
    res.status(500).json({ message: 'Failed to adjust stock' });
  }
}

/**
 * Get low stock items
 * GET /api/inventory/low-stock
 */
export async function getLowStock(req: Request, res: Response): Promise<void> {
  try {
    const items = await inventoryService.getLowStock();

    res.status(200).json({ items, count: items.length });
  } catch (error) {
    console.error('Error getting low stock:', error);
    res.status(500).json({ message: 'Failed to get low stock items' });
  }
}

/**
 * Get movement history for a variant
 * GET /api/inventory/:variantId/movements
 */
export async function getMovementHistory(req: Request, res: Response): Promise<void> {
  try {
    const { variantId } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const result = await inventoryService.getMovementHistory(variantId, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting movement history:', error);
    res.status(500).json({ message: 'Failed to get movement history' });
  }
}

/**
 * Set minimum stock level
 * POST /api/inventory/minimum
 */
export async function setMinimumStock(req: Request, res: Response): Promise<void> {
  try {
    const validation = minimumSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    await inventoryService.setMinimumStock(
      validation.data.variantId,
      validation.data.locationId,
      validation.data.minimum
    );

    res.status(200).json({ message: 'Minimum stock level set successfully' });
  } catch (error) {
    console.error('Error setting minimum stock:', error);
    res.status(500).json({ message: 'Failed to set minimum stock' });
  }
}
