/**
 * Przelewy24 Payment Provider
 * Integration with Przelewy24 (P24) payment gateway
 * 
 * API Documentation: https://developers.przelewy24.pl/
 */

import crypto from 'crypto';
import { IPaymentProvider } from './payment-provider.interface';
import {
  PaymentProviderConfig,
  PaymentProviderId,
  AvailablePaymentMethod,
  CreatePaymentRequest,
  PaymentSession,
  PaymentResult,
  RefundRequest,
  RefundResult,
  PaymentStatus,
} from '../../types/payment.types';

export class Przelewy24Provider implements IPaymentProvider {
  readonly providerId: PaymentProviderId = 'przelewy24';
  readonly config: PaymentProviderConfig;

  private baseUrl: string;

  constructor(config: Partial<PaymentProviderConfig>) {
    this.config = {
      id: 'przelewy24',
      name: 'Przelewy24',
      enabled: true,
      apiUrl: config.sandbox
        ? 'https://sandbox.przelewy24.pl'
        : 'https://secure.przelewy24.pl',
      merchantId: config.merchantId || process.env.P24_MERCHANT_ID || '',
      apiKey: config.apiKey || process.env.P24_API_KEY || '',
      crcKey: config.crcKey || process.env.P24_CRC_KEY || '',
      sandbox: config.sandbox ?? process.env.NODE_ENV !== 'production',
      webhookSecret: config.webhookSecret || process.env.P24_WEBHOOK_SECRET,
      supportedMethods: ['blik', 'card', 'bank_transfer', 'google_pay', 'apple_pay', 'p24'],
    };
    this.baseUrl = this.config.apiUrl;
  }

