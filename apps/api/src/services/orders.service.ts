import { prisma } from '../db';
import { OrderStatus, Prisma } from '@prisma/client';
import { baselinkerOrdersService } from './baselinker-orders.service';
import { popularityService } from './popularity.service';
import { roundMoney, addMoney, subtractMoney } from '../lib/currency';
import { createBaselinkerProvider } from '../providers/baselinker';
import { decryptToken } from '../lib/encryption';

// Courier name mapping for display
const COURIER_NAMES: Record<string, string> = {
  'inpost': 'InPost Paczkomat',
  'inpost_paczkomaty': 'InPost Paczkomat',
  'inpost_courier': 'Kurier InPost',
  'inpost_kurier': 'Kurier InPost',
  'dpd': 'Kurier DPD',
  'dpd_kurier': 'Kurier DPD',
  'dpd_courier': 'Kurier DPD',
  'dhl': 'Kurier DHL',
  'dhl_kurier': 'Kurier DHL',
  'ups': 'Kurier UPS',
  'gls': 'Kurier GLS',
  'poczta_polska': 'Poczta Polska',
  'pocztex': 'Pocztex',
  'fedex': 'Kurier FedEx',
  'geis': 'Kurier Geis',
  'raben': 'Kurier Raben',
};

interface PackageShippingItem {
  packageId: string;
  wholesaler?: string;
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
  // Discount/coupon fields
  couponCode?: string;
  discount?: number;
  // Guest checkout fields
  guestEmail?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestPhone?: string;
  // Invoice preference
  wantInvoice?: boolean;
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
    
