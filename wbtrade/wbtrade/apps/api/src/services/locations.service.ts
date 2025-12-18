import { prisma } from '../db';
import { LocationType } from '@prisma/client';

interface CreateLocationData {
  name: string;
  code: string;
  type: LocationType;
  parentId?: string;
}

interface UpdateLocationData {
  name?: string;
  code?: string;
  type?: LocationType;
  parentId?: string | null;
  isActive?: boolean;
}

export class LocationsService {
  /**
   * Get all locations with hierarchy
   */
  async getAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    
    const locations = await prisma.location.findMany({
      where,
      include: {
        parent: true,
        children: true,
        _count: {
          select: { inventory: true }
        }
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ]
    });

    return locations;
  }

  /**
   * Get location by ID
   */
  async getById(id: string) {
    return prisma.location.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        inventory: {
          include: {
            variant: {
              include: { product: true }
            }
          }
        }
      }
    });
  }

  /**
   * Get location tree (hierarchical)
   */
  async getTree() {
    const locations = await prisma.location.findMany({
      where: { isActive: true, parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
                _count: { select: { inventory: true } }
              }
            },
            _count: { select: { inventory: true } }
          }
        },
        _count: { select: { inventory: true } }
      },
      orderBy: { name: 'asc' }
    });

    return locations;
  }

  /**
   * Create a new location
   */
  async create(data: CreateLocationData) {
    // Check for duplicate code
    const existing = await prisma.location.findUnique({
      where: { code: data.code }
    });

    if (existing) {
      throw new Error(`Location with code ${data.code} already exists`);
    }

    return prisma.location.create({
      data: {
        name: data.name,
        code: data.code,
        type: data.type,
        parentId: data.parentId
      },
      include: {
        parent: true
      }
    });
  }

  /**
   * Update a location
   */
  async update(id: string, data: UpdateLocationData) {
    // Check for duplicate code if changing
    if (data.code) {
      const existing = await prisma.location.findFirst({
        where: { code: data.code, NOT: { id } }
      });

      if (existing) {
        throw new Error(`Location with code ${data.code} already exists`);
      }
    }

    return prisma.location.update({
      where: { id },
      data,
      include: {
        parent: true
      }
    });
  }

  /**
   * Delete (deactivate) a location
   */
  async delete(id: string) {
    // Check if location has inventory
    const inventory = await prisma.inventory.findFirst({
      where: { locationId: id, quantity: { gt: 0 } }
    });

    if (inventory) {
      throw new Error('Cannot delete location with existing inventory. Move stock first.');
    }

    // Soft delete - just deactivate
    return prisma.location.update({
      where: { id },
      data: { isActive: false }
    });
  }

  /**
   * Get locations by type
   */
  async getByType(type: LocationType) {
    return prisma.location.findMany({
      where: { type, isActive: true },
      include: {
        parent: true,
        _count: { select: { inventory: true } }
      },
      orderBy: { name: 'asc' }
    });
  }
}

export const locationsService = new LocationsService();
