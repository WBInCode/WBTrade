import { prisma } from '../db';
import { OrderStatus, Prisma } from '@prisma/client';

interface PackageShippingItem {
  packageId: string;
  method: string;
  price: number;
  paczkomatCode?: string;
  paczkomatAddress?: string;
  useCustomAddress?: boolean;
  customAddress?: {
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    apartment?: string;
    postalCode: string;
    city: string;
  };
  items?: {
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    quantity: number;
    image?: string;
  }[];
}

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
  paczkomatCode?: string;
  paczkomatAddress?: string;
  packageShipping?: PackageShippingItem[];
}

interface GetAllOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: 'createdAt' | 'total' | 'orderNumber';
  sortOrder?: 'asc' | 'desc';
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WB-${timestamp}-${random}`;
}

export class OrdersService {
  /**
   * Get all orders (admin)
   */
  async getAll(params: GetAllOrdersParams = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          items: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          shippingAddress: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

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
    
    // Calculate shipping cost from packageShipping or use 0
    let shipping = 0;
    if (data.packageShipping && data.packageShipping.length > 0) {
      shipping = data.packageShipping.reduce((sum, pkg) => sum + (pkg.price || 0), 0);
    }
    
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
          paczkomatCode: data.paczkomatCode,
          paczkomatAddress: data.paczkomatAddress,
          packageShipping: data.packageShipping ? JSON.parse(JSON.stringify(data.packageShipping)) : Prisma.JsonNull,
          status: 'OPEN', // Order is OPEN until payment is completed
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
              status: 'OPEN',
              note: 'Zamówienie utworzone - oczekuje na płatność',
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

  /**
   * Process refund for an order
   */
  async refund(id: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) return null;

      // Only allow refund for delivered or shipped orders
      if (!['DELIVERED', 'SHIPPED'].includes(order.status)) {
        throw new Error('Order cannot be refunded in current status');
      }

      // Return inventory (add back to stock)
      for (const item of order.items) {
        await tx.inventory.updateMany({
          where: { variantId: item.variantId },
          data: {
            quantity: { increment: item.quantity },
          },
        });
      }

      // Update order status
      const refundedOrder = await tx.order.update({
        where: { id },
        data: { status: 'REFUNDED' },
      });

      // Add to status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: 'REFUNDED',
          note: reason || 'Order refunded',
        },
      });

      return refundedOrder;
    });
  }

  /**
   * Restore cancelled/refunded order
   */
  async restore(id: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) return null;

      if (!['CANCELLED', 'REFUNDED'].includes(order.status)) {
        throw new Error('Order is not cancelled or refunded');
      }

      // Reserve inventory again
      for (const item of order.items) {
        const inventory = await tx.inventory.findFirst({
          where: { variantId: item.variantId },
        });

        if (inventory && inventory.quantity - inventory.reserved < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productName}`);
        }

        await tx.inventory.updateMany({
          where: { variantId: item.variantId },
          data: {
            reserved: { increment: item.quantity },
          },
        });
      }

      // Update order status back to PENDING
      const restoredOrder = await tx.order.update({
        where: { id },
        data: { status: 'PENDING' },
      });

      // Add to status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: 'PENDING',
          note: 'Order restored',
        },
      });

      return restoredOrder;
    });
  }

  /**
   * Simulate payment for development/testing
   * Changes order status from OPEN/PENDING to CONFIRMED and payment status to PAID
   */
  async simulatePayment(id: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) return null;

      // Allow simulation for both OPEN (new) and PENDING (legacy) statuses
      if (order.status !== 'OPEN' && order.status !== 'PENDING') {
        throw new Error('Zamówienie nie jest otwarte - nie można symulować płatności');
      }

      // Update order status to CONFIRMED and payment status to PAID
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { 
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
        },
        include: {
          items: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          shippingAddress: true,
          billingAddress: true,
        },
      });

      // Add to status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: 'CONFIRMED',
          note: '[DEV] Płatność zasymulowana - zamówienie opłacone',
        },
      });

      console.log(`[DEV] Payment simulated for order ${order.orderNumber}`);

      return updatedOrder;
    });
  }
}