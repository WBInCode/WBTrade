import { Request, Response } from 'express';
import { locationsService } from '../services/locations.service';
import { z } from 'zod';
import { LocationType } from '@prisma/client';

const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').max(20),
  type: z.enum(['WAREHOUSE', 'ZONE', 'SHELF', 'BIN']),
  parentId: z.string().optional()
});

const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).max(20).optional(),
  type: z.enum(['WAREHOUSE', 'ZONE', 'SHELF', 'BIN']).optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional()
});

export class LocationsController {
  /**
   * GET /api/locations
   */
  async getAll(req: Request, res: Response) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const locations = await locationsService.getAll(includeInactive);
      res.json(locations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ error: 'Failed to fetch locations' });
    }
  }

  /**
   * GET /api/locations/tree
   */
  async getTree(req: Request, res: Response) {
    try {
      const tree = await locationsService.getTree();
      res.json(tree);
    } catch (error) {
      console.error('Error fetching location tree:', error);
      res.status(500).json({ error: 'Failed to fetch location tree' });
    }
  }

  /**
   * GET /api/locations/type/:type
   */
  async getByType(req: Request, res: Response) {
    try {
      const type = req.params.type.toUpperCase() as LocationType;
      if (!['WAREHOUSE', 'ZONE', 'SHELF', 'BIN'].includes(type)) {
        return res.status(400).json({ error: 'Invalid location type' });
      }
      const locations = await locationsService.getByType(type);
      res.json(locations);
    } catch (error) {
      console.error('Error fetching locations by type:', error);
      res.status(500).json({ error: 'Failed to fetch locations' });
    }
  }

  /**
   * GET /api/locations/:id
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const location = await locationsService.getById(id);
      
      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }
      
      res.json(location);
    } catch (error) {
      console.error('Error fetching location:', error);
      res.status(500).json({ error: 'Failed to fetch location' });
    }
  }

  /**
   * POST /api/locations
   */
  async create(req: Request, res: Response) {
    try {
      const validationResult = createLocationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        });
      }
      
      const location = await locationsService.create(validationResult.data);
      res.status(201).json(location);
    } catch (error: any) {
      console.error('Error creating location:', error);
      if (error.message?.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create location' });
    }
  }

  /**
   * PUT /api/locations/:id
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validationResult = updateLocationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        });
      }
      
      const location = await locationsService.update(id, validationResult.data);
      res.json(location);
    } catch (error: any) {
      console.error('Error updating location:', error);
      if (error.message?.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update location' });
    }
  }

  /**
   * DELETE /api/locations/:id
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await locationsService.delete(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting location:', error);
      if (error.message?.includes('existing inventory')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to delete location' });
    }
  }
}

export const locationsController = new LocationsController();
