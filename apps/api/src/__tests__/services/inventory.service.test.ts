/**
 * Unit Tests for Inventory Service
 */

import { InventoryService } from '../../services/inventory.service';
import { prisma } from '../../db';

// Mock Prisma
jest.mock('../../db', () => ({
  prisma: {
    inventory: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      aggregate: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(prisma)),
  },
}));

describe('InventoryService', () => {
  let inventoryService: InventoryService;

  beforeEach(() => {
    inventoryService = new InventoryService();
    jest.clearAllMocks();
  });

  describe('getStock', () => {
    it('should return stock for a specific variant', async () => {
      const mockInventory = [
        {
          variantId: 'variant-1',
          locationId: 'loc-1',
          quantity: 100,
          reserved: 10,
          location: { id: 'loc-1', name: 'Warehouse A' },
          variant: { id: 'variant-1', product: { name: 'Test Product' } },
        },
      ];

      (prisma.inventory.findMany as jest.Mock).mockResolvedValue(mockInventory);

      const result = await inventoryService.getStock('variant-1');

      expect(result).toHaveLength(1);
      expect(result[0].available).toBe(90);
      expect(prisma.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { variantId: 'variant-1' },
        })
      );
    });

    it('should return stock for a specific location', async () => {
      const mockInventory = [
        {
          variantId: 'variant-1',
          locationId: 'loc-1',
          quantity: 50,
          reserved: 5,
          location: { id: 'loc-1', name: 'Warehouse A' },
          variant: { id: 'variant-1', product: { name: 'Test Product' } },
        },
      ];

      (prisma.inventory.findMany as jest.Mock).mockResolvedValue(mockInventory);

      const result = await inventoryService.getStock('variant-1', 'loc-1');

      expect(result).toHaveLength(1);
      expect(result[0].available).toBe(45);
    });
  });

  describe('getTotalAvailableStock', () => {
    it('should return total available stock across all locations', async () => {
      (prisma.inventory.aggregate as jest.Mock).mockResolvedValue({
        _sum: { quantity: 200, reserved: 30 },
      });

      const result = await inventoryService.getTotalAvailableStock('variant-1');

      expect(result).toBe(170);
    });

    it('should return 0 when no inventory exists', async () => {
      (prisma.inventory.aggregate as jest.Mock).mockResolvedValue({
        _sum: { quantity: null, reserved: null },
      });

      const result = await inventoryService.getTotalAvailableStock('variant-1');

      expect(result).toBe(0);
    });
  });

  describe('reserve', () => {
    it('should reserve stock successfully', async () => {
      const mockInventory = {
        id: 'inv-1',
        variantId: 'variant-1',
        locationId: 'loc-1',
        quantity: 100,
        reserved: 10,
      };

      (prisma.inventory.findFirst as jest.Mock).mockResolvedValue(mockInventory);
      (prisma.inventory.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.stockMovement.create as jest.Mock).mockResolvedValue({});

      await inventoryService.reserve({
        variantId: 'variant-1',
        quantity: 5,
        reference: 'order-123',
      });

      expect(prisma.inventory.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'inv-1',
            reserved: 10,
          },
          data: expect.objectContaining({
            reserved: { increment: 5 },
          }),
        })
      );
    });

    it('should throw error when insufficient stock', async () => {
      const mockInventory = {
        id: 'inv-1',
        variantId: 'variant-1',
        locationId: 'loc-1',
        quantity: 10,
        reserved: 8,
      };

      (prisma.inventory.findFirst as jest.Mock).mockResolvedValue(mockInventory);

      await expect(
        inventoryService.reserve({
          variantId: 'variant-1',
          quantity: 5,
        })
      ).rejects.toThrow('Insufficient stock');
    });

    it('should throw error when no inventory found', async () => {
      (prisma.inventory.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        inventoryService.reserve({
          variantId: 'variant-1',
          quantity: 5,
        })
      ).rejects.toThrow('No inventory found');
    });
  });

  describe('release', () => {
    it('should release reserved stock successfully', async () => {
      const mockInventory = {
        id: 'inv-1',
        variantId: 'variant-1',
        locationId: 'loc-1',
        quantity: 100,
        reserved: 20,
      };

      (prisma.inventory.findFirst as jest.Mock).mockResolvedValue(mockInventory);
      (prisma.inventory.update as jest.Mock).mockResolvedValue({});
      (prisma.stockMovement.create as jest.Mock).mockResolvedValue({});

      await inventoryService.release({
        variantId: 'variant-1',
        quantity: 5,
        reference: 'order-123-cancelled',
      });

      expect(prisma.inventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: { reserved: { decrement: 5 } },
        })
      );
    });

    it('should throw error when releasing more than reserved', async () => {
      const mockInventory = {
        id: 'inv-1',
        variantId: 'variant-1',
        locationId: 'loc-1',
        quantity: 100,
        reserved: 3,
      };

      (prisma.inventory.findFirst as jest.Mock).mockResolvedValue(mockInventory);

      await expect(
        inventoryService.release({
          variantId: 'variant-1',
          quantity: 10,
        })
      ).rejects.toThrow('Cannot release more than reserved');
    });
  });
});
