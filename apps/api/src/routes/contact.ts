import { Router, Request, Response } from 'express';
import { emailService } from '../services/email.service';

const router = Router();

// ============================================
// CONTACT ROUTES
// Obsługa formularzy kontaktowych i reklamacji
// ============================================

interface ComplaintRequest {
  subject: string;
  description: string;
  email: string;
  orderNumber?: string;
  images?: string[]; // Base64 encoded images
}

/**
 * POST /api/contact/complaint
 * Wysyła zgłoszenie reklamacyjne na email support@wb-partners.pl
 */
router.post('/complaint', async (req: Request, res: Response) => {
  try {
    const { subject, description, email, orderNumber, images = [] }: ComplaintRequest = req.body;

    // Validation
    if (!subject?.trim() || !description?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Wypełnij wszystkie wymagane pola (temat, opis, email)',
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Podaj prawidłowy adres email',
      });
    }

    // Send complaint email
    const result = await emailService.sendComplaintEmail({
      customerEmail: email,
      subject: subject.trim(),
      description: description.trim(),
      orderNumber: orderNumber?.trim(),
      images,
    });

    if (result.success) {
      console.log(`✅ [Contact] Complaint sent from ${email}, subject: ${subject}`);
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
