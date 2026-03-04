import { prisma } from '../db';
import { TicketCategory, TicketStatus, TicketPriority, MessageSender } from '@prisma/client';

// ─── Ticket Number Generator ───
async function generateTicketNumber(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const count = await prisma.supportTicket.count({
    where: {
      createdAt: { gte: todayStart, lt: todayEnd },
    },
  });

  const seq = String(count + 1).padStart(3, '0');
  return `SUP-${dateStr}-${seq}`;
}

// ─── Create Ticket ───
export async function createTicket(data: {
  userId?: string;
  guestEmail?: string;
  orderId?: string;
  subject: string;
  category: TicketCategory;
  priority?: TicketPriority;
  message: string;
  senderRole?: MessageSender;
}) {
  const ticketNumber = await generateTicketNumber();

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber,
      userId: data.userId || null,
      guestEmail: data.guestEmail || null,
      orderId: data.orderId || null,
      subject: data.subject,
      category: data.category,
      priority: data.priority || 'NORMAL',
      status: 'OPEN',
      lastMessageAt: new Date(),
      messages: {
        create: {
          senderId: data.userId || null,
          senderRole: data.senderRole || 'CUSTOMER',
          content: data.message,
          isRead: data.senderRole === 'ADMIN',
        },
      },
    },
    include: {
      messages: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      order: { select: { id: true, orderNumber: true } },
    },
  });

  return ticket;
}

// ─── Add Message to Ticket ───
export async function addMessage(data: {
  ticketId: string;
  senderId?: string;
  senderRole: MessageSender;
  content: string;
}) {
  const message = await prisma.supportMessage.create({
    data: {
      ticketId: data.ticketId,
      senderId: data.senderId || null,
      senderRole: data.senderRole,
      content: data.content,
      isRead: false,
    },
  });

  // Update ticket lastMessageAt and reopen if closed
  const updateData: any = { lastMessageAt: new Date() };
  if (data.senderRole === 'CUSTOMER') {
    updateData.status = 'OPEN';
  } else if (data.senderRole === 'ADMIN') {
    updateData.status = 'IN_PROGRESS';
  }

  await prisma.supportTicket.update({
    where: { id: data.ticketId },
    data: updateData,
  });

  return message;
}

// ─── Get Tickets for User ───
export async function getUserTickets(userId: string, params: {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  category?: TicketCategory;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 10));
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (params.status) where.status = params.status;
  if (params.category) where.category = params.category;

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
      include: {
        order: { select: { id: true, orderNumber: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, senderRole: true, createdAt: true },
        },
        _count: {
          select: {
            messages: { where: { isRead: false, senderRole: 'ADMIN' } },
          },
        },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return {
    tickets: tickets.map((t: any) => ({
      ...t,
      unreadCount: t._count.messages,
      lastMessage: t.messages[0] || null,
      messages: undefined,
      _count: undefined,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Get Ticket Detail ───
export async function getTicketDetail(ticketId: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      order: { select: { id: true, orderNumber: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return ticket;
}

// ─── Mark Messages as Read ───
export async function markMessagesAsRead(ticketId: string, readerRole: 'CUSTOMER' | 'ADMIN') {
  const senderRole = readerRole === 'CUSTOMER' ? 'ADMIN' : 'CUSTOMER';

  await prisma.supportMessage.updateMany({
    where: {
      ticketId,
      senderRole,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

// ─── Get Unread Count for User ───
export async function getUnreadCount(userId: string): Promise<number> {
  const count = await prisma.supportMessage.count({
    where: {
      ticket: { userId },
      senderRole: 'ADMIN',
      isRead: false,
    },
  });
  return count;
}

// ─── Admin: Get All Tickets ───
export async function getAdminTickets(params: {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  category?: TicketCategory;
  search?: string;
  userId?: string;
  orderId?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.category) where.category = params.category;
  if (params.userId) where.userId = params.userId;
  if (params.orderId) where.orderId = params.orderId;
  if (params.search) {
    where.OR = [
      { ticketNumber: { contains: params.search, mode: 'insensitive' } },
      { subject: { contains: params.search, mode: 'insensitive' } },
      { user: { email: { contains: params.search, mode: 'insensitive' } } },
      { user: { firstName: { contains: params.search, mode: 'insensitive' } } },
      { user: { lastName: { contains: params.search, mode: 'insensitive' } } },
      { guestEmail: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, senderRole: true, createdAt: true },
        },
        _count: {
          select: {
            messages: { where: { isRead: false, senderRole: 'CUSTOMER' } },
          },
        },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return {
    tickets: tickets.map((t: any) => ({
      ...t,
      unreadCount: t._count.messages,
      lastMessage: t.messages[0] || null,
      messages: undefined,
      _count: undefined,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ─── Admin: Update Ticket Status ───
export async function updateTicketStatus(ticketId: string, status: TicketStatus, closedBy?: string) {
  const data: any = { status };
  if (status === 'CLOSED') {
    data.closedAt = new Date();
    data.closedBy = closedBy;
  } else {
    data.closedAt = null;
    data.closedBy = null;
  }

  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  return ticket;
}

// ─── Admin: Bulk Create Tickets ───
export async function bulkCreateTickets(data: {
  orderIds: string[];
  subject: string;
  message: string;
  adminId: string;
}) {
  const orders = await prisma.order.findMany({
    where: { id: { in: data.orderIds } },
    select: {
      id: true,
      orderNumber: true,
      userId: true,
      guestEmail: true,
      user: { select: { email: true } },
    },
  });

  const results: any[] = [];
  for (const order of orders) {
    try {
      const ticket = await createTicket({
        userId: order.userId || undefined,
        guestEmail: order.guestEmail || undefined,
        orderId: order.id,
        subject: data.subject,
        category: 'ORDER',
        message: data.message,
        senderRole: 'ADMIN',
      });
      results.push({ orderId: order.id, orderNumber: order.orderNumber, ticketId: ticket.id, success: true });
    } catch (error: any) {
      results.push({ orderId: order.id, orderNumber: order.orderNumber, success: false, error: error.message });
    }
  }

  return results;
}

// ─── Admin: Get Stats ───
export async function getAdminStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [open, inProgress, closedToday, total, unreadMessages] = await Promise.all([
    prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.supportTicket.count({ where: { status: 'CLOSED', closedAt: { gte: todayStart } } }),
    prisma.supportTicket.count(),
    prisma.supportMessage.count({ where: { senderRole: 'CUSTOMER', isRead: false } }),
  ]);

  return { open, inProgress, closedToday, total, unreadMessages };
}

// ─── Admin: Get Unread Count ───
export async function getAdminUnreadCount(): Promise<number> {
  return prisma.supportMessage.count({
    where: { senderRole: 'CUSTOMER', isRead: false },
  });
}

// ─── Get Tickets by Order ───
export async function getTicketsByOrder(orderId: string) {
  return prisma.supportTicket.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      status: true,
      category: true,
      createdAt: true,
      lastMessageAt: true,
    },
  });
}
