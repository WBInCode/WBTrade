/**
 * Payment Provider Interface
 * Base interface that all payment provider implementations must follow
 */

import {
  PaymentProviderConfig,
  PaymentProviderId,
  PaymentMethodType,
  AvailablePaymentMethod,
  CreatePaymentRequest,
  PaymentSession,
  PaymentResult,
  RefundRequest,
  RefundResult,
} from '../../types/payment.types';

export interface IPaymentProvider {
  readonly providerId: PaymentProviderId;
  readonly config: PaymentProviderConfig;

  /**
   * Get available payment methods for this provider
   */
  getAvailableMethods(): Promise<AvailablePaymentMethod[]>;

  /**
   * Create a payment session/transaction
   */
  createPayment(request: CreatePaymentRequest): Promise<PaymentSession>;

  /**
   * Verify payment status (after redirect from payment gateway)
   */
  verifyPayment(sessionId: string): Promise<PaymentResult>;

  /**
   * Process refund
   */
  refund(request: RefundRequest): Promise<RefundResult>;

  /**
   * Cancel a pending payment
   */
  cancelPayment(sessionId: string): Promise<boolean>;

  /**
   * Validate webhook signature from provider
   */
  validateWebhook(payload: string, signature: string): boolean;

  /**
   * Process webhook payload
   */
  processWebhook(payload: any): Promise<PaymentResult>;
}
