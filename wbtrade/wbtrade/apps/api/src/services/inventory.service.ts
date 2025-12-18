import { prisma } from '../db';
import { StockMovementType } from '@prisma/client';

interface StockResult {
  variantId: string;
  locationId: string;
  quantity: number;
  reserved: number;
  available: number;
}

interface MovementData {
  variantId: string;
  quantity: number;
  fromLocationId?: string;
  toLocationId?: string;
  reference?: string;
  notes?: string;
  createdBy?: string;
}

interface LowStockItem {
  variantId: string;
  variantName: string;
  productName: string;
  sku: string;
  locationId: string;
  locationName: string;
  quantity: number;
  minimum: number;
  reserved: number;
  available: number;
}

export class InventoryService {
  /**
   * Get stock for a specific variant (across all locations or specific location)
   */
  async getStock(variantId: string, locationId?: string): Promise<StockResult[]> {
    const where = locationId
      ? { variantId, locationId }
      : { variantId };

    const inventory = await prisma.inventory.findMany({
      where,
      include: {
        location: true,
        variant: {
          include: { product: true },
        },
      },
    });

    return inventory.map((inv) => ({
      variantId: inv.variantId,
      locationId: inv.locationId,
      quantity: inv.quantity,
      reserved: inv.reserved,
      available: inv.quantity - inv.reserved,
    }));
  }

  /**
   * Get total available stock for a variant (sum across all locations)
   */
  async getTotalAvailableStock(variantId: string): Promise<number> {
    const result = await prisma.inventory.aggregate({
      where: { variantId },
      _sum: {
        quantity: true,
        reserved: true,
      },
    });

    const quantity = result._sum.quantity || 0;
    const reserved = result._sum.reserved || 0;
    return quantity - reserved;
  }

