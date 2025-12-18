import { prisma } from '../db';
import { OrderStatus } from '@prisma/client';

interface CreateOrderData {
  userId?: string;
  shippingAddressId?: string;
  billingAddressId?: string;
  shippingMethod: string;
  paymentMethod: string;
  items: {
    variantId: string;
    quantity: number;
    unitPrice: number;
  }[];
  customerNotes?: string;
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WB-${timestamp}-${random}`;
}

export class OrdersService {
  /**
   * Create a new order
   */
  async create(data: CreateOrderData) {
    const orderNumber = generateOrderNumber();
    
    // Calculate totals
    // Note: Product prices are already gross (including VAT) in Poland
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const shipping = 0; // TODO: Calculate based on shipping method
    // VAT is already included in product prices (Polish prices are gross)
    // We calculate VAT for display purposes only (23% is already in the price)
    const tax = 0; // VAT already included in prices
    const total = subtotal + shipping;

    return prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: data.userId,
          shippingAddressId: data.shippingAddressId,
          billingAddressId: data.billingAddressId,
          shippingMethod: data.shippingMethod,
          paymentMethod: data.paymentMethod,
          subtotal,
          shipping,
          tax,
          total,
          customerNotes: data.customerNotes,
          items: {
            create: await Promise.all(
              data.items.map(async (item) => {
                const variant = await tx.productVariant.findUnique({
                  where: { id: item.variantId },
                  include: { product: true },
                });

                return {
                  variantId: item.variantId,
                  productName: variant?.product.name || 'Unknown',
                  variantName: variant?.name || 'Default',
                  sku: variant?.sku || '',
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  total: item.unitPrice * item.quantity,
                };
              })
            ),
          },
          statusHistory: {
            create: {
              status: 'PENDING',
              note: 'Order created',
            },
          },
        },
        include: {
          items: true,
          statusHistory: true,
        },
      });

      // Reserve inventory for each item
      for (const item of data.items) {
        await tx.inventory.updateMany({
          where: { variantId: item.variantId },
          data: {
            reserved: { increment: item.quantity },
          },
        });
      }

      return order;
    });
  }

  /**
   * Get order by ID
   */
  async getById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        shippingAddress: true,
        billingAddress: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      prisma.order.count({ where: { userId } }),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update order status
   */
  async updateStatus(id: string, status: OrderStatus, note?: string, createdBy?: string) {
    return prisma.$transaction(async (tx) => {
      // Update order status
      const order = await tx.order.update({
        where: { id },
        data: { status },
        include: { items: true },
      });

      // Add to status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status,
          note,
          createdBy,
        },
      });

      return order;
    });
  }

  /**
   * Cancel order and release inventory
   */
  async cancel(id: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) return null;

      // Release reserved inventory
      for (const item of order.items) {
        await tx.inventory.updateMany({
          where: { variantId: item.variantId },
          data: {
            reserved: { decrement: item.quantity },
          },
        });
      }

      // Update order status
      const cancelledOrder = await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // Add to status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: 'CANCELLED',
          note: 'Order cancelled',
        },
      });

      return cancelledOrder;
    });
  }
}