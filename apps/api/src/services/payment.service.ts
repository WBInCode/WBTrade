/**
 * Payment Service
 * Manages payment provider integrations and payment operations
 */

import {
  PaymentProviderId,
  PaymentMethodType,
  AvailablePaymentMethod,
  CreatePaymentRequest,
  PaymentSession,
  PaymentResult,
  RefundRequest,
  RefundResult,
  PaymentProviderConfig,
} from '../types/payment.types';
import { IPaymentProvider } from '../providers/payment/payment-provider.interface';
import { Przelewy24Provider } from '../providers/payment/przelewy24.provider';
import { PayUProvider } from '../providers/payment/payu.provider';
import { prisma } from '../db';

// Provider configurations from environment
const providerConfigs: Record<PaymentProviderId, Partial<PaymentProviderConfig>> = {
  przelewy24: {
    merchantId: process.env.P24_MERCHANT_ID,
    apiKey: process.env.P24_API_KEY,
    crcKey: process.env.P24_CRC_KEY,
    sandbox: process.env.NODE_ENV !== 'production',
  },
  stripe: {
    apiKey: process.env.STRIPE_SECRET_KEY,
    sandbox: process.env.NODE_ENV !== 'production',
  },
  payu: {
    merchantId: process.env.PAYU_POS_ID,
    apiKey: process.env.PAYU_MD5_KEY,
    sandbox: process.env.NODE_ENV !== 'production',
  },
  tpay: {
    merchantId: process.env.TPAY_MERCHANT_ID,
    apiKey: process.env.TPAY_API_KEY,
    apiSecret: process.env.TPAY_API_SECRET,
    sandbox: process.env.NODE_ENV !== 'production',
  },
  blik_direct: {
    // BLIK direct integration (requires bank agreement)
    sandbox: process.env.NODE_ENV !== 'production',
  },
  paypo: {
    merchantId: process.env.PAYPO_MERCHANT_ID,
    apiKey: process.env.PAYPO_API_KEY,
    sandbox: process.env.NODE_ENV !== 'production',
  },
};

// Default provider to use
const DEFAULT_PROVIDER: PaymentProviderId = 'payu';

export class PaymentService {
  private providers: Map<PaymentProviderId, IPaymentProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize available payment providers
   */
  private initializeProviders() {
    // Initialize Przelewy24 provider - DISABLED FOR TESTING
    // const p24Config = providerConfigs.przelewy24;
    // if (p24Config.merchantId || process.env.NODE_ENV !== 'production') {
    //   this.providers.set('przelewy24', new Przelewy24Provider(p24Config));
    // }

    // Initialize PayU provider (PRIMARY for testing)
    const payuConfig = providerConfigs.payu;
    if (payuConfig.merchantId || process.env.PAYU_POS_ID) {
      this.providers.set('payu', new PayUProvider(payuConfig));
      console.log('PayU provider initialized (sandbox:', payuConfig.sandbox, ')');
    }

    // TODO: Initialize other providers (Stripe, TPay)
  }

