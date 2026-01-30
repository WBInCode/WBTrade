import { Request, Response } from 'express';
import { z } from 'zod';
import { OrdersService } from '../services/orders.service';
import { OrderStatus } from '@prisma/client';

const ordersService = new OrdersService();

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Helper to sanitize text
 */
const sanitizeText = (text: string): string => {
  return text.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim();
};

/**
 * Order item schema
 */
const orderItemSchema = z.object({
  variantId: z.string().regex(/^c[a-z0-9]{20,}$/i, 'Invalid variant ID'),
  quantity: z.number().int().positive().max(100),
  unitPrice: z.number().positive().max(9999999),
});

/**
 * Package shipping item schema for per-package delivery
 */
const packageShippingCustomAddressSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  street: z.string().min(1).max(200),
  apartment: z.string().max(50).optional(),
  postalCode: z.string().min(1).max(20),
  city: z.string().min(1).max(100),
});

const packageShippingItemSchema = z.object({
  packageId: z.string().min(1),
  method: z.string().min(1).max(50),
  price: z.number().min(0),
  paczkomatCode: z.string().max(50).optional(),
  paczkomatAddress: z.string().max(500).optional(),
  useCustomAddress: z.boolean().optional(),
  customAddress: packageShippingCustomAddressSchema.optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    productName: z.string().min(1),
    variantId: z.string().min(1),
    variantName: z.string().min(1),
    quantity: z.number().int().positive(),
    image: z.string().optional(),
  })).optional(),
});

/**
 * Create order validation schema
 * Note: userId is optional in body as we use authenticated user's ID from token
 */
const createOrderSchema = z.object({
  userId: z.string().regex(/^c[a-z0-9]{20,}$/i, 'Invalid user ID').optional(),
  shippingAddressId: z.string().regex(/^c[a-z0-9]{20,}$/i, 'Invalid shipping address ID'),
  billingAddressId: z.string().regex(/^c[a-z0-9]{20,}$/i, 'Invalid billing address ID').optional(),
  shippingMethod: z.string().min(1).max(50),
  shippingCost: z.number().min(0).max(999999),
  paymentMethod: z.string().min(1).max(50),
  paymentFee: z.number().min(0).max(999999).optional().default(0),
  subtotal: z.number().positive().max(99999999),
  total: z.number().positive().max(99999999),
  customerNotes: z.string().max(1000).optional().transform((val) => val ? sanitizeText(val) : undefined),
  pickupPointCode: z.string().max(50).optional(),
  pickupPointAddress: z.string().max(500).optional().transform((val) => val ? sanitizeText(val) : undefined),
  packageShipping: z.array(packageShippingItemSchema).optional(),
  items: z.array(orderItemSchema).min(1, 'Zam�wienie musi miec co najmniej jeden produkt'),
});

/**
 * Update order status schema
 */
const updateOrderStatusSchema = z.object({
  status: z.enum(['OPEN', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  note: z.string().max(500).optional().transform((val) => val ? sanitizeText(val) : undefined),
});

/**
 * Query params for orders list
 */
const ordersQuerySchema = z.object({
  page: z.string().optional().transform((val) => {
    const num = parseInt(val || '1', 10);
    return isNaN(num) || num < 1 ? 1 : Math.min(num, 1000);
  }),
  limit: z.string().optional().transform((val) => {
    const num = parseInt(val || '10', 10);
    return isNaN(num) || num < 1 ? 10 : Math.min(num, 100);
  }),
});

/**
 * Get all orders (admin)
 */
export async function getAllOrders(req: Request, res: Response): Promise<void> {
  try {
    const { 
      page = '1', 
      limit = '20', 
      status, 
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const result = await ordersService.getAll({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      status: status as OrderStatus | undefined,
      search: search as string | undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      sortBy: sortBy as 'createdAt' | 'total' | 'orderNumber',
      sortOrder: sortOrder as 'asc' | 'desc',
    });
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders', error });
  }
}

/**
 * Create a new order
 */
export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    // Get userId from authenticated user (set by authGuard)
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ message: 'Wymagane uwierzytelnienie' });
      return;
    }
    
    const validation = createOrderSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    // Override userId from body with authenticated user's ID for security
    const order = await ordersService.create({
      ...validation.data,
      userId, // Use authenticated user's ID
    });
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
}

/**
 * Get order by ID
 */
export async function getOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    // Validate ID format: accept either UUID or cuid (c... string used by Prisma @default(cuid()))
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const cuidRegex = /^c[a-z0-9]{20,}$/i;
    if (!uuidRegex.test(id) && !cuidRegex.test(id)) {
      res.status(400).json({ message: 'Invalid order ID format' });
      return;
    }
    
    const order = await ordersService.getById(id);
    
    if (!order) {
      res.status(404).json({ message: 'Zam�wienie nie zostalo znalezione' });
      return;
    }
    
    res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order' });
  }
}

