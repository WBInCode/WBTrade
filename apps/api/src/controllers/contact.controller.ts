/**
 * Contact Controller
 * Handles contact forms, product inquiries, and order support requests
 */

import { Request, Response } from 'express';
import { responsoService } from '../lib/responso';
import { emailQueue } from '../lib/queue';
import { z } from 'zod';

// Validation schemas
const generalContactSchema = z.object({
  name: z.string().min(2, 'Imię musi mieć minimum 2 znaki'),
  email: z.string().email('Nieprawidłowy adres email'),
  phone: z.string().optional(),
  subject: z.string().min(5, 'Temat musi mieć minimum 5 znaków'),
  message: z.string().min(10, 'Wiadomość musi mieć minimum 10 znaków'),
});

const productInquirySchema = z.object({
  name: z.string().min(2, 'Imię musi mieć minimum 2 znaki'),
  email: z.string().email('Nieprawidłowy adres email'),
  phone: z.string().optional(),
  productId: z.string(),
  productName: z.string(),
  message: z.string().min(10, 'Wiadomość musi mieć minimum 10 znaków'),
});

const orderHelpSchema = z.object({
  name: z.string().min(2, 'Imię musi mieć minimum 2 znaki'),
  email: z.string().email('Nieprawidłowy adres email'),
  phone: z.string().optional(),
  orderId: z.string(),
  issueType: z.enum(['delivery', 'payment', 'product', 'return', 'other']),
  message: z.string().min(10, 'Wiadomość musi mieć minimum 10 znaków'),
});

const supportRequestSchema = z.object({
  name: z.string().min(2, 'Imię musi mieć minimum 2 znaki'),
  email: z.string().email('Nieprawidłowy adres email'),
  phone: z.string().optional(),
  subject: z.string().min(5, 'Temat musi mieć minimum 5 znaków'),
  message: z.string().min(10, 'Wiadomość musi mieć minimum 10 znaków'),
  browserInfo: z.string().optional(),
  pageUrl: z.string().optional(),
});

/**
 * Send general contact message
 * POST /api/contact/general
 */
export async function sendGeneralContact(req: Request, res: Response) {
  try {
    const data = generalContactSchema.parse(req.body);

    // Send to Responso if enabled
    let ticketId: string | undefined;
    if (responsoService.isEnabled()) {
      try {
        const ticket = await responsoService.sendGeneralContact(data);
        ticketId = ticket?.id;
      } catch (error) {
        console.error('[Contact] Responso error:', error);
        // Continue with email fallback
      }
    }

    // Also send email notification to admin
    await emailQueue.add('send-email', {
      to: process.env.RESPONSO_CONTACT_EMAIL || process.env.ADMIN_EMAIL || 'kontakt@wbtrade.pl',
      template: 'contact-general',
      context: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
        ticketId,
      },
    });

    // Send confirmation to user
    await emailQueue.add('send-email', {
      to: data.email,
      template: 'contact-confirmation',
      context: {
        name: data.name,
        subject: data.subject,
        ticketId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Wiadomość została wysłana. Skontaktujemy się wkrótce.',
      ticketId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowe dane',
        errors: error.errors,
      });
    }

    console.error('[Contact] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas wysyłania wiadomości',
    });
  }
}

/**
 * Send product inquiry
 * POST /api/contact/product
 */
export async function sendProductInquiry(req: Request, res: Response) {
  try {
    const data = productInquirySchema.parse(req.body);

    // Send to Responso if enabled
    let ticketId: string | undefined;
    if (responsoService.isEnabled()) {
      try {
        const ticket = await responsoService.sendProductInquiry(data);
        ticketId = ticket?.id;
      } catch (error) {
        console.error('[Contact] Responso error:', error);
      }
    }

    // Send email notification
    await emailQueue.add('send-email', {
      to: process.env.RESPONSO_CONTACT_EMAIL || process.env.ADMIN_EMAIL || 'kontakt@wbtrade.pl',
      template: 'contact-product',
      context: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        productId: data.productId,
        productName: data.productName,
        message: data.message,
        ticketId,
      },
    });

    // Send confirmation to user
    await emailQueue.add('send-email', {
      to: data.email,
      template: 'contact-confirmation',
      context: {
        name: data.name,
        subject: `Zapytanie o produkt: ${data.productName}`,
        ticketId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Zapytanie zostało wysłane. Odpowiemy wkrótce.',
      ticketId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowe dane',
        errors: error.errors,
      });
    }

    console.error('[Contact] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas wysyłania zapytania',
    });
  }
}

