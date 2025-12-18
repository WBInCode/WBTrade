import { Request, Response, NextFunction } from 'express';
import { addressesService } from '../services/addresses.service';

export const addressesController = {
  /**
   * GET /api/addresses - Get all user addresses
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const addresses = await addressesService.getUserAddresses(userId);
      res.json(addresses);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/addresses/:id - Get single address
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const address = await addressesService.getById(id, userId);
      
      if (!address) {
        return res.status(404).json({ error: 'Address not found' });
      }

      res.json(address);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/addresses/default - Get default address
   */
  async getDefault(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const address = await addressesService.getDefaultAddress(userId);
      res.json(address);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/addresses - Create new address
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { label, type, firstName, lastName, street, city, postalCode, country, phone, isDefault } = req.body;

      // Validation
      if (!firstName || !lastName || !street || !city || !postalCode) {
        return res.status(400).json({ 
          error: 'Missing required fields: firstName, lastName, street, city, postalCode' 
        });
      }

      const address = await addressesService.create({
        userId,
        label,
        type,
        firstName,
        lastName,
        street,
        city,
        postalCode,
        country,
        phone,
        isDefault,
      });

      res.status(201).json(address);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/addresses/:id - Update address
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { label, type, firstName, lastName, street, city, postalCode, country, phone, isDefault } = req.body;

      const address = await addressesService.update(id, userId, {
        label,
        type,
        firstName,
        lastName,
        street,
        city,
        postalCode,
        country,
        phone,
        isDefault,
      });

      res.json(address);
    } catch (error: any) {
      if (error.message === 'Address not found') {
        return res.status(404).json({ error: 'Address not found' });
      }
      next(error);
    }
  },

  /**
   * DELETE /api/addresses/:id - Delete address
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await addressesService.delete(id, userId);
      res.json({ success: true, message: 'Address deleted' });
    } catch (error: any) {
      if (error.message === 'Address not found') {
        return res.status(404).json({ error: 'Address not found' });
      }
      next(error);
    }
  },

  /**
   * POST /api/addresses/:id/default - Set address as default
   */
  async setDefault(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const address = await addressesService.setDefault(id, userId);
      res.json(address);
    } catch (error: any) {
      if (error.message === 'Address not found') {
        return res.status(404).json({ error: 'Address not found' });
      }
      next(error);
    }
  },
};
