import { Router, Request, Response } from 'express';
import { emailService } from '../services/email.service';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// CONTACT ROUTES
// Obsługa formularzy kontaktowych i reklamacji
// ============================================

interface ComplaintRequest {
  subject: string;
  description: string;
  email: string;
  orderNumber: string; // Required now
  images?: string[]; // Base64 encoded images
}

/**
 * Helper function to check if order is eligible for complaint
 * Order must exist and be in DELIVERED or SHIPPED status
 */
async function checkComplaintEligibility(orderNumber: string): Promise<{
  eligible: boolean;
  reason?: string;
}> {
  // Sanitize input - only allow alphanumeric characters for order number/ID
  const sanitizedOrderNumber = orderNumber.replace(/[^a-zA-Z0-9-]/g, '');
  
  if (!sanitizedOrderNumber || sanitizedOrderNumber.length < 3) {
    return { eligible: false, reason: 'Nieprawidłowy format numeru zamówienia' };
  }

  // Try to find by orderNumber first, then by ID
  let order = await prisma.order.findUnique({
    where: { orderNumber: sanitizedOrderNumber },
    select: { id: true, status: true, orderNumber: true },
  });

  if (!order) {
    order = await prisma.order.findUnique({
      where: { id: sanitizedOrderNumber },
      select: { id: true, status: true, orderNumber: true },
    });
  }

  if (!order) {
    return { eligible: false, reason: 'Zamówienie nie zostało znalezione' };
  }

  // Only DELIVERED or SHIPPED orders can have complaints filed
  if (!['DELIVERED', 'SHIPPED'].includes(order.status)) {
    return { eligible: false, reason: 'Reklamację można zgłosić tylko dla zamówień dostarczonych lub w trakcie dostawy' };
  }

  // Already refunded
  if (order.status === 'REFUNDED') {
    return { eligible: false, reason: 'Zamówienie zostało już zwrócone' };
  }

  return { eligible: true };
}

/**
 * GET /api/contact/complaint-eligibility/:orderNumber
 * Sprawdza czy można złożyć reklamację dla danego zamówienia
 */
router.get('/complaint-eligibility/:orderNumber', async (req: Request, res: Response) => {
  try {
    let { orderNumber } = req.params;

    if (!orderNumber?.trim()) {
      return res.status(400).json({
        eligible: false,
        reason: 'Podaj numer zamówienia',
      });
    }

    // Remove # prefix if present (users often copy order number with #)
    orderNumber = orderNumber.trim();
    if (orderNumber.startsWith('#')) {
      orderNumber = orderNumber.slice(1);
    }

    const eligibility = await checkComplaintEligibility(orderNumber);
    return res.json(eligibility);
  } catch (error) {
    console.error('[Contact] Complaint eligibility check error:', error);
    return res.status(500).json({
      eligible: false,
      reason: 'Wystąpił błąd podczas sprawdzania zamówienia',
    });
  }
});

/**
 * POST /api/contact/complaint
 * Wysyła zgłoszenie reklamacyjne na email support@wb-partners.pl
 * Wymaga numeru zamówienia i sprawdza czy zamówienie zostało dostarczone
 */
router.post('/complaint', async (req: Request, res: Response) => {
  try {
    const { subject, description, email, orderNumber: rawOrderNumber, images = [] }: ComplaintRequest = req.body;

    // Validation - all fields are now required
    if (!subject?.trim() || !description?.trim() || !email?.trim() || !rawOrderNumber?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Wypełnij wszystkie wymagane pola (temat, opis, email, numer zamówienia)',
      });
    }

    // Remove # prefix if present (users often copy order number with #)
    let orderNumber = rawOrderNumber.trim();
    if (orderNumber.startsWith('#')) {
      orderNumber = orderNumber.slice(1);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Podaj prawidłowy adres email',
      });
    }

    // Check if order is eligible for complaint
    const eligibility = await checkComplaintEligibility(orderNumber.trim());
    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: eligibility.reason || 'Nie można złożyć reklamacji dla tego zamówienia',
      });
    }

    // Send complaint email
    const result = await emailService.sendComplaintEmail({
      customerEmail: email,
      subject: subject.trim(),
      description: description.trim(),
      orderNumber: orderNumber.trim(),
      images,
    });

    if (result.success) {
      console.log(`✅ [Contact] Complaint sent from ${email}, order: ${orderNumber}, subject: ${subject}`);
      return res.json({
        success: true,
        message: 'Zgłoszenie zostało wysłane. Skontaktujemy się z Tobą wkrótce.',
      });
    } else {
      console.error(`❌ [Contact] Failed to send complaint:`, result.error);
      return res.status(500).json({
        success: false,
        message: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie później.',
      });
    }
  } catch (error) {
    console.error('[Contact] Complaint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Wystąpił błąd serwera',
    });
  }
});

/**
 * POST /api/contact/general
 * Ogólny formularz kontaktowy
 */
router.post('/general', async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Wypełnij wszystkie wymagane pola',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Podaj prawidłowy adres email',
      });
    }

    const result = await emailService.sendContactFormEmail({
      name: name.trim(),
      email: email.trim(),
      subject: subject?.trim() || 'Wiadomość ze strony',
      message: message.trim(),
    });

    if (result.success) {
      console.log(`✅ [Contact] General contact from ${email}`);
      return res.json({
        success: true,
        message: 'Wiadomość została wysłana. Dziękujemy!',
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Nie udało się wysłać wiadomości',
      });
    }
  } catch (error) {
    console.error('[Contact] General contact error:', error);
    return res.status(500).json({
      success: false,
      message: 'Wystąpił błąd serwera',
    });
  }
});

export default router;
