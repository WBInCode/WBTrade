/**
 * Checkout Controller
 * Handles checkout process including shipping and payment
 */

import { Request, Response } from 'express';
import { shippingService } from '../services/shipping.service';
import { shippingCalculatorService } from '../services/shipping-calculator.service';
import { paymentService } from '../services/payment.service';
import { OrdersService } from '../services/orders.service';
import { CartService } from '../services/cart.service';
import { ShippingProviderId } from '../types/shipping.types';
import { CreatePaymentRequest, PaymentMethodType, PaymentProviderId } from '../types/payment.types';

/**
 * Map frontend payment method names to API payment method types
 */
function mapPaymentMethod(frontendMethod: string): PaymentMethodType {
  const methodMapping: Record<string, PaymentMethodType> = {
    'blik': 'blik',
    'card': 'card',
    'transfer': 'bank_transfer',
    'bank_transfer': 'bank_transfer',
    'google_pay': 'google_pay',
    'apple_pay': 'apple_pay',
    'paypo': 'paypo',
    'cod': 'cod',
  };
  
  return methodMapping[frontendMethod] || 'blik';
}

const ordersService = new OrdersService();
const cartService = new CartService();

/**
 * Get available shipping methods with rates
 */
export async function getShippingMethods(req: Request, res: Response): Promise<void> {
  try {
    const { postalCode, city, country = 'PL' } = req.query;

    if (!postalCode) {
      res.status(400).json({ message: 'Postal code is required' });
      return;
    }

    const rates = await shippingService.getAvailableShippingMethods({
      providerId: 'inpost_paczkomat', // Will be ignored, gets from all providers
      origin: {
        postalCode: '00-001', // Warehouse postal code
        city: 'Warszawa',
        country: 'PL',
      },
      destination: {
        postalCode: postalCode as string,
        city: city as string || '',
        country: country as string,
      },
      packages: [{ weight: 1 }], // Default package
    });

    res.json({
      shippingMethods: rates.map(rate => ({
        id: rate.providerId,
        serviceType: rate.serviceType,
        name: rate.serviceName,
        price: rate.price,
        currency: rate.currency,
        estimatedDelivery: `${rate.estimatedDeliveryDays.min}-${rate.estimatedDeliveryDays.max} dni roboczych`,
        pickupPointRequired: rate.pickupPointRequired,
      })),
    });
  } catch (error) {
    console.error('Error getting shipping methods:', error);
    res.status(500).json({ message: 'Failed to get shipping methods' });
  }
}

/**
 * Calculate shipping cost for cart based on product tags
 * This takes into account:
 * - Gabaryt (oversized) products - individual shipping
 * - Different wholesalers - separate packages
 * - Paczkomat limits (X products in package tags)
 */
export async function calculateCartShipping(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'] as string | undefined;
    
    console.log('[calculateCartShipping] userId:', userId, 'sessionId:', sessionId);
    
    // Get user's cart - try multiple strategies to find cart with items
    let cart;
    
    // Strategy 1: If user is logged in, try user's cart first
    if (userId) {
      cart = await cartService.getOrCreateCart(userId, undefined);
      console.log('[calculateCartShipping] User cart items:', cart?.items?.length || 0);
    }
    
    // Strategy 2: If no items found and sessionId provided, try merge or session cart
    if ((!cart || !cart.items.length) && sessionId) {
      if (userId) {
        cart = await cartService.mergeCarts(userId, sessionId);
        console.log('[calculateCartShipping] After merge items:', cart?.items?.length || 0);
      } else {
        cart = await cartService.getOrCreateCart(undefined, sessionId);
        console.log('[calculateCartShipping] Session cart items:', cart?.items?.length || 0);
      }
    }
    
    if (!cart || !cart.items.length) {
      console.log('[calculateCartShipping] Cart is empty or not found');
      res.status(400).json({ message: 'Cart is empty' });
      return;
    }
    
    // Convert cart items to format needed by shipping calculator
    const cartItems = cart.items.map(item => ({
      variantId: item.variant.id,
      quantity: item.quantity,
    }));
    
    // Get available shipping methods with calculated prices
    const shippingMethods = await shippingCalculatorService.getAvailableShippingMethods(cartItems);
    
    // Get detailed calculation for additional info
    const detailedCalculation = await shippingCalculatorService.calculateShipping(cartItems);
    
    res.json({
      shippingMethods: shippingMethods.map(method => ({
        id: method.id,
        name: method.name,
        price: method.price,
        currency: 'PLN',
        available: method.available,
        message: method.message,
      })),
      calculation: {
        totalPackages: detailedCalculation.totalPackages,
        totalPaczkomatPackages: detailedCalculation.totalPaczkomatPackages,
        isPaczkomatAvailable: detailedCalculation.isPaczkomatAvailable,
        breakdown: detailedCalculation.breakdown,
        warnings: detailedCalculation.warnings,
      },
    });
  } catch (error) {
    console.error('Error calculating cart shipping:', error);
    res.status(500).json({ message: 'Failed to calculate shipping' });
  }
}

