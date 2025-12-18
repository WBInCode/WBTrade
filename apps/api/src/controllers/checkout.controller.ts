/**
 * Checkout Controller
 * Handles checkout process including shipping and payment
 */

import { Request, Response } from 'express';
import { shippingService } from '../services/shipping.service';
import { paymentService } from '../services/payment.service';
import { OrdersService } from '../services/orders.service';
import { CartService } from '../services/cart.service';
import { ShippingProviderId } from '../types/shipping.types';
import { CreatePaymentRequest, PaymentMethodType, PaymentProviderId } from '../types/payment.types';

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
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'] as string | undefined;
    
    if (!userId) {
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

    // Validate required fields
    if (!shippingMethod || !paymentMethod || !acceptTerms) {
      res.status(400).json({ 
        message: 'Shipping method, payment method, and terms acceptance are required' 
      });
      return;
    }

    // Get user's cart - try both userId and sessionId
    // First try by userId, then by sessionId if user has session cart
    let cart = await cartService.getOrCreateCart(userId);
    
    // If cart by userId is empty but we have sessionId, try to merge or get session cart
    if ((!cart || !cart.items.length) && sessionId) {
      // Try to get cart by sessionId
      const sessionCart = await cartService.getOrCreateCart(undefined, sessionId);
      if (sessionCart && sessionCart.items.length > 0) {
        // Merge session cart to user cart
        cart = await cartService.mergeCarts(userId, sessionId);
      }
    }
    
    if (!cart || !cart.items.length) {
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
    
    // Get shipping rate
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
    const shippingCost = shippingRates[0]?.price || 0;

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
      // In development mode, redirect to local payment simulation page
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      if (isDevelopment) {
        // Use local payment simulation
        res.json({
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: 'pending_payment',
          paymentUrl: `${frontendUrl}/order/${order.id}/payment`,
          sessionId: `sim_${order.id}`,
          total,
        });
      } else {
        // Create real payment session for production
        const paymentRequest: CreatePaymentRequest = {
          orderId: order.id,
          amount: total,
          currency: 'PLN',
          paymentMethod: paymentMethod as PaymentMethodType,
          customer: {
            email: req.user?.email || '',
            firstName: '',
            lastName: '',
          },
          description: `Zamówienie ${order.orderNumber}`,
          returnUrl: `${frontendUrl}/order/${order.id}/confirmation`,
          cancelUrl: `${frontendUrl}/checkout?orderId=${order.id}&cancelled=true`,
          notifyUrl: `${process.env.API_URL}/api/webhooks/payment`,
        };

        const paymentSession = await paymentService.createPayment(paymentRequest);

        res.json({
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: 'pending_payment',
          paymentUrl: paymentSession.paymentUrl,
          sessionId: paymentSession.sessionId,
          total,
        });
      }
    }
  } catch (error) {
    console.error('Error creating checkout:', error);
    res.status(500).json({ message: 'Failed to create order' });
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
    const providerId = req.params.provider as PaymentProviderId || 'przelewy24';
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