/**
 * Get user's orders
 */
export async function getUserOrders(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    
    const validation = ordersQuerySchema.safeParse(req.query);
    
    if (!validation.success) {
      res.status(400).json({
        message: 'Invalid query parameters',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const { page, limit } = validation.data;
    
    const result = await ordersService.getUserOrders(userId, page, limit);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
}

/**
 * Update order status
 */
export async function updateOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    // Validate ID format: accept either UUID or cuid
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const cuidRegex = /^c[a-z0-9]{20,}$/i;
    if (!uuidRegex.test(id) && !cuidRegex.test(id)) {
      res.status(400).json({ message: 'Invalid order ID format' });
      return;
    }
    
    const validation = updateOrderStatusSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: validation.error.flatten().fieldErrors,
      });
      return;
    }
    
    const order = await ordersService.updateStatus(id, validation.data.status, validation.data.note);
    
    if (!order) {
      res.status(404).json({ message: 'Zam�wienie nie zostalo znalezione' });
      return;
    }
    
    res.status(200).json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Error updating order' });
  }
}

/**
 * Cancel order
 */
export async function deleteOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    // Validate ID format: accept either UUID or cuid
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const cuidRegex = /^c[a-z0-9]{20,}$/i;
    if (!uuidRegex.test(id) && !cuidRegex.test(id)) {
      res.status(400).json({ message: 'Invalid order ID format' });
      return;
    }
    
    const order = await ordersService.cancel(id);
    
    if (!order) {
      res.status(404).json({ message: 'Zam�wienie nie zostalo znalezione' });
      return;
    }
    
    res.status(200).json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Error cancelling order', error });
  }
}

/**
 * Check refund eligibility for an order
 * Returns whether the order can be refunded (within 14 days)
 */
export async function checkRefundEligibility(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    // userId is optional - guests can also check refund eligibility
    const userId = (req as any).user?.id;
    
    const eligibility = await ordersService.checkRefundEligibility(id);
    
    res.status(200).json(eligibility);
  } catch (error: any) {
    console.error('Error checking refund eligibility:', error);
    res.status(500).json({ message: 'Error checking refund eligibility' });
  }
}

/**
 * Request refund by customer (with 14-day validation)
 */
export async function requestRefund(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    // userId is optional - guests can also request refund
    const userId = (req as any).user?.id;

    const result = await ordersService.requestRefund(id, reason?.trim() || '');
    
    if (!result.success) {
      res.status(400).json({ message: result.error });
      return;
    }
    
    res.status(200).json({ 
      success: true,
      refundNumber: result.refundNumber,
      returnAddress: result.returnAddress,
      order: result.order,
    });
  } catch (error: any) {
    console.error('Error requesting refund:', error);
    res.status(500).json({ message: 'Error requesting refund' });
  }
}

/**
 * Refund order (admin)
 */
export async function refundOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const order = await ordersService.refund(id, reason);
    
    if (!order) {
      res.status(404).json({ message: 'Zamówienie nie zostało znalezione' });
      return;
    }
    
    res.status(200).json({ message: 'Order refunded successfully', order });
  } catch (error: any) {
    console.error('Error refunding order:', error);
    res.status(400).json({ message: error.message || 'Error refunding order' });
  }
}

/**
 * Restore cancelled/refunded order
 */
export async function restoreOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const order = await ordersService.restore(id);
    
    if (!order) {
      res.status(404).json({ message: 'Zam�wienie nie zostalo znalezione' });
      return;
    }
    
    res.status(200).json({ message: 'Order restored successfully', order });
  } catch (error: any) {
    console.error('Error restoring order:', error);
    res.status(400).json({ message: error.message || 'Error restoring order' });
  }
}

/**
 * Simulate payment for development/testing
 * Only works in development environment
 */
export async function simulatePayment(req: Request, res: Response): Promise<void> {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ message: 'Payment simulation not available in production' });
      return;
    }

    const { id } = req.params;
    
    // Validate ID format
    const cuidRegex = /^c[a-z0-9]{20,}$/i;
    if (!cuidRegex.test(id)) {
      res.status(400).json({ message: 'Invalid order ID format' });
      return;
    }
    
    const order = await ordersService.simulatePayment(id);
    
    if (!order) {
      res.status(404).json({ message: 'Zam�wienie nie zostalo znalezione' });
      return;
    }
    
    res.status(200).json({ 
      message: 'Payment simulated successfully', 
      order,
      paymentStatus: 'PAID',
      orderStatus: order.status
    });
  } catch (error: any) {
    console.error('Error simulating payment:', error);
    res.status(400).json({ message: error.message || 'Error simulating payment' });
  }
}