/**
 * Calculate shipping for provided items (without needing cart)
 * POST /checkout/shipping/calculate
 */
export async function calculateItemsShipping(req: Request, res: Response): Promise<void> {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Items array is required' });
      return;
    }
    
    // Validate items format
    const cartItems = items.map((item: any) => ({
      variantId: item.variantId,
      quantity: item.quantity || 1,
    }));
    
    // Get available shipping methods with calculated prices
    const shippingMethods = await shippingCalculatorService.getAvailableShippingMethods(cartItems);
    
    // Get detailed calculation for additional info
    const detailedCalculation = await shippingCalculatorService.calculateShipping(cartItems);
    
    res.json({
      shippingMethods: shippingMethods.map(method => ({
        id: method.id,
        name: method.name,
        price: method.price,
        currency: 'PLN',
        available: method.available,
        message: method.message,
      })),
      calculation: {
        totalPackages: detailedCalculation.totalPackages,
        totalPaczkomatPackages: detailedCalculation.totalPaczkomatPackages,
        isPaczkomatAvailable: detailedCalculation.isPaczkomatAvailable,
        breakdown: detailedCalculation.breakdown,
        warnings: detailedCalculation.warnings,
      },
    });
  } catch (error) {
    console.error('Error calculating items shipping:', error);
    res.status(500).json({ message: 'Failed to calculate shipping' });
  }
}

/**
 * Get pickup points (Paczkomaty) for postal code
 */
export async function getPickupPoints(req: Request, res: Response): Promise<void> {
  try {
    const { postalCode, city, provider = 'inpost_paczkomat', limit = '10' } = req.query;

    if (!postalCode) {
      res.status(400).json({ message: 'Postal code is required' });
      return;
    }

    const points = await shippingService.getPickupPoints(
      provider as ShippingProviderId,
      postalCode as string,
      city as string,
      parseInt(limit as string)
    );

    res.json({ pickupPoints: points });
  } catch (error) {
    console.error('Error getting pickup points:', error);
    res.status(500).json({ message: 'Failed to get pickup points' });
  }
}

/**
 * Get available payment methods
 */
export async function getPaymentMethods(req: Request, res: Response): Promise<void> {
  try {
    const methods = await paymentService.getAvailablePaymentMethods();

    res.json({
      paymentMethods: methods.map(method => ({
        id: method.id,
        type: method.type,
        name: method.name,
        fee: method.fee,
        feeType: method.feeType,
        description: method.description,
      })),
    });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({ message: 'Failed to get payment methods' });
  }
}

/**
 * Create order and initiate payment
 */
