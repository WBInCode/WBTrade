import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCheckout, type AddressData, type ShippingData } from '../../hooks/useCheckout';
import AddressForm from '../../components/checkout/AddressForm';
import ShippingPerPackage from '../../components/checkout/ShippingPerPackage';
import PaymentMethod from '../../components/checkout/PaymentMethod';
import OrderSummary from '../../components/checkout/OrderSummary';
import { api } from '../../services/api';

export default function CheckoutScreen() {
  const router = useRouter();
  const { cart, refreshCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const checkout = useCheckout();

  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');

  // Load saved addresses for logged-in users
  useEffect(() => {
    if (isAuthenticated) {
      loadSavedAddresses();
    }
  }, [isAuthenticated]);

  const loadSavedAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const addresses = await checkout.fetchSavedAddresses();
      setSavedAddresses(addresses);
    } catch {
      // Non-critical, continue without saved addresses
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Step indicators
  const steps = ['Adres', 'Dostawa', 'Płatność', 'Podsumowanie'];

  const handleAddressSubmit = (data: AddressData) => {
    checkout.setAddress(data);
    setGuestEmail(data.email);
    checkout.nextStep();
  };

  const handleShippingSubmit = (data: {
    method: string;
    price: number;
    packageShipping: any[];
  }) => {
    checkout.setShipping({
      method: data.method,
      methodName: getMethodName(data.method),
      price: data.price,
    });
    // Store package shipping in state for order creation
    setPackageShippingData(data.packageShipping);
    checkout.nextStep();
  };

  const [packageShippingData, setPackageShippingData] = useState<any[]>([]);

  const handlePaymentSubmit = (data: { method: string; methodName: string; extraFee: number }) => {
    checkout.setPayment({
      method: data.method,
      methodName: data.methodName,
    });
    checkout.nextStep();
  };

  const handlePlaceOrder = async () => {
    if (!checkout.state.address || !checkout.state.shipping || !checkout.state.payment) {
      checkout.setError('Brakuje danych zamówienia');
      return;
    }

    if (!checkout.state.acceptTerms) {
      checkout.setError('Musisz zaakceptować regulamin');
      return;
    }

    // Build checkout request
    const address = checkout.state.address;
    const shipping = checkout.state.shipping;
    const payment = checkout.state.payment;

    const checkoutData: any = {
      shippingMethod: shipping.method,
      paymentMethod: payment.method,
      acceptTerms: checkout.state.acceptTerms,
      wantInvoice: address.wantInvoice,
    };

    // Per-package shipping
    if (packageShippingData.length > 0) {
      checkoutData.packageShipping = packageShippingData;
    }

    if (isAuthenticated) {
      // Logged-in: create address first
      try {
        const addressRes = await api.post<{ address: { id: string } }>('/addresses', {
          firstName: address.firstName,
          lastName: address.lastName,
          phone: address.phone,
          street: address.street,
          apartment: address.apartment,
          postalCode: address.postalCode,
          city: address.city,
          country: address.country || 'PL',
        });
        checkoutData.shippingAddressId = addressRes.address?.id;

        if (address.wantInvoice) {
          const billingRes = await api.post<{ address: { id: string } }>('/addresses', {
            firstName: address.billingCompanyName,
            lastName: '',
            phone: address.phone,
            street: address.billingStreet,
            city: address.billingCity,
            postalCode: address.billingPostalCode,
            country: address.country || 'PL',
            companyName: address.billingCompanyName,
            nip: address.billingNip,
          });
          checkoutData.billingAddressId = billingRes.address?.id;
        }
      } catch (err: any) {
        // If address creation fails, try inline address
        checkoutData.guestEmail = address.email;
        checkoutData.guestFirstName = address.firstName;
        checkoutData.guestLastName = address.lastName;
        checkoutData.guestPhone = address.phone;
        checkoutData.guestAddress = {
          firstName: address.firstName,
          lastName: address.lastName,
          street: address.street,
          apartment: address.apartment,
          postalCode: address.postalCode,
          city: address.city,
          country: address.country || 'PL',
          phone: address.phone,
        };
      }
    } else {
      // Guest checkout
      checkoutData.guestEmail = address.email;
      checkoutData.guestFirstName = address.firstName;
      checkoutData.guestLastName = address.lastName;
      checkoutData.guestPhone = address.phone;
      checkoutData.guestAddress = {
        firstName: address.firstName,
        lastName: address.lastName,
        street: address.street,
        apartment: address.apartment,
        postalCode: address.postalCode,
        city: address.city,
        country: address.country || 'PL',
        phone: address.phone,
      };

      if (address.wantInvoice) {
        checkoutData.guestAddress.differentBillingAddress = true;
        checkoutData.guestAddress.billingAddress = {
          firstName: address.billingCompanyName,
          lastName: '',
          companyName: address.billingCompanyName,
          nip: address.billingNip,
          street: address.billingStreet,
          city: address.billingCity,
          postalCode: address.billingPostalCode,
          country: address.country || 'PL',
          phone: address.phone,
        };
      }
    }

    try {
      checkout.setError(null);
      const response = await api.post<{
        orderId: string;
        orderNumber: string;
        status: string;
        paymentUrl?: string;
        sessionId?: string;
        total: number;
      }>('/checkout', checkoutData);

      // Refresh cart (it's now empty)
      refreshCart();

      if (response.paymentUrl) {
        // Navigate to payment WebView
        router.replace(`/order/${response.orderId}/payment?url=${encodeURIComponent(response.paymentUrl)}` as any);
      } else {
        // COD or free order - go directly to confirmation
        router.replace(`/order/${response.orderId}/confirmation` as any);
      }
    } catch (err: any) {
      checkout.setError(err.message || 'Nie udało się złożyć zamówienia. Spróbuj ponownie.');
    }
  };

  const getMethodName = (methodId: string): string => {
    const names: Record<string, string> = {
      inpost_paczkomat: 'InPost Paczkomat',
      inpost_kurier: 'Kurier InPost',
      dpd_kurier: 'Kurier DPD',
      wysylka_gabaryt: 'Wysyłka gabarytowa',
      odbior_osobisty_outlet: 'Odbiór osobisty (Outlet)',
    };
    return names[methodId] || methodId;
  };

  if (!cart || cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Koszyk jest pusty</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Step progress bar */}
      <View style={styles.progressBar}>
        {steps.map((label, index) => (
          <View key={label} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                index <= checkout.state.step && styles.progressDotActive,
                index < checkout.state.step && styles.progressDotCompleted,
              ]}
            >
              {index < checkout.state.step ? (
                <Text style={styles.progressCheck}>✓</Text>
              ) : (
                <Text
                  style={[
                    styles.progressNumber,
                    index <= checkout.state.step && styles.progressNumberActive,
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.progressLabel,
                index <= checkout.state.step && styles.progressLabelActive,
              ]}
            >
              {label}
            </Text>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  index < checkout.state.step && styles.progressLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* Step content */}
      {checkout.state.step === 0 && (
        <AddressForm
          initialData={checkout.initialAddress}
          savedAddresses={savedAddresses}
          loadingAddresses={loadingAddresses}
          onSubmit={handleAddressSubmit}
          guestEmail={guestEmail}
        />
      )}

      {checkout.state.step === 1 && checkout.state.address && (
        <ShippingPerPackage
          postalCode={checkout.state.address.postalCode}
          onSubmit={handleShippingSubmit}
          onBack={checkout.prevStep}
        />
      )}

      {checkout.state.step === 2 && (
        <PaymentMethod
          onSubmit={handlePaymentSubmit}
          onBack={checkout.prevStep}
        />
      )}

      {checkout.state.step === 3 && checkout.state.address && checkout.state.shipping && checkout.state.payment && (
        <OrderSummary
          address={checkout.state.address}
          shipping={checkout.state.shipping}
          payment={checkout.state.payment}
          packageShipping={packageShippingData}
          acceptTerms={checkout.state.acceptTerms}
          onAcceptTermsChange={checkout.setAcceptTerms}
          onSubmit={handlePlaceOrder}
          onBack={checkout.prevStep}
          onGoToStep={checkout.goToStep}
          loading={checkout.loading}
          error={checkout.error}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.secondary[500],
  },
  progressBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.secondary[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: Colors.primary[500],
  },
  progressDotCompleted: {
    backgroundColor: Colors.success,
  },
  progressNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary[500],
  },
  progressNumberActive: {
    color: Colors.white,
  },
  progressCheck: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  progressLabel: {
    fontSize: 11,
    color: Colors.secondary[400],
    fontWeight: '500',
  },
  progressLabelActive: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  progressLine: {
    position: 'absolute',
    top: 14,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: Colors.secondary[200],
    zIndex: -1,
  },
  progressLineActive: {
    backgroundColor: Colors.success,
  },
});
