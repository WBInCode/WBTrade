/**
 * Return Service
 * 
 * Handles the full return/complaint lifecycle with dedicated statuses:
 * NEW → RECEIVED → APPROVED → REFUND_SENT → CLOSED
 *                 → REJECTED
 * 
 * Each ReturnRequest links to a SupportTicket for messaging/communication.
 */

import { prisma } from '../db';
import { ReturnStatus, TicketCategory } from '@prisma/client';
import { generateReturnNumber, createTicket, addMessage } from './support.service';

// ============================================
// Status Transition Rules
// ============================================

const ALLOWED_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  NEW: ['RECEIVED', 'REJECTED', 'CLOSED'],
  RECEIVED: ['APPROVED', 'REJECTED', 'CLOSED'],
  APPROVED: ['REFUND_SENT', 'CLOSED'],
  REFUND_SENT: ['CLOSED'],
  CLOSED: [],    // Terminal state
  REJECTED: [],  // Terminal state
};

const STATUS_LABELS: Record<ReturnStatus, string> = {
  NEW: 'Nowy',
  RECEIVED: 'Przyjęty',
  APPROVED: 'Zaakceptowany',
  REFUND_SENT: 'Zwrot wysłany',
  CLOSED: 'Zamknięty',
  REJECTED: 'Odrzucony',
};

// ============================================
// Types
// ============================================

export interface CreateReturnData {
  orderId: string;
  type: 'RETURN' | 'COMPLAINT';
  reason: string;
  items: {
    orderItemId: string;
    quantity: number;
    reason?: string;
  }[];
  // Customer identity
  userId?: string;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
}

export interface GetReturnsParams {
  page?: number;
  limit?: number;
  status?: ReturnStatus;
  statuses?: ReturnStatus[];
  type?: 'RETURN' | 'COMPLAINT';
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// ============================================
// Service Functions
// ============================================

/**
 * Create a new return request with linked support ticket and return items
 */
export async function createReturn(data: CreateReturnData) {
  const returnNumber = await generateReturnNumber(data.type);

  // Look up order to build subject
  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    select: { orderNumber: true },
  });

  if (!order) {
    throw new Error('Zamówienie nie zostało znalezione');
  }

  const subjectPrefix = data.type === 'RETURN' ? 'Zwrot' : 'Reklamacja';

  // Create everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create the support ticket for communication
    const ticket = await createTicket({
      userId: data.userId,
      guestEmail: data.guestEmail,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      orderId: data.orderId,
      subject: `${subjectPrefix} - zamówienie ${order.orderNumber}`,
      category: data.type as TicketCategory,
      message: data.reason,
      senderRole: 'CUSTOMER',
      returnNumber,
    });

    // 2. Create the return request
    const returnRequest = await tx.returnRequest.create({
      data: {
        returnNumber,
        orderId: data.orderId,
        ticketId: ticket.id,
        status: 'NEW',
        type: data.type as TicketCategory,
        reason: data.reason,
        items: {
          create: data.items.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            reason: item.reason || null,
          })),
        },
      },
      include: {
        items: {
          include: {
            orderItem: true,
          },
        },
        ticket: true,
        order: {
          select: { id: true, orderNumber: true },
        },
      },
    });

    return returnRequest;
  });

  return result;
}

/**
 * Get a single return request with all related data
 */
export async function getReturn(returnId: string) {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: {
      items: {
        include: {
          orderItem: {
            include: {
              variant: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      images: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      ticket: {
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
        },
      },
      order: {
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: { id: true, name: true, images: true },
                  },
                },
              },
            },
          },
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          shippingAddress: true,
        },
      },
    },
  });

  return returnRequest;
}

/**
 * Get paginated list of return requests with filtering
 */
