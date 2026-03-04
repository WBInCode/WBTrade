import { Router, Request, Response } from 'express';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import * as supportService from '../services/support.service';
import { emailService } from '../services/email.service';
import DOMPurify from 'isomorphic-dompurify';

const router = Router();

// All admin support routes require admin auth
router.use(authGuard, adminOnly);

function sanitize(text: string): string {
  return DOMPurify.sanitize(text.trim(), { ALLOWED_TAGS: [] });
}

// ─── GET /api/admin/support/stats ───
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await supportService.getAdminStats();
    res.json(stats);
  } catch (error: any) {
    console.error('[AdminSupport] Error fetching stats:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ─── GET /api/admin/support/unread-count ───
router.get('/unread-count', async (_req: Request, res: Response) => {
  try {
    const count = await supportService.getAdminUnreadCount();
    res.json({ count });
  } catch (error: any) {
    console.error('[AdminSupport] Error fetching unread count:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ─── GET /api/admin/support/tickets ───
router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const { page, limit, status, category, search, userId, orderId } = req.query;

    const result = await supportService.getAdminTickets({
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      status: status as any,
      category: category as any,
      search: search as string,
      userId: userId as string,
      orderId: orderId as string,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[AdminSupport] Error fetching tickets:', error);
    res.status(500).json({ error: 'Nie udało się pobrać ticketów' });
  }
});

// ─── GET /api/admin/support/tickets/by-order/:orderId ───
router.get('/tickets/by-order/:orderId', async (req: Request, res: Response) => {
  try {
    const tickets = await supportService.getTicketsByOrder(req.params.orderId);
    res.json(tickets);
  } catch (error: any) {
    console.error('[AdminSupport] Error fetching order tickets:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ─── GET /api/admin/support/tickets/:id ───
router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await supportService.getTicketDetail(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Nie znaleziono ticketa' });
    }

    // Mark customer messages as read
    await supportService.markMessagesAsRead(ticket.id, 'ADMIN');

    res.json(ticket);
  } catch (error: any) {
    console.error('[AdminSupport] Error fetching ticket:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// ─── POST /api/admin/support/tickets/create ───
router.post('/tickets/create', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.userId;
    const { userId, guestEmail, orderId, subject, category, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Temat i wiadomość są wymagane' });
    }

    if (!userId && !guestEmail) {
      return res.status(400).json({ error: 'Wymagany jest userId lub guestEmail' });
    }

    const ticket = await supportService.createTicket({
      userId: userId || undefined,
      guestEmail: guestEmail || undefined,
      orderId: orderId || undefined,
      subject: sanitize(subject),
      category: category || 'GENERAL',
      message: sanitize(message),
      senderRole: 'ADMIN',
    });

    res.status(201).json(ticket);
  } catch (error: any) {
    console.error('[AdminSupport] Error creating ticket:', error);
    res.status(500).json({ error: 'Nie udało się utworzyć ticketa' });
  }
});

// ─── POST /api/admin/support/tickets/bulk-create ───
router.post('/tickets/bulk-create', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.userId;
    const { orderIds, subject, message } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Wymagana jest lista zamówień' });
    }

    if (!subject || !message) {
      return res.status(400).json({ error: 'Temat i wiadomość są wymagane' });
    }

    const results = await supportService.bulkCreateTickets({
      orderIds,
      subject: sanitize(subject),
      message: sanitize(message),
      adminId,
    });

    const successCount = results.filter((r: any) => r.success).length;
    const failCount = results.filter((r: any) => !r.success).length;

    res.status(201).json({
      message: `Utworzono ${successCount} ticketów${failCount > 0 ? `, ${failCount} błędów` : ''}`,
      results,
    });
  } catch (error: any) {
    console.error('[AdminSupport] Error bulk creating tickets:', error);
    res.status(500).json({ error: 'Nie udało się utworzyć ticketów' });
  }
});

// ─── POST /api/admin/support/tickets/:id/messages ───
router.post('/tickets/:id/messages', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.userId;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Treść wiadomości jest wymagana' });
    }

    const ticket = await supportService.getTicketDetail(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Nie znaleziono ticketa' });
    }

    const message = await supportService.addMessage({
      ticketId: req.params.id,
      senderId: adminId,
      senderRole: 'ADMIN',
      content: sanitize(content),
    });

    // Send email notification to customer (fire-and-forget)
    if (ticket.user?.email) {
      emailService.sendSupportReplyToCustomer({
        to: ticket.user.email,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        customerName: ticket.user.firstName || 'Kliencie',
      }).catch(() => {});
    } else if (ticket.guestEmail) {
      emailService.sendSupportReplyToCustomer({
        to: ticket.guestEmail,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        customerName: 'Kliencie',
      }).catch(() => {});
    }

    res.status(201).json(message);
  } catch (error: any) {
    console.error('[AdminSupport] Error adding message:', error);
    res.status(500).json({ error: 'Nie udało się wysłać wiadomości' });
  }
});

// ─── PATCH /api/admin/support/tickets/:id/status ───
router.patch('/tickets/:id/status', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.userId;
    const { status } = req.body;

    if (!['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(status)) {
      return res.status(400).json({ error: 'Nieprawidłowy status' });
    }

    const ticket = await supportService.updateTicketStatus(req.params.id, status, adminId);

    // Add system message about status change
    const statusLabels: Record<string, string> = {
      OPEN: 'Otwarte',
      IN_PROGRESS: 'W trakcie',
      CLOSED: 'Zamknięte',
    };

    await supportService.addMessage({
      ticketId: req.params.id,
      senderId: adminId,
      senderRole: 'SYSTEM',
      content: `Status zmieniony na: ${statusLabels[status]}`,
    });

    res.json(ticket);
  } catch (error: any) {
    console.error('[AdminSupport] Error updating status:', error);
    res.status(500).json({ error: 'Nie udało się zmienić statusu' });
  }
});

export default router;
