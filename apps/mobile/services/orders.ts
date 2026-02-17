import { api } from './api';
import type { Order, CheckoutRequest, CheckoutResponse, ShippingMethod } from './types';

export const ordersApi = {
  getAll: (page?: number, limit?: number) =>
    api.get<{ orders: Order[]; pagination: any }>('/orders', { page, limit }),

  getById: (id: string) =>
    api.get<{ order: Order }>(`/orders/${id}`),

  cancel: (id: string) =>
    api.delete<any>(`/orders/${id}`),
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
