import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCheckout, type AddressData, type ShippingData } from '../../hooks/useCheckout';
import AddressForm from '../../components/checkout/AddressForm';
import ShippingPerPackage from '../../components/checkout/ShippingPerPackage';
import OrderSummary from '../../components/checkout/OrderSummary';
import { api } from '../../services/api';

export default function CheckoutScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { cart, refreshCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const checkout = useCheckout();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');

  // Load saved addresses for logged-in users
  useEffect(() => {
    if (isAuthenticated) {
      loadSavedAddresses();
    }
  }, [isAuthenticated]);

  // Android hardware back: go to previous step instead of leaving checkout
  useEffect(() => {
    const onBackPress = () => {
      if (checkout.state.step > 0) {
        checkout.prevStep();
        return true; // prevent default (leaving checkout)
      }
      return false; // allow default (go back to cart)
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [checkout.state.step]);

  // Update navigation header title per step
  useEffect(() => {
    const stepTitles = ['Adres dostawy', 'Metoda dostawy', 'Podsumowanie'];
    navigation.setOptions({
      title: stepTitles[checkout.state.step] || 'Zamówienie',
    });
  }, [checkout.state.step, navigation]);

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
  const steps = ['Adres', 'Dostawa', 'Podsumowanie'];

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
    // Auto-set payment to PayU (only option)
    checkout.setPayment({
      method: 'payu',
      methodName: 'PayU',
    });
    checkout.nextStep();
  };

  const [packageShippingData, setPackageShippingData] = useState<any[]>([]);


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
      // Logged-in: reuse saved address or create new one
      try {
        if (address.savedAddressId) {
          // User selected an existing saved address — no need to create a new one
          checkoutData.shippingAddressId = address.savedAddressId;
        } else {
          const addressRes = await api.post<{ id: string }>('/addresses', {
            firstName: address.firstName,
            lastName: address.lastName,
            phone: address.phone,
            street: address.street,
            apartment: address.apartment,
            postalCode: address.postalCode,
            city: address.city,
            country: address.country || 'PL',
          });
          checkoutData.shippingAddressId = addressRes.id;
        }

        if (address.wantInvoice) {
          const billingRes = await api.post<{ id: string }>('/addresses', {
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
          checkoutData.billingAddressId = billingRes.id;
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
      <SafeAreaView style={styles.emptyContainer} edges={['bottom']}>
        <Text style={styles.emptyText}>Koszyk jest pusty</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Step progress bar */}
      <View style={styles.progressBar}>
        {steps.map((label, index) => (
          <React.Fragment key={label}>
            <View style={styles.progressStep}>
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
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.progressConnector,
                  index < checkout.state.step && styles.progressConnectorActive,
                ]}
              />
            )}
          </React.Fragment>
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

      {checkout.state.step === 2 && checkout.state.address && checkout.state.shipping && checkout.state.payment && (
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressStep: {
    alignItems: 'center',
    width: 60,
  },
  progressConnector: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.borderLight || colors.border,
    marginTop: 13,
    marginHorizontal: -4,
  },
  progressConnectorActive: {
    backgroundColor: colors.success,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: colors.tint,
  },
  progressDotCompleted: {
    backgroundColor: colors.success,
  },
  progressNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  progressNumberActive: {
    color: colors.textInverse,
  },
  progressCheck: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
  },
  progressLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  progressLabelActive: {
    color: colors.tint,
    fontWeight: '600',
  },
});
