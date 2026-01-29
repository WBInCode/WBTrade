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
  .min(1, 'Imię/Nazwisko jest wymagane')
  .max(100, 'Imię/Nazwisko jest za długie')
  .transform(sanitizeText)
  .refine(
    (name) => /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-']+$/.test(name),
    'Imię/Nazwisko zawiera nieprawidłowe znaki'
  );

/**
 * Street validation
 */
const streetSchema = z
  .string()
  .min(1, 'Ulica jest wymagana')
  .max(200, 'Ulica jest za długa')
  .transform(sanitizeText);

/**
 * City validation
 */
const citySchema = z
  .string()
  .min(1, 'Miasto jest wymagane')
  .max(100, 'Miasto jest za długie')
  .transform(sanitizeText)
  .refine(
    (city) => /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]+$/.test(city),
    'Miasto zawiera nieprawidłowe znaki'
  );

/**
 * Postal code validation (Polish format)
 */
const postalCodeSchema = z
  .string()
  .min(1, 'Kod pocztowy jest wymagany')
  .max(10, 'Kod pocztowy jest za długi')
  .refine(
    (code) => /^[0-9]{2}-[0-9]{3}$/.test(code) || /^[0-9]{5}$/.test(code),
    'Nieprawidłowy format kodu pocztowego (oczekiwany XX-XXX)'
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
    'Nieprawidłowy format numeru telefonu'
  );

/**
 * Country code validation
 */
const countrySchema = z
  .string()
  .length(2, 'Kod kraju musi mieć 2 litery')
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
        return res.status(401).json({ message: 'Brak autoryzacji' });
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
        return res.status(401).json({ error: 'Brak autoryzacji' });
      }

      if (!isValidCUID(id)) {
        return res.status(400).json({ error: 'Nieprawidlowy format ID adresu' });
      }

      const address = await addressesService.getById(id, userId);
      
      if (!address) {
        return res.status(404).json({ message: 'Adres nie zostal znaleziony' });
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
        return res.status(401).json({ message: 'Brak autoryzacji' });
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
        return res.status(401).json({ message: 'Brak autoryzacji' });
      }

      const validation = createAddressSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          message: 'Blad walidacji',
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
        return res.status(401).json({ message: 'Brak autoryzacji' });
      }

      if (!isValidCUID(id)) {
        return res.status(400).json({ error: 'Nieprawidlowy format ID adresu' });
      }

      const validation = updateAddressSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: 'Blad walidacji',
          errors: validation.error.flatten().fieldErrors,
        });
      }

      // Data is validated by Zod, safe to pass to service
      const address = await addressesService.update(id, userId, validation.data as any);

      res.json(address);
    } catch (error: any) {
      if (error.message === 'Adres nie zostal znaleziony') {
        return res.status(404).json({ error: 'Adres nie zostal znaleziony' });
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
        return res.status(401).json({ error: 'Brak autoryzacji' });
      }

      if (!isValidCUID(id)) {
        return res.status(400).json({ error: 'Nieprawidlowy format ID adresu' });
      }

      await addressesService.delete(id, userId);
      res.json({ success: true, message: 'Adres zostal usuniety' });
    } catch (error: any) {
      if (error.message === 'Adres nie zostal znaleziony') {
        return res.status(404).json({ error: 'Adres nie zostal znaleziony' });
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
        return res.status(401).json({ error: 'Brak autoryzacji' });
      }

      if (!isValidCUID(id)) {
        return res.status(400).json({ error: 'Nieprawidlowy format ID adresu' });
      }

      const address = await addressesService.setDefault(id, userId);
      res.json(address);
    } catch (error: any) {
      if (error.message === 'Adres nie zostal znaleziony') {
        return res.status(404).json({ error: 'Adres nie zostal znaleziony' });
      }
      next(error);
    }
  },
};
