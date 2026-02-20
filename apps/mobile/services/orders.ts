import { api } from './api';
import type { Order, CheckoutRequest, CheckoutResponse, ShippingMethod } from './types';

export const ordersApi = {
  getAll: (page?: number, limit?: number) =>
    api.get<{ orders: Order[]; pagination: any }>('/orders', { page, limit }),

  getById: (id: string) =>
    api.get<{ order: Order }>(`/orders/${id}`),

  cancel: (id: string) =>
    api.delete<any>(`/orders/${id}`),

  getTracking: (id: string) =>
    api.get<{
      orderId: string;
      packages: Array<{
        packageIndex: number;
        courierCode: string;
        courierName: string;
        trackingNumber: string | null;
        trackingLink?: string;
        isSent: boolean;
      }>;
    }>(`/orders/${id}/tracking`),

  getRefundEligibility: (id: string) =>
    api.get<{
      eligible: boolean;
      reason?: string;
      daysRemaining?: number;
      deliveredAt?: string;
    }>(`/orders/${id}/refund-eligibility`),

  requestRefund: (id: string, reason?: string) =>
    api.post<{
      success: boolean;
      refundNumber?: string;
      returnAddress?: {
        name: string;
        contactPerson: string;
        street: string;
        city: string;
        postalCode: string;
        country: string;
      };
    }>(`/orders/${id}/request-refund`, { reason }),
};

export const checkoutApi = {
  getShippingMethods: (postalCode: string, city?: string) =>
    api.get<{ methods: ShippingMethod[] }>('/checkout/shipping/methods', { postalCode, city }),

  getPaymentMethods: () =>
    api.get<{ methods: any[] }>('/checkout/payment/methods'),

  createCheckout: (data: CheckoutRequest) =>
    api.post<CheckoutResponse>('/checkout', data),

  verifyPayment: (sessionId: string) =>
    api.get<any>(`/checkout/payment/verify/${sessionId}`),

  retryPayment: (orderId: string) =>
    api.post<CheckoutResponse>(`/checkout/payment/retry/${orderId}`),
};