    // Calculate totals (using roundMoney to avoid floating-point precision issues)
    // Note: Product prices are already gross (including VAT) in Poland
    const subtotal = roundMoney(data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    ));
    
    // Calculate shipping cost from packageShipping or use 0
    let shipping = 0;
    if (data.packageShipping && data.packageShipping.length > 0) {
      shipping = roundMoney(data.packageShipping.reduce((sum, pkg) => sum + (pkg.price || 0), 0));
    }
    
    // Get discount from data (calculated in checkout controller)
    const discount = roundMoney(data.discount || 0);
    
    // VAT is already included in product prices (Polish prices are gross)
    // We calculate VAT for display purposes only (23% is already in the price)
    const tax = 0; // VAT already included in prices
    const total = roundMoney(subtotal + shipping - discount);

    return prisma.$transaction(async (tx) => {
      // If coupon is used, mark it as used
      if (data.couponCode) {
        await tx.coupon.update({
          where: { code: data.couponCode },
          data: { usedCount: { increment: 1 } },
        });
      }
      
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
          discount,
          couponCode: data.couponCode, // Store the coupon code used
          tax,
          total,
          customerNotes: data.customerNotes,
          wantInvoice: data.wantInvoice || false,
          // Guest checkout fields
          guestEmail: data.guestEmail,
          guestFirstName: data.guestFirstName,
          guestLastName: data.guestLastName,
          guestPhone: data.guestPhone,
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

      // Sync order to Baselinker immediately with "Nieopłacone" status
      // This is done outside transaction to not block order creation
      setTimeout(() => {
        baselinkerOrdersService.syncOrderToBaselinker(order.id, { skipPaymentCheck: true })
          .then((syncResult) => {
            if (syncResult.success) {
              console.log(`[OrdersService] Order ${order.orderNumber} synced to Baselinker as unpaid (BL ID: ${syncResult.baselinkerOrderId})`);
            } else {
              console.error(`[OrdersService] Failed to sync order ${order.orderNumber} to Baselinker:`, syncResult.error);
            }
          })
          .catch((err) => {
            console.error(`[OrdersService] Baselinker sync error for order ${order.orderNumber}:`, err);
          });
      }, 100);

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
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    tags: true,
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
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      tags: true,
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
    const cancelledOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!order) return null;

      // Validate order can be cancelled
      // Only allow cancellation for OPEN, PENDING, or CONFIRMED orders
      const allowedStatuses = ['OPEN', 'PENDING', 'CONFIRMED'];
      if (!allowedStatuses.includes(order.status)) {
        throw new Error(`Cannot cancel order in status: ${order.status}. Orders can only be cancelled when in OPEN, PENDING, or CONFIRMED status.`);
      }

      // Release reserved inventory
      for (const item of order.items) {
        await tx.inventory.updateMany({
          where: { variantId: item.variantId },
          data: {
            reserved: { decrement: item.quantity },
          },
        });
      }

      // Update order status and payment status
      const cancelledOrder = await tx.order.update({
        where: { id },
        data: { 
          status: 'CANCELLED',
          paymentStatus: order.paymentStatus === 'PAID' ? order.paymentStatus : 'CANCELLED', // Keep PAID status if already paid (for refund tracking)
        },
      });

      // Add to status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: 'CANCELLED',
          note: 'Order cancelled by customer',
        },
      });

      return cancelledOrder;
    });

    // Sync cancellation to Baselinker (update to "Zwroty/Anulowane" status)
    if (cancelledOrder && cancelledOrder.baselinkerOrderId) {
      setTimeout(() => {
        baselinkerOrdersService.markOrderAsRefunded(cancelledOrder.id, 'Zamówienie anulowane przez klienta')
          .then((syncResult) => {
            if (syncResult.success) {
              console.log(`[OrdersService] Order ${cancelledOrder.orderNumber} cancellation synced to Baselinker`);
            } else {
              console.error(`[OrdersService] Failed to sync cancellation to Baselinker:`, syncResult.error);
            }
          })
          .catch((err) => {
            console.error(`[OrdersService] Baselinker cancellation sync error:`, err);
          });
      }, 100);
    }

    return cancelledOrder;
  }

  /**
   * Check if refund is allowed for an order (within 14 days)
   * Returns eligibility info with days remaining
   */
  async checkRefundEligibility(id: string): Promise<{
    eligible: boolean;
    reason?: string;
    daysRemaining?: number;
    deliveredAt?: Date;
  }> {
    // Try to find by ID first, then by orderNumber
    let order = await prisma.order.findUnique({
      where: { id },
      include: {
        statusHistory: {
          where: { status: 'DELIVERED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // If not found by ID, try by orderNumber
    if (!order) {
      order = await prisma.order.findUnique({
        where: { orderNumber: id },
        include: {
          statusHistory: {
            where: { status: 'DELIVERED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    }

    if (!order) {
      return { eligible: false, reason: 'Zamówienie nie zostało znalezione' };
    }

    // No user check - anyone with order ID/number can request refund

    // Only DELIVERED or SHIPPED orders can be refunded
    if (!['DELIVERED', 'SHIPPED'].includes(order.status)) {
      return { eligible: false, reason: 'Zamówienie nie może zostać zwrócone w obecnym statusie' };
    }

    // Already refunded
    if (order.status === 'REFUNDED') {
      return { eligible: false, reason: 'Zamówienie zostało już zwrócone' };
    }

    // Get delivery date (from status history or fallback to updatedAt when status is DELIVERED)
    const deliveredEntry = order.statusHistory[0];
    let deliveredAt: Date;
    
    if (deliveredEntry?.createdAt) {
      // Use status history entry if available
      deliveredAt = deliveredEntry.createdAt;
    } else if (order.status === 'DELIVERED') {
      // If already delivered but no history entry, use updatedAt
      deliveredAt = order.updatedAt;
    } else {
      // For SHIPPED orders, estimate delivery as now (they can request refund after receiving)
      deliveredAt = new Date();
    }
    
    // Calculate refund period:
    // Day 0 = delivery day (doesn't count)
    // Day 1 = first day after delivery (starts at midnight)
    // Customer has 14 full days from the day after delivery
    
    // Get start of the day AFTER delivery (midnight)
    const refundPeriodStart = new Date(deliveredAt);
    refundPeriodStart.setHours(0, 0, 0, 0);
    refundPeriodStart.setDate(refundPeriodStart.getDate() + 1); // Next day at midnight
    
    // Refund deadline = 14 days after refundPeriodStart (end of day 14)
    const refundDeadline = new Date(refundPeriodStart);
    refundDeadline.setDate(refundDeadline.getDate() + 14);
    
    const now = new Date();
    
    // Calculate days remaining (from now until deadline)
    const msRemaining = refundDeadline.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) {
      return { 
        eligible: false, 
        reason: 'Minął 14-dniowy okres na zwrot towaru',
        daysRemaining: 0,
        deliveredAt,
      };
    }

    return { 
      eligible: true, 
      daysRemaining,
      deliveredAt,
    };
  }

  /**
   * Generate unique refund number (9 digits in format XXX XXX XXX)
   */
  private generateRefundNumber(): string {
    let digits = '';
    for (let i = 0; i < 9; i++) {
      digits += Math.floor(Math.random() * 10).toString();
    }
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  }

  /**
   * Request refund by customer (with 14-day validation)
   * This method is for customer-initiated refunds
   * Returns refund number and return address for the customer
   */
  async requestRefund(id: string, reason: string): Promise<{
    success: boolean;
    order?: any;
    refundNumber?: string;
    returnAddress?: {
      name: string;
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    error?: string;
  }> {
    // Try to find order by ID or orderNumber first
    let order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      order = await prisma.order.findUnique({ where: { orderNumber: id } });
    }
    
    const orderId = order?.id || id;
    
    // Check eligibility first
    const eligibility = await this.checkRefundEligibility(orderId);
    
    if (!eligibility.eligible) {
      return { success: false, error: eligibility.reason };
    }

    // Generate refund number
    const refundNumber = this.generateRefundNumber();

    try {
      // Update order with refund info before processing
      await prisma.order.update({
        where: { id: orderId },
        data: {
          refundNumber,
          refundReason: reason || null,
          refundRequestedAt: new Date(),
        },
      });

      const refundedOrder = await this.refund(orderId, reason ? `Zwrot na żądanie klienta: ${reason}` : 'Zwrot na żądanie klienta');
      
      if (!refundedOrder) {
        return { success: false, error: 'Nie udało się przetworzyć zwrotu' };
      }

      // Update Baselinker status to "Zwroty/Anulowane" and add refund reason
      baselinkerOrdersService.markOrderAsRefunded(orderId, reason)
        .then((result) => {
          if (result.success) {
            console.log(`[Orders] Order ${id} marked as refunded in Baselinker`);
          } else {
            console.error(`[Orders] Failed to mark order as refunded in Baselinker: ${result.error}`);
          }
        })
        .catch((err) => {
          console.error(`[Orders] Baselinker refund sync error:`, err);
        });

      // Return address for customer to send the package
      const returnAddress = {
        name: 'WB Partners',
        contactPerson: 'Daniel Budyka',
        street: 'ul. Juliusza Słowackiego 24/11',
        city: 'Rzeszów',
        postalCode: '35-060',
        country: 'Polska',
        phone: '570 028 761',
        email: 'support@wb-partners.pl',
      };

      return { 
        success: true, 
        order: refundedOrder,
        refundNumber,
        returnAddress,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process refund for an order (admin)
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

      // Update order status and payment status
      const refundedOrder = await tx.order.update({
        where: { id },
        data: { 
          status: 'REFUNDED',
          paymentStatus: 'REFUNDED',
        },
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
    const updatedOrder = await prisma.$transaction(async (tx) => {
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
      const updated = await tx.order.update({
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

      return updated;
    });

    // After successful payment simulation, sync to Baselinker
    if (updatedOrder) {
      console.log(`[DEV] Triggering Baselinker status update for simulated payment, order ${id}`);
      
      // Update product sales count for popularity tracking
      for (const item of updatedOrder.items) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });
        if (variant?.product?.id) {
          popularityService.incrementSalesCount(variant.product.id, item.quantity)
            .catch((err) => console.error(`[DEV] Error updating sales count for product ${variant?.product?.id}:`, err));
        }
      }
      
      // Update Baselinker order status from "Nieopłacone" to "Nowe zamówienia"
      baselinkerOrdersService.markOrderAsPaid(id)
        .then((syncResult) => {
          if (syncResult.success) {
            console.log(`[DEV] Order ${id} marked as paid in Baselinker`);
          } else {
            // If order wasn't synced yet, sync it now with paid status
            console.warn(`[DEV] Could not update status, trying full sync: ${syncResult.error}`);
            return baselinkerOrdersService.syncOrderToBaselinker(id, { 
              orderStatusId: 65342, // Nowe zamówienia (paid)
              skipPaymentCheck: true 
            });
          }
        })
        .then((syncResult) => {
          if (syncResult && syncResult.success) {
            console.log(`[DEV] Order ${id} synced to Baselinker (BL ID: ${syncResult.baselinkerOrderId})`);
          }
        })
        .catch((err) => {
          console.error(`[DEV] Baselinker sync error for order ${id}:`, err);
        });
    }

    return updatedOrder;
  }

  /**
   * Get tracking info for an order from BaseLinker
   * Returns package tracking information (courier, tracking number) per shipment
   */
  async getTrackingInfo(orderId: string): Promise<{
    orderId: string;
    baselinkerOrderId?: string;
    packages: Array<{
      packageIndex: number;
      courierCode: string;
      courierName: string;
      trackingNumber: string | null;
      trackingLink?: string;
      isSent: boolean;
    }>;
  } | null> {
    // 1. Get order to find Baselinker order ID
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        baselinkerOrderId: true,
        packageShipping: true,
        status: true,
      },
    });

    if (!order) {
      return null;
    }

    // If no Baselinker order ID, return empty packages
    if (!order.baselinkerOrderId) {
      return {
        orderId: order.id,
        packages: [],
      };
    }

    // 2. Get BaseLinker config
    const config = await prisma.baselinkerConfig.findFirst({
      where: { syncEnabled: true },
    });

    if (!config) {
      console.warn('[OrdersService] No active Baselinker config found for tracking');
      return {
        orderId: order.id,
        baselinkerOrderId: order.baselinkerOrderId,
        packages: [],
      };
    }

    try {
      // 3. Create provider and fetch packages
      const apiToken = decryptToken(
        config.apiTokenEncrypted,
        config.encryptionIv,
        config.authTag
      );

      const provider = createBaselinkerProvider({
        apiToken,
        inventoryId: config.inventoryId,
      });

      const blPackages = await provider.getOrderPackages(order.baselinkerOrderId);

      // 4. Map BaseLinker packages to our format
      const packages = blPackages.map((pkg, index) => {
        const courierCode = pkg.courier_code?.toLowerCase() || '';
        const courierName = pkg.courier_other_name || 
          COURIER_NAMES[courierCode] || 
          pkg.courier_code || 
          'Nieznany przewoźnik';

        return {
          packageIndex: index + 1,
          courierCode: pkg.courier_code || '',
          courierName,
          trackingNumber: pkg.courier_package_nr || null,
          trackingLink: pkg.tracking_link || undefined,
          isSent: pkg.is_sent || !!pkg.courier_package_nr,
        };
      });

      return {
        orderId: order.id,
        baselinkerOrderId: order.baselinkerOrderId,
        packages,
      };
    } catch (error) {
      console.error('[OrdersService] Error fetching tracking info from Baselinker:', error);
      return {
        orderId: order.id,
        baselinkerOrderId: order.baselinkerOrderId,
        packages: [],
      };
    }
  }
}