/**
 * Dashboard Controller
 * Handles user dashboard data including orders, stats, and recommendations
 */

import { Request, Response } from 'express';
import { prisma } from '../db';
import { OrdersService } from '../services/orders.service';
import { RecommendationsService } from '../services/recommendations.service';

const ordersService = new OrdersService();
const recommendationsService = new RecommendationsService();

/**
 * Get dashboard overview with stats and recent orders
 */
export async function getDashboardOverview(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Get order stats
    const [
      unpaidCount,
      inTransitCount,
      recentOrdersData,
      loyaltyPoints, // Simulated for now
    ] = await Promise.all([
      // Count unpaid orders
      prisma.order.count({
        where: {
          userId,
          paymentStatus: 'PENDING',
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),
      // Count in transit orders
      prisma.order.count({
        where: {
          userId,
          status: 'SHIPPED',
        },
      }),
      // Get recent orders with items
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: { orderBy: { order: 'asc' }, take: 1 },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      // Simulated loyalty points (could be calculated from order history)
      Promise.resolve(350),
    ]);

    // Format recent orders for frontend
    const recentOrders = recentOrdersData.map((order) => {
      const firstItem = order.items[0];
      const productImage = firstItem?.variant?.product?.images?.[0]?.url;

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        name: firstItem?.productName || 'Unknown Product',
        image: productImage || null,
        itemsCount: order.items.length,
        orderDate: order.createdAt.toISOString(),
        status: order.status,
        paymentStatus: order.paymentStatus,
        trackingNumber: order.trackingNumber,
        total: Number(order.total),
        currency: 'PLN',
      };
    });

    res.json({
      stats: {
        unpaidOrders: unpaidCount,
        inTransitOrders: inTransitCount,
        unreadMessages: 5, // Placeholder - would come from messaging system
        loyaltyPoints,
      },
      recentOrders,
    });
  } catch (error) {
    console.error('Error getting dashboard overview:', error);
    res.status(500).json({ message: 'Failed to get dashboard data' });
  }
}

/**
 * Get personalized recommendations for user
 */
export async function getRecommendations(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 8;

    if (!userId) {
      // Return popular products for non-authenticated users
      const popularProducts = await prisma.product.findMany({
        where: { 
          status: 'ACTIVE',
          price: { gt: 0 }, // Don't show products with price 0
        },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: true,
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        recommendations: popularProducts.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: Number(p.price),
          compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
          images: p.images.map((img) => ({ url: img.url, alt: img.alt })),
          category: p.category ? { id: p.category.id, name: p.category.name } : null,
          reason: 'popular',
        })),
      });
      return;
    }

    const recommendations = await recommendationsService.getRecommendations(userId, limit);
    res.json({ recommendations });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ message: 'Failed to get recommendations' });
  }
}

/**
 * Record a search query for recommendations
 */
export async function recordSearch(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { query, categoryId, resultsCount } = req.body;

    if (!userId) {
      res.status(200).json({ recorded: false, reason: 'not_authenticated' });
      return;
    }

    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: 'Zapytanie jest wymagane' });
      return;
    }

    await recommendationsService.recordSearch(userId, query, categoryId, resultsCount || 0);
    res.status(200).json({ recorded: true });
  } catch (error) {
    console.error('Error recording search:', error);
    res.status(500).json({ message: 'Failed to record search' });
  }
}

/**
 * Simulate payment completion for testing
 */
export async function simulatePayment(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { orderId } = req.params;
    const { action = 'pay' } = req.body; // 'pay' | 'fail'

    console.log('simulatePayment called:', { userId, orderId, action, body: req.body });

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Verify order belongs to user
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: { items: true },
    });

    console.log('Order found:', order ? { id: order.id, paymentStatus: order.paymentStatus, status: order.status } : null);

    if (!order) {
      res.status(404).json({ message: 'Zamówienie nie zostalo znalezione' });
      return;
    }

    if (order.paymentStatus !== 'PENDING') {
      res.status(400).json({ message: 'Order payment is not pending' });
      return;
    }

    const newPaymentStatus = action === 'pay' ? 'PAID' : 'FAILED';
    const newOrderStatus = action === 'pay' ? 'CONFIRMED' : order.status;

    // Update order with simulated payment result
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: newPaymentStatus,
          status: newOrderStatus,
        },
      });

      // Add status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId: orderId,
          status: newOrderStatus,
          note: action === 'pay' 
            ? 'Payment completed (simulated)' 
            : 'Payment failed (simulated)',
          createdBy: userId,
        },
      });

      return updated;
    });

    res.json({
      success: true,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        total: Number(updatedOrder.total),
      },
      message: action === 'pay' 
        ? 'Payment simulation successful' 
        : 'Payment simulation failed',
    });
  } catch (error) {
    console.error('Error simulating payment:', error);
    res.status(500).json({ message: 'Failed to simulate payment' });
  }
}

/**
 * Get user's search history
 */
export async function getSearchHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const history = await recommendationsService.getSearchHistory(userId, limit);
    res.json({ searchHistory: history });
  } catch (error) {
    console.error('Error getting search history:', error);
    res.status(500).json({ message: 'Failed to get search history' });
  }
}

/**
 * Clear user's search history
 */
export async function clearSearchHistory(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    await recommendationsService.clearSearchHistory(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing search history:', error);
    res.status(500).json({ message: 'Failed to clear search history' });
  }
}
