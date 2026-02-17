import { useState, useCallback } from 'react';
import { api } from '../services/api';
import type {
  ShippingMethod,
  CheckoutRequest,
  CheckoutResponse,
} from '../services/types';

export interface AddressData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  apartment: string;
  postalCode: string;
  city: string;
  country: string;
  saveAddress: boolean;
  // Billing / Invoice
  wantInvoice: boolean;
  billingCompanyName: string;
  billingNip: string;
  billingStreet: string;
  billingCity: string;
  billingPostalCode: string;
}

export interface ShippingData {
  method: string;
  methodName: string;
  price: number;
  pickupPointCode?: string;
  pickupPointName?: string;
}

export interface PaymentData {
  method: string;
  methodName: string;
}

export interface CheckoutState {
  step: number;
  address: AddressData | null;
  shipping: ShippingData | null;
  payment: PaymentData | null;
  acceptTerms: boolean;
}

const initialAddress: AddressData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  apartment: '',
  postalCode: '',
  city: '',
  country: 'PL',
  saveAddress: true,
  wantInvoice: false,
  billingCompanyName: '',
  billingNip: '',
  billingStreet: '',
  billingCity: '',
  billingPostalCode: '',
};

export function useCheckout() {
  const [state, setState] = useState<CheckoutState>({
    step: 0,
    address: null,
    shipping: null,
    payment: null,
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigation
  const goToStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({ ...prev, step: prev.step + 1 }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({ ...prev, step: Math.max(0, prev.step - 1) }));
  }, []);

  // Set data
  const setAddress = useCallback((address: AddressData) => {
    setState(prev => ({ ...prev, address }));
  }, []);

  const setShipping = useCallback((shipping: ShippingData) => {
    setState(prev => ({ ...prev, shipping }));
  }, []);

  const setPayment = useCallback((payment: PaymentData) => {
    setState(prev => ({ ...prev, payment }));
  }, []);

  const setAcceptTerms = useCallback((accept: boolean) => {
    setState(prev => ({ ...prev, acceptTerms: accept }));
  }, []);

  // API calls
  const fetchShippingMethods = useCallback(async (postalCode: string): Promise<ShippingMethod[]> => {
    try {
      const response = await api.get<{ methods: ShippingMethod[] }>('/checkout/shipping/methods', {
        postalCode,
      });
      return response.methods || [];
    } catch (err: any) {
      console.error('Error fetching shipping methods:', err);
      return [];
    }
  }, []);

  const fetchPickupPoints = useCallback(async (postalCode: string) => {
    try {
      const response = await api.get<{ pickupPoints: any[] }>('/checkout/shipping/pickup-points', {
        postalCode,
      });
      return response.pickupPoints || [];
    } catch (err: any) {
      console.error('Error fetching pickup points:', err);
      return [];
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const response = await api.get<{ methods: any[] }>('/checkout/payment/methods');
      return response.methods || [];
    } catch (err: any) {
      console.error('Error fetching payment methods:', err);
      return [];
    }
  }, []);

  const fetchSavedAddresses = useCallback(async () => {
    try {
      const response = await api.get<{ addresses: any[] }>('/addresses');
      return response.addresses || [];
    } catch (err: any) {
      console.error('Error fetching addresses:', err);
      return [];
    }
  }, []);

  // Place order
  const placeOrder = useCallback(async (): Promise<CheckoutResponse | null> => {
    if (!state.address || !state.shipping || !state.payment) {
      setError('Wypełnij wszystkie dane przed złożeniem zamówienia');
      return null;
    }

    if (!state.acceptTerms) {
      setError('Musisz zaakceptować regulamin');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // First create address if user wants to save
      let shippingAddressId: string | undefined;

      if (state.address.saveAddress) {
        try {
          const addressRes = await api.post<{ address: { id: string } }>('/addresses', {
            firstName: state.address.firstName,
            lastName: state.address.lastName,
            phone: state.address.phone,
            street: state.address.street,
            apartment: state.address.apartment,
            postalCode: state.address.postalCode,
            city: state.address.city,
            country: state.address.country,
          });
          shippingAddressId = addressRes.address?.id;
        } catch {
          // Address saving is optional, continue with guest checkout
        }
      }

      const checkoutData: any = {
        shippingMethod: state.shipping.method,
        paymentMethod: state.payment.method,
        acceptTerms: state.acceptTerms,
        wantInvoice: state.address.wantInvoice,
      };

      if (shippingAddressId) {
        checkoutData.shippingAddressId = shippingAddressId;
      } else {
        // Guest checkout - inline address
        checkoutData.guestEmail = state.address.email;
        checkoutData.guestFirstName = state.address.firstName;
        checkoutData.guestLastName = state.address.lastName;
        checkoutData.guestPhone = state.address.phone;
        checkoutData.guestAddress = {
          street: state.address.street,
          apartment: state.address.apartment,
          postalCode: state.address.postalCode,
          city: state.address.city,
          country: state.address.country,
        };
      }

      if (state.shipping.pickupPointCode) {
        checkoutData.pickupPointCode = state.shipping.pickupPointCode;
      }

      if (state.address.wantInvoice) {
        checkoutData.billingCompanyName = state.address.billingCompanyName;
        checkoutData.billingNip = state.address.billingNip;
        checkoutData.billingAddress = {
          street: state.address.billingStreet,
          city: state.address.billingCity,
          postalCode: state.address.billingPostalCode,
          country: state.address.country,
        };
      }

      const response = await api.post<CheckoutResponse>('/checkout', checkoutData);
      return response;
    } catch (err: any) {
      setError(err.message || 'Nie udało się złożyć zamówienia');
      return null;
    } finally {
      setLoading(false);
    }
  }, [state]);

  return {
    state,
    loading,
    error,
    setError,
    goToStep,
    nextStep,
    prevStep,
    setAddress,
    setShipping,
    setPayment,
    setAcceptTerms,
    fetchShippingMethods,
    fetchPickupPoints,
    fetchPaymentMethods,
    fetchSavedAddresses,
    placeOrder,
    initialAddress,
  };
}