/**
 * Send order help request
 * POST /api/contact/order
 */
export async function sendOrderHelp(req: Request, res: Response) {
  try {
    const data = orderHelpSchema.parse(req.body);

    // Send to Responso if enabled
    let ticketId: string | undefined;
    if (responsoService.isEnabled()) {
      try {
        const ticket = await responsoService.sendOrderHelp(data);
        ticketId = ticket?.id;
      } catch (error) {
        console.error('[Contact] Responso error:', error);
      }
    }

    // Send email notification
    await emailQueue.add('send-email', {
      to: process.env.RESPONSO_CONTACT_EMAIL || process.env.ADMIN_EMAIL || 'kontakt@wbtrade.pl',
      template: 'contact-order',
      context: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        orderId: data.orderId,
        issueType: data.issueType,
        message: data.message,
        ticketId,
      },
    });

    // Send confirmation to user
    await emailQueue.add('send-email', {
      to: data.email,
      template: 'contact-confirmation',
      context: {
        name: data.name,
        subject: `Pomoc z zamówieniem #${data.orderId}`,
        ticketId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Zgłoszenie zostało przyjęte. Pomożemy wkrótce.',
      ticketId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowe dane',
        errors: error.errors,
      });
    }

    console.error('[Contact] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas wysyłania zgłoszenia',
    });
  }
}

/**
 * Send technical support request
 * POST /api/contact/support
 */
export async function sendSupportRequest(req: Request, res: Response) {
  try {
    const data = supportRequestSchema.parse(req.body);

    // Send to Responso if enabled
    let ticketId: string | undefined;
    if (responsoService.isEnabled()) {
      try {
        const ticket = await responsoService.sendSupportRequest(data);
        ticketId = ticket?.id;
      } catch (error) {
        console.error('[Contact] Responso error:', error);
      }
    }

    // Send email notification
    await emailQueue.add('send-email', {
      to: process.env.RESPONSO_CONTACT_EMAIL || process.env.ADMIN_EMAIL || 'kontakt@wbtrade.pl',
      template: 'contact-support',
      context: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
        browserInfo: data.browserInfo,
        pageUrl: data.pageUrl,
        ticketId,
      },
    });

    // Send confirmation to user
    await emailQueue.add('send-email', {
      to: data.email,
      template: 'contact-confirmation',
      context: {
        name: data.name,
        subject: `Wsparcie techniczne: ${data.subject}`,
        ticketId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Zgłoszenie zostało przyjęte. Nasz zespół pomoże wkrótce.',
      ticketId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowe dane',
        errors: error.errors,
      });
    }

    console.error('[Contact] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas wysyłania zgłoszenia',
    });
  }
}

/**
 * Get user's contact tickets
 * GET /api/contact/tickets
 */
export async function getUserTickets(req: Request, res: Response) {
  try {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email jest wymagany',
      });
    }

    if (!responsoService.isEnabled()) {
      return res.status(200).json({
        success: true,
        tickets: [],
        message: 'System zgłoszeń jest wyłączony',
      });
    }

    const tickets = await responsoService.listUserTickets(email);

    res.status(200).json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error('[Contact] Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania zgłoszeń',
    });
  }
}

/**
 * Get ticket status
 * GET /api/contact/tickets/:ticketId
 */
export async function getTicketStatus(req: Request, res: Response) {
  try {
    const { ticketId } = req.params;

    if (!responsoService.isEnabled()) {
      return res.status(404).json({
        success: false,
        message: 'System zgłoszeń jest wyłączony',
      });
    }

    const ticket = await responsoService.getTicketStatus(ticketId);

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('[Contact] Error fetching ticket status:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania statusu zgłoszenia',
    });
  }
}