export async function createCheckout(req: Request, res: Response): Promise<void> {
  try {
    console.log('🛒 createCheckout started');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'] as string | undefined;
    
    console.log('👤 User ID:', userId);
    console.log('🆔 Session ID:', sessionId);
    
    if (!userId) {
      console.log('❌ No user ID - auth required');
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const {
      shippingAddressId,
      billingAddressId,
      shippingMethod,
      pickupPointCode,
      pickupPointAddress,
      paymentMethod,
      customerNotes,
      acceptTerms,
    } = req.body;

    console.log('📦 Shipping Address ID:', shippingAddressId);
    console.log('🚚 Shipping Method:', shippingMethod);
    console.log('💳 Payment Method:', paymentMethod);

    // Validate required fields
    if (!shippingMethod || !paymentMethod || !acceptTerms) {
      console.log('❌ Missing required fields');
      res.status(400).json({ 
        message: 'Shipping method, payment method, and terms acceptance are required' 
      });
      return;
    }

    // Get user's cart - try both userId and sessionId
    // First try by userId, then by sessionId if user has session cart
    console.log('🛒 Getting cart for user:', userId);
    let cart = await cartService.getOrCreateCart(userId);
    console.log('🛒 Cart found:', cart?.id, 'Items:', cart?.items?.length);
    
    // If cart by userId is empty but we have sessionId, try to merge or get session cart
    if ((!cart || !cart.items.length) && sessionId) {
      console.log('🔄 Trying session cart merge...');
      // Try to get cart by sessionId
      const sessionCart = await cartService.getOrCreateCart(undefined, sessionId);
      if (sessionCart && sessionCart.items.length > 0) {
        // Merge session cart to user cart
        cart = await cartService.mergeCarts(userId, sessionId);
      }
    }
    
    if (!cart || !cart.items.length) {
      console.log('❌ Cart is empty');
      res.status(400).json({ message: 'Cart is empty' });
      return;
    }

    // Calculate totals
    interface CartItemData {
      variantId: string;
      quantity: number;
      unitPrice: number;
    }
    
    const items: CartItemData[] = cart.items.map((item) => ({
      variantId: item.variant.id,
      quantity: item.quantity,
      unitPrice: Number(item.variant.price),
    }));

    const subtotal = items.reduce((sum: number, item: CartItemData) => sum + item.unitPrice * item.quantity, 0);
    
    // Get shipping rate using the new calculator based on product tags
    // Convert cart items to format needed by shipping calculator
    const cartItemsForShipping = cart.items.map(item => ({
      variantId: item.variant.id,
      quantity: item.quantity,
    }));
    
    let shippingCost = 0;
    try {
      const shippingResult = await shippingCalculatorService.calculateShipping(cartItemsForShipping);
      
      // Get price for specific shipping method
      const methods = await shippingCalculatorService.getAvailableShippingMethods(cartItemsForShipping);
      const selectedMethod = methods.find(m => m.id === shippingMethod);
      shippingCost = selectedMethod?.price || shippingResult.shippingCost;
      
      // Log any warnings for debugging
      if (shippingResult.warnings.length > 0) {
        console.log('📦 Shipping warnings:', shippingResult.warnings);
      }
    } catch (shippingError) {
      // Fallback to old shipping calculation if new one fails
      console.error('⚠️ Error with new shipping calculator, falling back:', shippingError);
      const shippingRates = await shippingService.calculateRate(
        shippingMethod as ShippingProviderId,
        {
          providerId: shippingMethod as ShippingProviderId,
          origin: { postalCode: '00-001', city: 'Warszawa', country: 'PL' },
          destination: { postalCode: '00-001', city: '', country: 'PL' },
          packages: [{ weight: 1 }],
          pickupPointCode,
        }
      );
      shippingCost = shippingRates[0]?.price || 0;
    }

    // Get payment fee
    const paymentMethods = await paymentService.getAvailablePaymentMethods();
    const selectedPayment = paymentMethods.find(m => m.type === paymentMethod);
    const paymentFee = selectedPayment?.fee || 0;

    const total = subtotal + shippingCost + paymentFee;

    // Create order
    const order = await ordersService.create({
      userId,
      shippingAddressId,
      billingAddressId: billingAddressId || shippingAddressId,
      shippingMethod,
      paymentMethod,
      items,
      customerNotes,
      paczkomatCode: pickupPointCode,
      paczkomatAddress: pickupPointAddress,
    });

    // Clear cart after order creation
    await cartService.clearCart(cart.id);

    // Handle payment
    if (paymentMethod === 'cod') {
      // Cash on delivery - no payment redirect needed
      await paymentService.createCODPayment(order.id, total);
      
      res.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'created',
        paymentMethod: 'cod',
        total,
        redirectUrl: `/order/${order.id}/confirmation`,
      });
    } else {
      // Create payment session with PayU
      // Get first URL from FRONTEND_URL (may be comma-separated)
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
      
      // Map frontend payment method to API payment method type
      const mappedPaymentMethod = mapPaymentMethod(paymentMethod);
      console.log(`💳 Payment method mapping: ${paymentMethod} → ${mappedPaymentMethod}`);
      
      const paymentRequest: CreatePaymentRequest = {
        orderId: order.id,
        amount: total,
        currency: 'PLN',
        paymentMethod: mappedPaymentMethod,
        providerId: 'payu' as PaymentProviderId, // Force PayU for testing
        customer: {
          email: req.user?.email || '',
          firstName: '',
          lastName: '',
        },
        description: `Zamówienie ${order.orderNumber}`,
        returnUrl: `${frontendUrl}/order/${order.id}/confirmation`,
        cancelUrl: `${frontendUrl}/checkout?orderId=${order.id}&cancelled=true`,
        notifyUrl: `${process.env.APP_URL || 'http://localhost:5000'}/api/webhooks/payu`,
        metadata: {
          customerIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
        },
      };

      console.log('Creating PayU payment request:', paymentRequest);

      const paymentSession = await paymentService.createPayment(paymentRequest);

      console.log('PayU payment session created:', paymentSession);

      res.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'pending_payment',
        paymentUrl: paymentSession.paymentUrl,
        sessionId: paymentSession.sessionId,
        total,
      });
    }
  } catch (error) {
    console.error('❌ Error creating checkout:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({ 
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}

/**
 * Verify payment status after redirect
 */
export async function verifyPayment(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId } = req.params;

    const result = await paymentService.verifyPayment(sessionId);

    res.json({
      status: result.status,
      orderId: result.orderId,
      transactionId: result.transactionId,
      paidAt: result.paidAt,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
}

/**
 * Handle payment webhook
 */
export async function paymentWebhook(req: Request, res: Response): Promise<void> {
  try {
    const providerId = req.params.provider as PaymentProviderId || 'payu';
    const signature = req.headers['x-signature'] as string || '';
    const payload = JSON.stringify(req.body);

    const result = await paymentService.processWebhook(providerId, payload, signature);

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    res.status(400).json({ message: 'Webhook processing failed' });
  }
}

/**
 * Handle PayU payment webhook
 * PayU sends signature in OpenPayU-Signature header
 */
export async function payuWebhook(req: Request, res: Response): Promise<void> {
  try {
    // PayU signature format: signature=<md5>;algorithm=MD5;sender=checkout
    const signature = req.headers['openpayu-signature'] as string || '';
    const payload = JSON.stringify(req.body);

    console.log('PayU webhook received:', {
      signature,
      body: req.body,
    });

    const result = await paymentService.processWebhook('payu', payload, signature);

    console.log('PayU webhook processed:', result);

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing PayU webhook:', error);
    res.status(400).json({ message: 'Webhook processing failed' });
  }
}

/**
 * Handle shipping webhook
 */
export async function shippingWebhook(req: Request, res: Response): Promise<void> {
  try {
    const providerId = req.params.provider as ShippingProviderId;
    const signature = req.headers['x-signature'] as string || '';
    const payload = JSON.stringify(req.body);

    await shippingService.processWebhook(providerId, payload, signature);

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing shipping webhook:', error);
    res.status(400).json({ message: 'Webhook processing failed' });
  }
}

/**
 * Get tracking info for an order
 */
export async function getOrderTracking(req: Request, res: Response): Promise<void> {
  try {
    const { orderId } = req.params;
    const userId = (req as any).user?.id;

    // Get order and verify ownership
    const order = await ordersService.getById(orderId);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.userId !== userId) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    if (!order.trackingNumber) {
      res.status(404).json({ message: 'No tracking information available' });
      return;
    }

    // Determine provider from shipping method
    const providerId = order.shippingMethod.includes('inpost') 
      ? (order.shippingMethod as ShippingProviderId)
      : 'inpost_kurier';

    const tracking = await shippingService.getTracking(providerId, order.trackingNumber);

    res.json({
      trackingNumber: tracking.trackingNumber,
      status: tracking.status,
      estimatedDelivery: tracking.estimatedDelivery,
      events: tracking.events,
    });
  } catch (error) {
    console.error('Error getting tracking:', error);
    res.status(500).json({ message: 'Failed to get tracking info' });
  }
}