  /**
   * Get authorization header
   */
  private getAuthHeader(): string {
    const credentials = `${this.config.merchantId}:${this.config.apiKey}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  /**
   * Generate CRC signature for P24
   */
  private generateSign(data: Record<string, any>): string {
    const signString = JSON.stringify(data) + this.config.crcKey;
    return crypto.createHash('sha384').update(signString).digest('hex');
  }

  /**
   * Make API request to P24
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(`P24 API error: ${data.error || response.statusText}`);
    }

    return data;
  }

  /**
   * Get available payment methods
   */
  async getAvailableMethods(): Promise<AvailablePaymentMethod[]> {
    // P24 method IDs: https://developers.przelewy24.pl/index.php?pl#tag/Transaction-service/operation/api.v1.payment.methods.get
    return [
      {
        id: 'p24_blik',
        type: 'blik',
        name: 'BLIK',
        providerId: 'przelewy24',
        fee: 0,
        feeType: 'fixed',
        description: 'Szybka płatność kodem BLIK',
      },
      {
        id: 'p24_card',
        type: 'card',
        name: 'Karta płatnicza',
        providerId: 'przelewy24',
        fee: 0,
        feeType: 'fixed',
        description: 'Visa, Mastercard, Maestro',
      },
      {
        id: 'p24_google_pay',
        type: 'google_pay',
        name: 'Google Pay',
        providerId: 'przelewy24',
        fee: 0,
        feeType: 'fixed',
      },
      {
        id: 'p24_apple_pay',
        type: 'apple_pay',
        name: 'Apple Pay',
        providerId: 'przelewy24',
        fee: 0,
        feeType: 'fixed',
      },
      {
        id: 'p24_transfer',
        type: 'bank_transfer',
        name: 'Przelew bankowy',
        providerId: 'przelewy24',
        fee: 0,
        feeType: 'fixed',
        description: 'mBank, PKO BP, Santander, ING i inne',
      },
    ];
  }

  /**
   * Create payment session
   */
  async createPayment(request: CreatePaymentRequest): Promise<PaymentSession> {
    // Convert amount to grosz (P24 uses smallest currency unit)
    const amountInGrosze = Math.round(request.amount * 100);
    
    const sessionData = {
      merchantId: parseInt(this.config.merchantId),
      posId: parseInt(this.config.merchantId),
      sessionId: `${request.orderId}_${Date.now()}`,
      amount: amountInGrosze,
      currency: request.currency.toUpperCase(),
      description: request.description || `Zamówienie ${request.orderId}`,
      email: request.customer.email,
      client: request.customer.firstName && request.customer.lastName
        ? `${request.customer.firstName} ${request.customer.lastName}`
        : undefined,
      phone: request.customer.phone,
      address: request.billingAddress?.street,
      city: request.billingAddress?.city,
      zip: request.billingAddress?.postalCode,
      country: request.billingAddress?.country || 'PL',
      language: 'pl',
      method: this.mapPaymentMethod(request.paymentMethod),
      urlReturn: request.returnUrl,
      urlStatus: request.notifyUrl,
      timeLimit: 15, // 15 minutes
      encoding: 'UTF-8',
      sign: '', // Will be calculated below
    };

    // Generate signature
    const signData = {
      sessionId: sessionData.sessionId,
      merchantId: sessionData.merchantId,
      amount: sessionData.amount,
      currency: sessionData.currency,
      crc: this.config.crcKey,
    };
    sessionData.sign = this.generateSign(signData);

    if (this.config.sandbox) {
      return this.createMockSession(request, sessionData.sessionId);
    }

    const response = await this.request<any>('POST', '/api/v1/transaction/register', sessionData);

    return {
      id: sessionData.sessionId,
      orderId: request.orderId,
      providerId: 'przelewy24',
      sessionId: sessionData.sessionId,
      paymentUrl: `${this.baseUrl}/trnRequest/${response.data.token}`,
      amount: request.amount,
      currency: request.currency,
      status: 'pending',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdAt: new Date(),
    };
  }

  /**
   * Verify payment after redirect
   */
  async verifyPayment(sessionId: string): Promise<PaymentResult> {
    if (this.config.sandbox) {
      return this.createMockResult(sessionId, 'succeeded');
    }

    // In real implementation, this would check stored transaction data
    // and verify with P24 API
    const response = await this.request<any>('GET', `/api/v1/transaction/by/sessionId/${sessionId}`);

    return {
      sessionId,
      orderId: response.data.orderId,
      status: this.mapStatus(response.data.status),
      transactionId: response.data.orderId?.toString(),
      amount: response.data.amount / 100,
      currency: response.data.currency,
      paidAt: response.data.dateTime ? new Date(response.data.dateTime) : undefined,
    };
  }

  /**
   * Process refund
   */
  async refund(request: RefundRequest): Promise<RefundResult> {
    if (this.config.sandbox) {
      return {
        id: `refund_${Date.now()}`,
        paymentId: request.paymentId,
        amount: request.amount || 0,
        currency: 'PLN',
        status: 'succeeded',
        createdAt: new Date(),
      };
    }

    const refundData = {
      requestId: `refund_${Date.now()}`,
      refundsUuid: crypto.randomUUID(),
      urlStatus: '', // Webhook URL for refund status
      refunds: [
        {
          orderId: parseInt(request.paymentId),
          sessionId: request.paymentId,
          amount: request.amount ? Math.round(request.amount * 100) : undefined,
          description: request.reason || 'Refund',
        },
      ],
    };

    const response = await this.request<any>('POST', '/api/v1/transaction/refund', refundData);

    return {
      id: refundData.refundsUuid,
      paymentId: request.paymentId,
      amount: (request.amount || 0),
      currency: 'PLN',
      status: response.data?.status === 'success' ? 'succeeded' : 'pending',
      createdAt: new Date(),
    };
  }

  /**
   * Cancel pending payment
   */
  async cancelPayment(sessionId: string): Promise<boolean> {
    // P24 doesn't support explicit cancellation
    // Transactions expire automatically after timeout
    return true;
  }

  /**
   * Validate webhook signature
   */
  validateWebhook(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHash('sha384')
      .update(payload + this.config.crcKey)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Process webhook notification
   */
  async processWebhook(payload: any): Promise<PaymentResult> {
    const { sessionId, orderId, amount, currency, statement } = payload;

    // Verify the transaction with P24
    const verifyData = {
      merchantId: parseInt(this.config.merchantId),
      posId: parseInt(this.config.merchantId),
      sessionId,
      amount,
      currency,
      orderId,
      sign: '', // Will be calculated
    };

    const signData = {
      sessionId,
      orderId,
      amount,
      currency,
      crc: this.config.crcKey,
    };
    verifyData.sign = this.generateSign(signData);

    if (!this.config.sandbox) {
      await this.request('PUT', '/api/v1/transaction/verify', verifyData);
    }

    return {
      sessionId,
      orderId: sessionId.split('_')[0], // Extract original order ID
      status: 'succeeded',
      transactionId: orderId?.toString(),
      amount: amount / 100,
      currency,
      paidAt: new Date(),
    };
  }

  // Helper methods
  private mapPaymentMethod(method: string): number | undefined {
    const methodMap: Record<string, number> = {
      'blik': 154,
      'card': 218,
      'google_pay': 229,
      'apple_pay': 232,
      'bank_transfer': 0, // All banks
    };
    return methodMap[method];
  }

  private mapStatus(p24Status: number): PaymentStatus {
    // P24 status codes
    const statusMap: Record<number, PaymentStatus> = {
      0: 'pending',
      1: 'processing',
      2: 'succeeded',
      3: 'failed',
    };
    return statusMap[p24Status] || 'pending';
  }

  // Mock methods for sandbox
  private createMockSession(request: CreatePaymentRequest, sessionId: string): PaymentSession {
    return {
      id: sessionId,
      orderId: request.orderId,
      providerId: 'przelewy24',
      sessionId,
      paymentUrl: `${this.baseUrl}/mock-payment?session=${sessionId}`,
      amount: request.amount,
      currency: request.currency,
      status: 'pending',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      createdAt: new Date(),
    };
  }

  private createMockResult(sessionId: string, status: PaymentStatus): PaymentResult {
    return {
      sessionId,
      orderId: sessionId.split('_')[0],
      status,
      transactionId: `mock_${Date.now()}`,
      amount: 0,
      currency: 'PLN',
      paidAt: status === 'succeeded' ? new Date() : undefined,
    };
  }
}
