import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { addressesService } from '../services/addresses.service';

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Helper to sanitize text - removes potential XSS
 */
const sanitizeText = (text: string): string => {
  return text.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim();
};

/**
 * Name validation - only allows letters, spaces, hyphens, apostrophes
 */
const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .transform(sanitizeText)
  .refine(
    (name) => /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-']+$/.test(name),
    'Name contains invalid characters'
  );

/**
 * Street validation
 */
const streetSchema = z
  .string()
  .min(1, 'Street is required')
  .max(200, 'Street is too long')
  .transform(sanitizeText);

/**
 * City validation
 */
const citySchema = z
  .string()
  .min(1, 'City is required')
  .max(100, 'City is too long')
  .transform(sanitizeText)
  .refine(
    (city) => /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+$/.test(city),
    'City contains invalid characters'
  );

/**
 * Postal code validation (Polish format)
 */
const postalCodeSchema = z
  .string()
  .min(1, 'Postal code is required')
  .max(10, 'Postal code is too long')
  .refine(
    (code) => /^[0-9]{2}-[0-9]{3}$/.test(code) || /^[0-9]{5}$/.test(code),
    'Invalid postal code format (expected XX-XXX)'
  );

/**
 * Phone validation (Polish format)
 */
const phoneSchema = z
  .string()
  .optional()
  .nullable()
  .transform((val) => val || undefined)
  .refine(
    (phone) => {
      if (!phone) return true;
      // Remove spaces, parentheses, and dashes but keep + for country code
      const cleaned = phone.replace(/[\s()-]/g, '');
      // Accept formats: 123456789, +48123456789, 48123456789
      return /^(\+?48)?[0-9]{9}$/.test(cleaned);
    },
    'Invalid phone number format'
  );

/**
 * Country code validation
 */
const countrySchema = z
  .string()
  .length(2, 'Country must be 2-letter code')
  .toUpperCase()
  .optional()
  .default('PL');

/**
 * Address type validation (matches Prisma AddressType enum)
 */
const addressTypeSchema = z.enum(['SHIPPING', 'BILLING']).optional();

/**
 * Create address validation schema
 */
const createAddressSchema = z.object({
  label: z.string().max(50).optional().transform((val) => val ? sanitizeText(val) : undefined),
  type: addressTypeSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  companyName: z.string().max(200).optional().transform((val) => val ? sanitizeText(val) : undefined),
  nip: z.string().max(15).optional().transform((val) => val ? val.replace(/[^0-9]/g, '') : undefined),
  street: streetSchema,
  city: citySchema,
  postalCode: postalCodeSchema,
  country: countrySchema,
  phone: phoneSchema,
  isDefault: z.boolean().optional().default(false),
});

/**
 * Update address validation schema (all fields optional)
 */
const updateAddressSchema = createAddressSchema.partial();

/**
 * CUID validation helper (Prisma uses CUID by default)
 */
const isValidCUID = (id: string): boolean => {
  const cuidRegex = /^c[a-z0-9]{20,}$/i;
  return cuidRegex.test(id);
};

export const addressesController = {
  /**
   * GET /api/addresses - Get all user addresses
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
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

      if (!isValidCUID(id)) {
        return res.status(400).json({ error: 'Invalid address ID format' });
      }

      const address = await addressesService.getById(id, userId);
      
      if (!address) {
        return res.status(404).json({ message: 'Address not found' });
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
        return res.status(401).json({ message: 'Unauthorized' });
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
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const validation = createAddressSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          message: 'Validation error',
          errors: validation.error.flatten().fieldErrors,
        });
      }

      // Data is validated by Zod, safe to pass to service
      const address = await addressesService.create({
        userId,
        ...validation.data,
      } as any);

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
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!isValidCUID(id)) {
        return res.status(400).json({ error: 'Invalid address ID format' });
      }

      const validation = updateAddressSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation error',
          errors: validation.error.flatten().fieldErrors,
        });
      }

      // Data is validated by Zod, safe to pass to service
      const address = await addressesService.update(id, userId, validation.data as any);

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

      if (!isValidCUID(id)) {
        return res.status(400).json({ error: 'Invalid address ID format' });
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

      if (!isValidCUID(id)) {
        return res.status(400).json({ error: 'Invalid address ID format' });
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