  /**
   * Get provider instance
   */
  private getProvider(providerId: PaymentProviderId): IPaymentProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Payment provider ${providerId} is not available`);
    }
    return provider;
  }

  /**
   * Get best provider for payment method
   */
  private getProviderForMethod(method: PaymentMethodType): IPaymentProvider {
    // Find provider that supports this method
    for (const provider of this.providers.values()) {
      if (provider.config.supportedMethods.includes(method)) {
        return provider;
      }
    }

    // Fallback to default provider
    return this.getProvider(DEFAULT_PROVIDER);
  }

  /**
   * Get all available payment methods
   */
  async getAvailablePaymentMethods(): Promise<AvailablePaymentMethod[]> {
    const methods: AvailablePaymentMethod[] = [];

    for (const provider of this.providers.values()) {
      try {
        const providerMethods = await provider.getAvailableMethods();
        methods.push(...providerMethods);
      } catch (error) {
        console.error(`Error getting methods from ${provider.providerId}:`, error);
      }
    }

    // Add Cash on Delivery (handled internally, no provider)
    methods.push({
      id: 'cod',
      type: 'cod',
      name: 'Płatność przy odbiorze',
      providerId: 'payu', // Not actually used
      fee: 5.00,
      feeType: 'fixed',
      description: 'Zapłać kurierowi przy odbiorze',
    });

    return methods;
  }

  /**
   * Create payment session
   */
  async createPayment(request: CreatePaymentRequest): Promise<PaymentSession> {
    // Determine which provider to use
    const provider = request.providerId 
      ? this.getProvider(request.providerId)
      : this.getProviderForMethod(request.paymentMethod);

    const session = await provider.createPayment(request);

    // Store payment session in database
    await this.storePaymentSession(session);

    return session;
  }

  /**
   * Verify payment status
   */
  async verifyPayment(sessionId: string): Promise<PaymentResult> {
    // Get stored session to determine provider
    const storedSession = await this.getStoredSession(sessionId);
    if (!storedSession) {
      throw new Error('Payment session not found');
    }

    const provider = this.getProvider(storedSession.providerId as PaymentProviderId);
    const result = await provider.verifyPayment(sessionId);

    // Update order payment status
    await this.updateOrderPaymentStatus(result);

    return result;
  }

  /**
   * Process refund
   */
  async refund(request: RefundRequest): Promise<RefundResult> {
    // Get payment info to determine provider
    const payment = await prisma.order.findFirst({
      where: { 
        OR: [
          { id: request.paymentId },
          { orderNumber: request.paymentId },
        ]
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // For now, use default provider
    const provider = this.getProvider(DEFAULT_PROVIDER);
    const result = await provider.refund(request);

    // Update order status
    if (result.status === 'succeeded') {
      await prisma.order.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: payment.id,
          status: 'REFUNDED',
          note: `Refund processed: ${result.amount} ${result.currency}`,
        },
      });
    }

    return result;
  }

  /**
   * Cancel pending payment
   */
  async cancelPayment(sessionId: string): Promise<boolean> {
    const storedSession = await this.getStoredSession(sessionId);
    if (!storedSession) {
      return false;
    }

    const provider = this.getProvider(storedSession.providerId as PaymentProviderId);
    return provider.cancelPayment(sessionId);
  }

  /**
   * Process webhook from payment provider
   */
  async processWebhook(
    providerId: PaymentProviderId,
    payload: string,
    signature: string
  ): Promise<PaymentResult> {
    const provider = this.getProvider(providerId);

    // Validate webhook signature
    if (!provider.validateWebhook(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const data = JSON.parse(payload);
    const result = await provider.processWebhook(data);

    // Update order payment status
    await this.updateOrderPaymentStatus(result);

    return result;
  }

  /**
   * Store payment session in database
   */
  private async storePaymentSession(session: PaymentSession): Promise<void> {
    // You would typically store this in a PaymentSession table
    // For now, we'll update the order with payment info
    await prisma.order.update({
      where: { id: session.orderId },
      data: {
        paymentMethod: session.providerId,
        // Store session ID in notes or dedicated field
      },
    });
  }

  /**
   * Get stored payment session
   */
  private async getStoredSession(sessionId: string): Promise<{ orderId: string; providerId: string } | null> {
    // Extract order ID from session ID (format: orderId_timestamp)
    const [orderId] = sessionId.split('_');
    
    const order = await prisma.order.findFirst({
      where: { id: orderId },
      select: { id: true, paymentMethod: true },
    });

    if (!order) {
      return null;
    }

    return {
      orderId: order.id,
      providerId: order.paymentMethod || DEFAULT_PROVIDER,
    };
  }

  /**
   * Update order payment status based on payment result
   */
  private async updateOrderPaymentStatus(result: PaymentResult): Promise<void> {
    const statusMap: Record<string, string> = {
      'succeeded': 'PAID',
      'failed': 'PAYMENT_FAILED',
      'cancelled': 'CANCELLED',
      'refunded': 'REFUNDED',
    };

    const newStatus = statusMap[result.status];
    if (!newStatus) {
      return;
    }

    const order = await prisma.order.findFirst({
      where: { id: result.orderId },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus as any },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: newStatus as any,
          note: `Payment ${result.status}${result.transactionId ? ` (Transaction: ${result.transactionId})` : ''}`,
        },
      });

      // If payment succeeded, we might want to trigger other actions
      if (result.status === 'succeeded') {
        // e.g., send confirmation email, start fulfillment, etc.
      }
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): PaymentProviderId[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Handle Cash on Delivery orders
   */
  async createCODPayment(orderId: string, amount: number): Promise<PaymentSession> {
    // COD is handled differently - no external payment session
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: 'cod',
        status: 'PROCESSING', // Move to processing without payment
      },
    });

    return {
      id: `cod_${orderId}`,
      orderId,
      providerId: 'przelewy24', // Placeholder
      sessionId: `cod_${orderId}`,
      paymentUrl: '', // No redirect needed
      amount,
      currency: 'PLN',
      status: 'pending',
      createdAt: new Date(),
    };
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