export async function getReturns(params: GetReturnsParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.status) {
    where.status = params.status;
  } else if (params.statuses && params.statuses.length > 0) {
    where.status = { in: params.statuses };
  }

  if (params.type) {
    where.type = params.type;
  }

  if (params.dateFrom || params.dateTo) {
    where.createdAt = {};
    if (params.dateFrom) where.createdAt.gte = params.dateFrom;
    if (params.dateTo) where.createdAt.lte = params.dateTo;
  }

  if (params.search) {
    where.OR = [
      { returnNumber: { contains: params.search, mode: 'insensitive' } },
      { ticket: { ticketNumber: { contains: params.search, mode: 'insensitive' } } },
      { ticket: { subject: { contains: params.search, mode: 'insensitive' } } },
      { order: { orderNumber: { contains: params.search, mode: 'insensitive' } } },
      { ticket: { user: { email: { contains: params.search, mode: 'insensitive' } } } },
      { ticket: { user: { firstName: { contains: params.search, mode: 'insensitive' } } } },
      { ticket: { user: { lastName: { contains: params.search, mode: 'insensitive' } } } },
      { ticket: { guestEmail: { contains: params.search, mode: 'insensitive' } } },
      { ticket: { guestName: { contains: params.search, mode: 'insensitive' } } },
    ];
  }

  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        items: {
          include: {
            orderItem: true,
          },
        },
        ticket: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            _count: {
              select: {
                messages: { where: { isRead: false, senderRole: 'CUSTOMER' } },
              },
            },
          },
        },
        order: {
          select: { id: true, orderNumber: true, total: true, createdAt: true },
        },
      },
    }),
    prisma.returnRequest.count({ where }),
  ]);

  return {
    returns: returns.map((r: any) => ({
      ...r,
      unreadCount: r.ticket?._count?.messages || 0,
      ticket: {
        ...r.ticket,
        _count: undefined,
      },
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get return stats by status
 */
export async function getReturnStats() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    newCount,
    receivedCount,
    approvedCount,
    refundSentCount,
    closedCount,
    rejectedCount,
    totalReturns,
    totalComplaints,
    closedToday,
  ] = await Promise.all([
    prisma.returnRequest.count({ where: { status: 'NEW' } }),
    prisma.returnRequest.count({ where: { status: 'RECEIVED' } }),
    prisma.returnRequest.count({ where: { status: 'APPROVED' } }),
    prisma.returnRequest.count({ where: { status: 'REFUND_SENT' } }),
    prisma.returnRequest.count({ where: { status: 'CLOSED' } }),
    prisma.returnRequest.count({ where: { status: 'REJECTED' } }),
    prisma.returnRequest.count({ where: { type: 'RETURN' } }),
    prisma.returnRequest.count({ where: { type: 'COMPLAINT' } }),
    prisma.returnRequest.count({ where: { status: 'CLOSED', closedAt: { gte: todayStart } } }),
  ]);

  return {
    newCount,
    receivedCount,
    approvedCount,
    refundSentCount,
    closedCount,
    rejectedCount,
    totalReturns,
    totalComplaints,
    closedToday,
  };
}

/**
 * Update return status with transition validation
 */
export async function updateReturnStatus(
  returnId: string,
  newStatus: ReturnStatus,
  adminId?: string,
  adminNotes?: string,
) {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    select: { id: true, status: true, ticketId: true, orderId: true },
  });

  if (!returnRequest) {
    throw new Error('Zwrot nie został znaleziony');
  }

  const currentStatus = returnRequest.status;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Nie można zmienić statusu z "${STATUS_LABELS[currentStatus]}" na "${STATUS_LABELS[newStatus]}"`
    );
  }

  const updateData: any = { status: newStatus };
  if (adminNotes) updateData.adminNotes = adminNotes;

  if (newStatus === 'CLOSED') {
    updateData.closedAt = new Date();
    updateData.closedBy = adminId;
  }

  const updated = await prisma.returnRequest.update({
    where: { id: returnId },
    data: updateData,
    include: {
      ticket: true,
      order: { select: { id: true, orderNumber: true } },
    },
  });

  // Add system message to the ticket
  await addMessage({
    ticketId: returnRequest.ticketId,
    senderRole: 'SYSTEM',
    content: `Status zwrotu zmieniony na: ${STATUS_LABELS[newStatus]}${adminNotes ? ` — ${adminNotes}` : ''}`,
  });

  return updated;
}

/**
 * Approve a return - sets status to APPROVED with refund amount
 */
export async function approveReturn(
  returnId: string,
  refundAmount: number,
  adminId: string,
  adminNotes?: string,
) {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    select: { id: true, status: true, ticketId: true, orderId: true },
  });

  if (!returnRequest) {
    throw new Error('Zwrot nie został znaleziony');
  }

  if (!ALLOWED_TRANSITIONS[returnRequest.status].includes('APPROVED')) {
    throw new Error(`Nie można zaakceptować zwrotu w statusie "${STATUS_LABELS[returnRequest.status]}"`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.returnRequest.update({
      where: { id: returnId },
      data: {
        status: 'APPROVED',
        refundAmount,
        adminNotes: adminNotes || null,
      },
      include: {
        ticket: true,
        order: { select: { id: true, orderNumber: true } },
      },
    });

    // Update the order refund fields
    await tx.order.update({
      where: { id: returnRequest.orderId },
      data: {
        refundReason: adminNotes || 'Zwrot zaakceptowany',
        refundRequestedAt: new Date(),
      },
    });

    return result;
  });

  // Add system message
  await addMessage({
    ticketId: returnRequest.ticketId,
    senderRole: 'SYSTEM',
    content: `Zwrot zaakceptowany. Kwota zwrotu: ${refundAmount.toFixed(2)} PLN${adminNotes ? `. ${adminNotes}` : ''}`,
  });

  return updated;
}

/**
 * Reject a return with reason
 */
export async function rejectReturn(
  returnId: string,
  rejectionReason: string,
  adminId: string,
) {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    select: { id: true, status: true, ticketId: true },
  });

  if (!returnRequest) {
    throw new Error('Zwrot nie został znaleziony');
  }

  if (!ALLOWED_TRANSITIONS[returnRequest.status].includes('REJECTED')) {
    throw new Error(`Nie można odrzucić zwrotu w statusie "${STATUS_LABELS[returnRequest.status]}"`);
  }

  const updated = await prisma.returnRequest.update({
    where: { id: returnId },
    data: {
      status: 'REJECTED',
      rejectionReason,
      closedAt: new Date(),
      closedBy: adminId,
    },
    include: {
      ticket: true,
      order: { select: { id: true, orderNumber: true } },
    },
  });

  // Close the associated ticket
  await prisma.supportTicket.update({
    where: { id: returnRequest.ticketId },
    data: { status: 'CLOSED', closedAt: new Date(), closedBy: adminId },
  });

  // Add system message
  await addMessage({
    ticketId: returnRequest.ticketId,
    senderRole: 'SYSTEM',
    content: `Zwrot odrzucony. Powód: ${rejectionReason}`,
  });

  return updated;
}

/**
 * Mark refund as sent with date and update order payment status
 */
export async function markRefundSent(
  returnId: string,
  refundDate: Date,
  adminId: string,
) {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    select: { id: true, status: true, ticketId: true, orderId: true, refundAmount: true, returnNumber: true },
  });

  if (!returnRequest) {
    throw new Error('Zwrot nie został znaleziony');
  }

  if (!ALLOWED_TRANSITIONS[returnRequest.status].includes('REFUND_SENT')) {
    throw new Error(`Nie można oznaczyć przelewu w statusie "${STATUS_LABELS[returnRequest.status]}"`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.returnRequest.update({
      where: { id: returnId },
      data: {
        status: 'REFUND_SENT',
        refundDate,
      },
      include: {
        ticket: true,
        order: { select: { id: true, orderNumber: true } },
      },
    });

    // Update order status and payment status
    await tx.order.update({
      where: { id: returnRequest.orderId },
      data: {
        status: 'REFUNDED',
        paymentStatus: 'REFUNDED',
        refundNumber: returnRequest.returnNumber,
      },
    });

    return result;
  });

  // Add system message
  const dateStr = refundDate.toLocaleDateString('pl-PL');
  await addMessage({
    ticketId: returnRequest.ticketId,
    senderRole: 'SYSTEM',
    content: `Przelew zwrotu wysłany (${returnRequest.refundAmount?.toFixed(2) || '0.00'} PLN). Data przelewu: ${dateStr}`,
  });

  return updated;
}

/**
 * Close a return (final step after refund sent)
 */
export async function closeReturn(returnId: string, adminId: string) {
  return updateReturnStatus(returnId, 'CLOSED', adminId);
}

export const returnService = {
  createReturn,
  getReturn,
  getReturns,
  getReturnStats,
  updateReturnStatus,
  approveReturn,
  rejectReturn,
  markRefundSent,
  closeReturn,
};
