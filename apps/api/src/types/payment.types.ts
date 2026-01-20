/**
 * Payment Provider Types
 * Types and interfaces for payment provider integrations
 */

// Supported payment providers
export type PaymentProviderId = 
  | 'przelewy24'
  | 'stripe'
  | 'payu'
  | 'tpay'
  | 'blik_direct'
  | 'paypo';

// Payment methods available
export type PaymentMethodType = 
  | 'blik'
  | 'card'
  | 'google_pay'
  | 'apple_pay'
  | 'bank_transfer'
  | 'p24' // Przelewy24 specific banks
  | 'paypo' // Buy now pay later
  | 'cod'; // Cash on delivery (handled internally)

// Payment provider configuration
export interface PaymentProviderConfig {
  id: PaymentProviderId;
  name: string;
  enabled: boolean;
  apiUrl: string;
  merchantId: string;
  apiKey: string;
  apiSecret?: string;
  crcKey?: string; // For P24
  sandbox: boolean;
  webhookSecret?: string;
  supportedMethods: PaymentMethodType[];
}

// Available payment method for frontend
export interface AvailablePaymentMethod {
  id: string;
  type: PaymentMethodType;
  name: string;
  providerId: PaymentProviderId;
  icon?: string;
  fee: number;
  feeType: 'fixed' | 'percentage';
  minAmount?: number;
  maxAmount?: number;
  description?: string;
}

// Payment session creation request
export interface CreatePaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  providerId?: PaymentProviderId;
  customer: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  description?: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  metadata?: Record<string, string>;
}

// Payment session response
export interface PaymentSession {
  id: string;
  orderId: string;
  providerId: PaymentProviderId;
  sessionId: string;
  paymentUrl: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  expiresAt?: Date;
  createdAt: Date;
}

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'requires_action'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

// Payment verification request (for providers like P24)
export interface VerifyPaymentRequest {
  sessionId: string;
  orderId: string;
  amount: number;
  currency: string;
}

// Payment result after redirect
export interface PaymentResult {
  sessionId: string;
  orderId: string;
  status: PaymentStatus;
  transactionId?: string;
  amount: number;
  currency: string;
  paidAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  paymentMethodUsed?: string; // Actual payment method used (e.g., BLIK, CARD_TOKEN, PBL, GPAY, APAY)
}

// Refund request
export interface RefundRequest {
  paymentId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
}

// Refund response
export interface RefundResult {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  createdAt: Date;
}

// Webhook payload from payment providers
export interface PaymentWebhookPayload {
  providerId: PaymentProviderId;
  eventType: 'payment.success' | 'payment.failed' | 'payment.refunded' | 'payment.chargeback';
  sessionId: string;
  orderId: string;
  transactionId?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  timestamp: Date;
  signature?: string;
  rawPayload: Record<string, any>;
}

// BLIK specific types
export interface BlikPaymentRequest {
  orderId: string;
  amount: number;
  blikCode: string; // 6-digit code
  returnUrl: string;
}

export interface BlikPaymentResponse {
  transactionId: string;
  status: 'pending' | 'confirmed' | 'rejected';
  confirmationRequired: boolean;
}

// Card payment types (for Stripe/PayU)
export interface CardPaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  card?: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  };
  paymentMethodId?: string; // For saved cards
  saveCard?: boolean;
}

// Saved payment method
export interface SavedPaymentMethod {
  id: string;
  userId: string;
  providerId: PaymentProviderId;
  type: PaymentMethodType;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: Date;
}