  /**
   * Reserve stock for an order
   */
  async reserve(data: MovementData): Promise<void> {
    const { variantId, quantity, toLocationId, reference, notes, createdBy } = data;

    await prisma.$transaction(async (tx) => {
      // Find inventory with enough available stock
      const inventory = await tx.inventory.findFirst({
        where: {
          variantId,
          ...(toLocationId && { locationId: toLocationId }),
        },
        orderBy: { quantity: 'desc' }, // Prefer location with most stock
      });

      if (!inventory) {
        throw new Error(`No inventory found for variant ${variantId}`);
      }

      const available = inventory.quantity - inventory.reserved;
      if (available < quantity) {
        throw new Error(`Insufficient stock. Available: ${available}, Requested: ${quantity}`);
      }

      // Update reserved quantity
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { reserved: { increment: quantity } },
      });

      // Create stock movement record
      await tx.stockMovement.create({
        data: {
          variantId,
          type: StockMovementType.RESERVE,
          quantity: -quantity, // Negative to indicate reservation
          toLocationId: inventory.locationId,
          reference,
          notes,
          createdBy,
        },
      });
    });
  }

  /**
   * Release reserved stock (e.g., order cancelled)
   */
  async release(data: MovementData): Promise<void> {
    const { variantId, quantity, fromLocationId, reference, notes, createdBy } = data;

    await prisma.$transaction(async (tx) => {
      let inventory;
      
      if (fromLocationId) {
        inventory = await tx.inventory.findUnique({
          where: { variantId_locationId: { variantId, locationId: fromLocationId } }
        });
      } else {
        inventory = await tx.inventory.findFirst({ 
          where: { variantId, reserved: { gte: quantity } } 
        });
      }

      if (!inventory) {
        throw new Error(`No inventory found with reserved stock for variant ${variantId}`);
      }

      if (inventory.reserved < quantity) {
        throw new Error(`Cannot release more than reserved. Reserved: ${inventory.reserved}`);
      }

      // Decrease reserved quantity
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { reserved: { decrement: quantity } },
      });

      // Create stock movement record
      await tx.stockMovement.create({
        data: {
          variantId,
          type: StockMovementType.RELEASE,
          quantity, // Positive to indicate release
          fromLocationId: inventory.locationId,
          reference,
          notes,
          createdBy,
        },
      });
    });
  }

  /**
   * Receive goods into inventory (PZ - Przyjęcie Zewnętrzne)
   */
  async receive(data: MovementData): Promise<void> {
    const { variantId, quantity, toLocationId, reference, notes, createdBy } = data;

    if (!toLocationId) {
      throw new Error('Target location is required for receiving goods');
    }

    await prisma.$transaction(async (tx) => {
      // Upsert inventory record
      await tx.inventory.upsert({
        where: {
          variantId_locationId: { variantId, locationId: toLocationId },
        },
        update: {
          quantity: { increment: quantity },
        },
        create: {
          variantId,
          locationId: toLocationId,
          quantity,
          reserved: 0,
          minimum: 0,
        },
      });

      // Create stock movement record
      await tx.stockMovement.create({
        data: {
          variantId,
          type: StockMovementType.RECEIVE,
          quantity,
          toLocationId,
          reference,
          notes,
          createdBy,
        },
      });
    });
  }

  /**
   * Ship goods out of inventory (WZ - Wydanie Zewnętrzne)
   */
  async ship(data: MovementData): Promise<void> {
    const { variantId, quantity, fromLocationId, reference, notes, createdBy } = data;

    if (!fromLocationId) {
      throw new Error('Source location is required for shipping goods');
    }

    await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: {
          variantId_locationId: { variantId, locationId: fromLocationId },
        },
      });

      if (!inventory) {
        throw new Error(`No inventory found at location ${fromLocationId}`);
      }

      // For shipping, we decrease both quantity and reserved (since it was reserved for order)
      if (inventory.quantity < quantity) {
        throw new Error(`Insufficient stock. Available: ${inventory.quantity}`);
      }

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: { decrement: quantity },
          reserved: { decrement: Math.min(inventory.reserved, quantity) },
        },
      });

      // Create stock movement record
      await tx.stockMovement.create({
        data: {
          variantId,
          type: StockMovementType.SHIP,
          quantity: -quantity,
          fromLocationId,
          reference,
          notes,
          createdBy,
        },
      });
    });
  }

  /**
   * Transfer stock between locations (MM - Przesunięcie Międzymagazynowe)
   */
  async transfer(data: MovementData): Promise<void> {
    const { variantId, quantity, fromLocationId, toLocationId, reference, notes, createdBy } = data;

    if (!fromLocationId || !toLocationId) {
      throw new Error('Both source and target locations are required for transfer');
    }

    if (fromLocationId === toLocationId) {
      throw new Error('Source and target locations must be different');
    }

    await prisma.$transaction(async (tx) => {
      // Check source inventory
      const sourceInventory = await tx.inventory.findUnique({
        where: {
          variantId_locationId: { variantId, locationId: fromLocationId },
        },
      });

      if (!sourceInventory) {
        throw new Error(`No inventory found at source location ${fromLocationId}`);
      }

      const available = sourceInventory.quantity - sourceInventory.reserved;
      if (available < quantity) {
        throw new Error(`Insufficient available stock. Available: ${available}`);
      }

      // Decrease source
      await tx.inventory.update({
        where: { id: sourceInventory.id },
        data: { quantity: { decrement: quantity } },
      });

      // Increase target (upsert)
      await tx.inventory.upsert({
        where: {
          variantId_locationId: { variantId, locationId: toLocationId },
        },
        update: {
          quantity: { increment: quantity },
        },
        create: {
          variantId,
          locationId: toLocationId,
          quantity,
          reserved: 0,
          minimum: 0,
        },
      });

      // Create stock movement record
      await tx.stockMovement.create({
        data: {
          variantId,
          type: StockMovementType.TRANSFER,
          quantity,
          fromLocationId,
          toLocationId,
          reference,
          notes,
          createdBy,
        },
      });
    });
  }

  /**
   * Adjust inventory (for corrections, inventory counts)
   */
  async adjust(data: MovementData & { newQuantity: number }): Promise<void> {
    const { variantId, toLocationId, newQuantity, reference, notes, createdBy } = data;

    if (!toLocationId) {
      throw new Error('Location is required for adjustment');
    }

    await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: {
          variantId_locationId: { variantId, locationId: toLocationId },
        },
      });

      const oldQuantity = inventory?.quantity || 0;
      const difference = newQuantity - oldQuantity;

      if (inventory) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: newQuantity },
        });
      } else {
        await tx.inventory.create({
          data: {
            variantId,
            locationId: toLocationId,
            quantity: newQuantity,
            reserved: 0,
            minimum: 0,
          },
        });
      }

      // Create stock movement record
      await tx.stockMovement.create({
        data: {
          variantId,
          type: StockMovementType.ADJUST,
          quantity: difference,
          toLocationId,
          reference,
          notes: notes || `Adjusted from ${oldQuantity} to ${newQuantity}`,
          createdBy,
        },
      });
    });
  }

  /**
   * Get products with low stock (below minimum level)
   */
  async getLowStock(): Promise<LowStockItem[]> {
    const lowStockItems = await prisma.inventory.findMany({
      where: {
        OR: [
          // Quantity below minimum
          {
            quantity: {
              lte: prisma.inventory.fields.minimum,
            },
          },
        ],
      },
      include: {
        variant: {
          include: { product: true },
        },
        location: true,
      },
    });

    // Filter in JS because Prisma doesn't support comparing columns directly
    const filtered = lowStockItems.filter(
      (item) => item.quantity <= item.minimum || item.quantity - item.reserved <= item.minimum
    );

    return filtered.map((item) => ({
      variantId: item.variantId,
      variantName: item.variant.name,
      productName: item.variant.product.name,
      sku: item.variant.sku,
      locationId: item.locationId,
      locationName: item.location.name,
      quantity: item.quantity,
      minimum: item.minimum,
      reserved: item.reserved,
      available: item.quantity - item.reserved,
    }));
  }

  /**
   * Get stock movement history for a variant
   */
  async getMovementHistory(
    variantId: string,
    options: { page?: number; limit?: number } = {}
  ) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { variantId },
        include: {
          fromLocation: true,
          toLocation: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where: { variantId } }),
    ]);

    return {
      movements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Set minimum stock level for alert
   */
  async setMinimumStock(
    variantId: string,
    locationId: string,
    minimum: number
  ): Promise<void> {
    await prisma.inventory.upsert({
      where: {
        variantId_locationId: { variantId, locationId },
      },
      update: { minimum },
      create: {
        variantId,
        locationId,
        quantity: 0,
        reserved: 0,
        minimum,
      },
    });
  }

  /**
   * Get all inventory with filters
   */
  async getAllInventory(options: {
    page?: number;
    limit?: number;
    search?: string;
    locationId?: string;
    filter?: 'all' | 'low' | 'out';
  }) {
    const { page = 1, limit = 50, search, locationId, filter = 'all' } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (locationId) {
      where.locationId = locationId;
    }

    if (filter === 'low') {
      where.AND = [
        { quantity: { gt: 0 } },
        {
          OR: [
            { minimum: { gt: 0 }, quantity: { lte: prisma.inventory.fields.minimum } },
            { quantity: { lte: 5 } }
          ]
        }
      ];
    } else if (filter === 'out') {
      where.quantity = { lte: 0 };
    }

    // Count total
    const [inventory, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          variant: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                }
              }
            }
          },
          location: true
        },
        orderBy: [
          { quantity: 'asc' },
          { location: { name: 'asc' } }
        ],
        skip,
        take: limit
      }),
      prisma.inventory.count({ where })
    ]);

    // If search term, filter client-side for variant SKU or product name
    let filteredInventory = inventory;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredInventory = inventory.filter(inv => 
        inv.variant.sku.toLowerCase().includes(searchLower) ||
        inv.variant.product.name.toLowerCase().includes(searchLower) ||
        inv.variant.name?.toLowerCase().includes(searchLower)
      );
    }

    return {
      data: filteredInventory.map(inv => ({
        id: inv.id,
        variantId: inv.variantId,
        locationId: inv.locationId,
        quantity: inv.quantity,
        reserved: inv.reserved,
        minimum: inv.minimum,
        available: inv.quantity - inv.reserved,
        variant: {
          id: inv.variant.id,
          sku: inv.variant.sku,
          name: inv.variant.name,
          price: inv.variant.price
        },
        product: {
          id: inv.variant.product.id,
          name: inv.variant.product.name,
          image: inv.variant.product.images?.[0] || null
        },
        location: {
          id: inv.location.id,
          name: inv.location.name,
          code: inv.location.code,
          type: inv.location.type
        }
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get all variants for selection (for PZ/WZ forms)
   */
  async getVariantsForInventory(search?: string) {
    const where: any = {};
    
    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const variants = await prisma.productVariant.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true
          }
        },
        inventory: {
          include: { location: true }
        }
      },
      take: 50,
      orderBy: { sku: 'asc' }
    });

    return variants.map(v => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      price: v.price,
      product: {
        id: v.product.id,
        name: v.product.name,
        image: v.product.images?.[0]
      },
      totalStock: v.inventory.reduce((sum, inv) => sum + inv.quantity - inv.reserved, 0),
      locations: v.inventory.map(inv => ({
        locationId: inv.locationId,
        locationName: inv.location.name,
        locationCode: inv.location.code,
        quantity: inv.quantity,
        reserved: inv.reserved,
        available: inv.quantity - inv.reserved
      }))
    }));
  }
}

// Export singleton instance
export const inventoryService = new InventoryService();
