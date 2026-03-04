import { Router, Request, Response } from 'express';
import { authGuard } from '../middleware/auth.middleware';
import * as supportService from '../services/support.service';
import { emailService } from '../services/email.service';
import { prisma } from '../db';

const router = Router();

// All customer support routes require authentication
router.use(authGuard);

// Simple HTML sanitization — strip all tags (no external deps for Docker Alpine compatibility)
function sanitize(text: string): string {
  return text.trim().replace(/<[^>]*>/g, '');
}

// ─── GET /api/support/tickets ───
router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { page, limit, status, category } = req.query;

    const result = await supportService.getUserTickets(userId, {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
      status: status as any,
      category: category as any,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[Support] Error fetching tickets:', error);
    res.status(500).json({ error: 'Nie udało się pobrać wiadomości' });
  }
});

// ─── GET /api/support/unread-count ───
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const count = await supportService.getUnreadCount(userId);
    res.json({ count });
  } catch (error: any) {
    console.error('[Support] Error fetching unread count:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ─── POST /api/support/tickets ───
router.post('/tickets', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { subject, category, message, orderId } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Temat i wiadomość są wymagane' });
    }

    if (subject.length > 200) {
      return res.status(400).json({ error: 'Temat nie może przekraczać 200 znaków' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: 'Wiadomość nie może przekraczać 5000 znaków' });
    }

    const ticket = await supportService.createTicket({
      userId,
      orderId: orderId || undefined,
      subject: sanitize(subject),
      category: category || 'GENERAL',
      message: sanitize(message),
      senderRole: 'CUSTOMER',
    });

    // Send email notification to admin (fire-and-forget)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });
    emailService.sendSupportNewTicketToAdmin({
      ticketNumber: ticket.ticketNumber,
      subject: sanitize(subject),
      category: category || 'GENERAL',
      userName: user ? `${user.firstName} ${user.lastName}` : undefined,
      userEmail: user?.email,
      message: sanitize(message),
    }).catch(() => {});

    res.status(201).json(ticket);
  } catch (error: any) {
    console.error('[Support] Error creating ticket:', error);
    res.status(500).json({ error: 'Nie udało się utworzyć wiadomości' });
  }
});

// ─── GET /api/support/tickets/:id ───
router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const ticket = await supportService.getTicketDetail(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Nie znaleziono wiadomości' });
    }

    if (ticket.userId !== userId) {
      return res.status(403).json({ error: 'Brak dostępu' });
    }

    // Mark admin messages as read
    await supportService.markMessagesAsRead(ticket.id, 'CUSTOMER');

    res.json(ticket);
  } catch (error: any) {
    console.error('[Support] Error fetching ticket:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ─── POST /api/support/tickets/:id/messages ───
router.post('/tickets/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Treść wiadomości jest wymagana' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ error: 'Wiadomość nie może przekraczać 5000 znaków' });
    }

    // Verify ownership
    const ticket = await supportService.getTicketDetail(req.params.id);
    if (!ticket || ticket.userId !== userId) {
      return res.status(403).json({ error: 'Brak dostępu' });
    }

    if (ticket.status === 'CLOSED') {
      return res.status(400).json({ error: 'Nie można pisać w zamkniętym wątku. Wątek zostanie ponownie otwarty.' });
    }

    const message = await supportService.addMessage({
      ticketId: req.params.id,
      senderId: userId,
      senderRole: 'CUSTOMER',
      content: sanitize(content),
    });

    // Notify admin by email about customer reply (fire-and-forget)
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });
    emailService.sendSupportCustomerReplyToAdmin({
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      userName: user ? `${user.firstName} ${user.lastName}` : undefined,
      userEmail: user?.email,
      message: sanitize(content),
    }).catch(() => {});

    res.status(201).json(message);
  } catch (error: any) {
    console.error('[Support] Error adding message:', error);
    res.status(500).json({ error: 'Nie udało się wysłać wiadomości' });
  }
});

export default router;
