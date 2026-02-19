import { Router, Request, Response } from 'express';
import { authGuard, adminOnly } from '../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.use(authGuard, adminOnly);

// ────────────────────────────────────────────────────────
// GET /api/admin/notifications
// Agreguje powiadomienia z istniejących danych:
// - Nowe zamówienia (ostatnie 24h)
// - Prośby o anulowanie (CANCELLATION_REQUESTED)
// - Niski stan magazynowy (< 5 szt)
// - Nowi użytkownicy (ostatnie 24h)
// - Zamówienia z problemami (np. zwroty, refundy)
// ────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Równoległe zapytania
    const [
      newOrders,
      pendingCancellations,
      lowStockInventory,
      newUsers,
      refundedOrders,
      recentReviews,
    ] = await Promise.all([
      // Nowe zamówienia w ciągu ostatnich 24h
      prisma.order.findMany({
        where: { createdAt: { gte: last24h } },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true } },
          guestFirstName: true,
          guestLastName: true,
          guestEmail: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Zamówienia oczekujące na anulowanie (pendingCancellation flag)
      prisma.order.findMany({
        where: { pendingCancellation: true },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { firstName: true, lastName: true } },
          guestFirstName: true,
          guestLastName: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),

      // Niski stan magazynowy — z Inventory model (quantity <= minimum)
      prisma.inventory.findMany({
        where: {
          quantity: { lte: 5 },
        },
        select: {
          id: true,
          quantity: true,
          minimum: true,
          variant: {
            select: {
              id: true,
              sku: true,
              name: true,
              product: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { quantity: 'asc' },
        take: 15,
      }),

      // Nowi użytkownicy w ciągu ostatnich 24h
      prisma.user.findMany({
        where: { createdAt: { gte: last24h } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Zamówienia ze zwrotami/refundami (ostatnie 7 dni)
      prisma.order.findMany({
        where: {
          status: 'REFUNDED',
          updatedAt: { gte: last7d },
        },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          updatedAt: true,
          user: { select: { firstName: true, lastName: true } },
          guestFirstName: true,
          guestLastName: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),

      // Nowe recenzje (ostatnie 7 dni)
      prisma.review.findMany({
        where: { createdAt: { gte: last7d } },
        select: {
          id: true,
          rating: true,
          content: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true } },
          product: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Helper: get customer name (supports guest orders)
    function getCustomerName(order: { user?: { firstName: string; lastName: string } | null; guestFirstName?: string | null; guestLastName?: string | null }): string {
      if (order.user) return `${order.user.firstName} ${order.user.lastName}`;
      if (order.guestFirstName || order.guestLastName) return `${order.guestFirstName || ''} ${order.guestLastName || ''}`.trim();
      return 'Gość';
    }

    // Formatowanie powiadomień
    type Notification = {
      id: string;
      type: string;
      title: string;
      message: string;
      link: string;
      priority: 'high' | 'medium' | 'low';
      createdAt: Date;
    };

    const notifications: Notification[] = [];

    // Prośby o anulowanie — wysoki priorytet
    pendingCancellations.forEach((order) => {
      notifications.push({
        id: `cancel-${order.id}`,
        type: 'cancellation',
        title: 'Prośba o anulowanie',
        message: `Zamówienie #${order.orderNumber} — ${getCustomerName(order)} (${Number(order.total).toFixed(2)} zł)`,
        link: `/orders/${order.id}`,
        priority: 'high',
        createdAt: order.updatedAt,
      });
    });

    // Niski stan magazynowy — wysoki priorytet
    lowStockInventory.forEach((inv) => {
      const label = inv.variant.sku || inv.variant.name;
      notifications.push({
        id: `stock-${inv.id}`,
        type: 'low_stock',
        title: 'Niski stan magazynowy',
        message: `${inv.variant.product.name} (${label}) — Zostało ${inv.quantity} szt.`,
        link: `/products/${inv.variant.product.id}`,
        priority: inv.quantity === 0 ? 'high' : 'medium',
        createdAt: new Date(),
      });
    });

    // Zamówienia zwrócone/refundowane
    refundedOrders.forEach((order) => {
      notifications.push({
        id: `refund-${order.id}`,
        type: 'refund',
        title: 'Zwrot środków',
        message: `Zamówienie #${order.orderNumber} — ${Number(order.total).toFixed(2)} zł`,
        link: `/orders/${order.id}`,
        priority: 'medium',
        createdAt: order.updatedAt,
      });
    });

    // Nowe zamówienia
    newOrders.forEach((order) => {
      notifications.push({
        id: `order-${order.id}`,
        type: 'new_order',
        title: 'Nowe zamówienie',
        message: `#${order.orderNumber} — ${getCustomerName(order)} (${Number(order.total).toFixed(2)} zł)`,
        link: `/orders/${order.id}`,
        priority: 'low',
        createdAt: order.createdAt,
      });
    });

    // Nowi użytkownicy
    newUsers.forEach((u) => {
      notifications.push({
        id: `user-${u.id}`,
        type: 'new_user',
        title: 'Nowy użytkownik',
        message: `${u.firstName} ${u.lastName} (${u.email})`,
        link: `/users`,
        priority: 'low',
        createdAt: u.createdAt,
      });
    });

    // Recenzje — informacyjne
    recentReviews.forEach((r) => {
      notifications.push({
        id: `review-${r.id}`,
        type: 'review',
        title: `Nowa recenzja (${r.rating}⭐)`,
        message: `${r.user.firstName} ${r.user.lastName} — ${r.product.name}`,
        link: `/products`,
        priority: r.rating <= 2 ? 'medium' : 'low',
        createdAt: r.createdAt,
      });
    });

    // Sortuj wg priorytetu i daty
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    notifications.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Statystyki
    const summary = {
      total: notifications.length,
      high: notifications.filter((n) => n.priority === 'high').length,
      medium: notifications.filter((n) => n.priority === 'medium').length,
      low: notifications.filter((n) => n.priority === 'low').length,
      byType: {
        cancellations: pendingCancellations.length,
        lowStock: lowStockInventory.length,
        newOrders: newOrders.length,
        refunds: refundedOrders.length,
        newUsers: newUsers.length,
        reviews: recentReviews.length,
      },
    };

    res.json({ notifications: notifications.slice(0, 30), summary });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania powiadomień' });
  }
});

export default router;
