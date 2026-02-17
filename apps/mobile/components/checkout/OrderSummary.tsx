import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useCart } from '../../contexts/CartContext';
import type { AddressData } from '../../hooks/useCheckout';
import type { PackageShippingSelection } from './ShippingPerPackage';
import Button from '../ui/Button';

// ──── Warehouse Config (same as ShippingPerPackage) ────

const getWarehouseConfig = (wholesaler?: string): { name: string; color: string } => {
  const configs: Record<string, { name: string; color: string }> = {
    'HP': { name: 'Magazyn Zielona Góra', color: '#1D4ED8' },
    'Hurtownia Przemysłowa': { name: 'Magazyn Zielona Góra', color: '#1D4ED8' },
    'Ikonka': { name: 'Magazyn Białystok', color: '#7C3AED' },
    'BTP': { name: 'Magazyn Chotów', color: '#047857' },
    'Leker': { name: 'Magazyn Chynów', color: '#B91C1C' },
    'Rzeszów': { name: 'Magazyn Rzeszów', color: '#BE185D' },
    'Outlet': { name: 'Magazyn Rzeszów', color: '#BE185D' },
  };
  return configs[wholesaler || ''] || { name: 'Magazyn', color: '#374151' };
};

const METHOD_NAMES: Record<string, string> = {
  inpost_paczkomat: 'InPost Paczkomat',
  inpost_kurier: 'Kurier InPost',
  dpd_kurier: 'Kurier DPD',
  wysylka_gabaryt: 'Wysyłka gabarytowa',
  odbior_osobisty_outlet: 'Odbiór osobisty (Outlet)',
};

// ──── Types ────

interface ShippingData {
  method: string;
  methodName: string;
  price: number;
}

interface PaymentData {
  method: string;
  methodName: string;
}

interface OrderSummaryProps {
  address: AddressData;
  shipping: ShippingData;
  payment: PaymentData;
  packageShipping: PackageShippingSelection[];
  acceptTerms: boolean;
  onAcceptTermsChange: (v: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
  onGoToStep: (step: number) => void;
  loading: boolean;
  error: string | null;
}

export default function OrderSummary({
  address,
  shipping,
  payment,
  packageShipping,
  acceptTerms,
  onAcceptTermsChange,
  onSubmit,
  onBack,
  onGoToStep,
  loading,
  error,
}: OrderSummaryProps) {
  const { cart } = useCart();

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discount = cart?.discount || 0;
  const shippingCost = shipping.price || 0;
  const total = subtotal - discount + shippingCost;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Podsumowanie zamówienia</Text>
        <Text style={styles.headerDesc}>Sprawdź dane i złóż zamówienie</Text>
      </View>

      {/* Address summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="location-outline" size={18} color="#F97316" />
            <Text style={styles.sectionTitle}>Adres dostawy</Text>
          </View>
          <TouchableOpacity onPress={() => onGoToStep(0)}>
            <Text style={styles.changeLink}>Zmień</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.summaryText}>
          {address.firstName} {address.lastName}
        </Text>
        <Text style={styles.summaryText}>
          {address.street}{address.apartment ? ` ${address.apartment}` : ''}
        </Text>
        <Text style={styles.summaryText}>
          {address.postalCode} {address.city}
        </Text>
        <Text style={styles.summaryText}>{address.phone}</Text>
        <Text style={styles.summaryText}>{address.email}</Text>

        {address.wantInvoice && (
          <View style={styles.invoiceSummary}>
            <Text style={styles.invoiceLabel}>📄 Dane do faktury:</Text>
            <Text style={styles.summaryText}>{address.billingCompanyName}</Text>
            <Text style={styles.summaryText}>NIP: {address.billingNip}</Text>
            <Text style={styles.summaryText}>
              {address.billingStreet}, {address.billingPostalCode} {address.billingCity}
            </Text>
          </View>
        )}
      </View>

      {/* Per-package shipping summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="car-outline" size={18} color="#F97316" />
            <Text style={styles.sectionTitle}>Dostawa</Text>
          </View>
          <TouchableOpacity onPress={() => onGoToStep(1)}>
            <Text style={styles.changeLink}>Zmień</Text>
          </TouchableOpacity>
        </View>

        {packageShipping.length > 0 ? (
          packageShipping.map((pkg, idx) => {
            const wConfig = getWarehouseConfig(pkg.wholesaler);
            return (
              <View key={pkg.packageId} style={styles.pkgShippingRow}>
                <View style={styles.pkgShippingLeft}>
                  <View style={[styles.pkgDot, { backgroundColor: wConfig.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pkgMethodName}>{METHOD_NAMES[pkg.method] || pkg.method}</Text>
                    <Text style={styles.pkgWarehouse}>{wConfig.name}</Text>
                    {pkg.paczkomatCode && (
                      <Text style={styles.pkgPaczkomat}>📍 {pkg.paczkomatCode}</Text>
                    )}
                    {pkg.useCustomAddress && pkg.customAddress && (
                      <Text style={styles.pkgCustomAddr}>
                        ↳ {pkg.customAddress.firstName} {pkg.customAddress.lastName}, {pkg.customAddress.street}, {pkg.customAddress.postalCode} {pkg.customAddress.city}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.pkgPrice}>
                  {pkg.price === 0 ? 'Gratis' : `${pkg.price.toFixed(2)} zł`}
                </Text>
              </View>
            );
          })
        ) : (
          <View>
            <Text style={styles.summaryText}>{shipping.methodName || shipping.method}</Text>
            <Text style={styles.shippingPrice}>
              {shippingCost === 0 ? 'Gratis' : `${shippingCost.toFixed(2)} zł`}
            </Text>
          </View>
        )}
      </View>

      {/* Payment summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="card-outline" size={18} color="#F97316" />
            <Text style={styles.sectionTitle}>Płatność</Text>
          </View>
          <TouchableOpacity onPress={() => onGoToStep(2)}>
            <Text style={styles.changeLink}>Zmień</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.summaryText}>{payment.methodName || payment.method}</Text>
      </View>

      {/* Products list */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLeft}>
            <Ionicons name="bag-outline" size={18} color="#F97316" />
            <Text style={styles.sectionTitle}>Produkty ({items.length})</Text>
          </View>
        </View>
        {items.map(item => {
          const imageUrl = item.variant.product.images?.[0]?.url;
          const price = item.variant.price;
          const lineTotal = price * item.quantity;

          return (
            <View key={item.id} style={styles.productRow}>
              {imageUrl && (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.productImage}
                  contentFit="contain"
                />
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.variant.product.name}
                </Text>
                {item.variant.name !== 'default' && item.variant.name !== item.variant.product.name && (
                  <Text style={styles.productVariant}>{item.variant.name}</Text>
                )}
                <Text style={styles.productQty}>
                  {item.quantity} × {price.toFixed(2)} zł
                </Text>
              </View>
              <Text style={styles.productTotal}>{lineTotal.toFixed(2)} zł</Text>
            </View>
          );
        })}
      </View>

      {/* Price summary */}
      <View style={styles.priceSection}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Produkty:</Text>
          <Text style={styles.priceValue}>{subtotal.toFixed(2)} zł</Text>
        </View>
        {discount > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Rabat:</Text>
            <Text style={[styles.priceValue, { color: '#16A34A' }]}>
              -{discount.toFixed(2)} zł
            </Text>
          </View>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Dostawa:</Text>
          <Text style={styles.priceValue}>
            {shippingCost === 0 ? 'Gratis' : `${shippingCost.toFixed(2)} zł`}
          </Text>
        </View>
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Do zapłaty:</Text>
          <Text style={styles.totalValue}>{total.toFixed(2)} zł</Text>
        </View>
      </View>

      {/* Terms */}
      <View style={styles.termsSection}>
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => onAcceptTermsChange(!acceptTerms)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
            {acceptTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={styles.termsText}>
            Akceptuję{' '}
            <Text style={styles.termsLink}>regulamin</Text>
            {' '}oraz{' '}
            <Text style={styles.termsLink}>politykę prywatności</Text>
            {' '}sklepu WBTrade *
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Submit */}
      <View style={styles.submitSection}>
        <Button
          title={`🛒 Zamawiam i płacę – ${total.toFixed(2)} zł`}
          onPress={onSubmit}
          disabled={!acceptTerms}
          loading={loading}
          size="lg"
          fullWidth
        />
        <Text style={styles.footerNote}>
          Klikając przycisk powyżej, potwierdzasz zamówienie z obowiązkiem zapłaty.
        </Text>
      </View>

      {/* Back */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← Wstecz</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ──── Styles ────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },

  // Header
  headerSection: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.secondary[900] },
  headerDesc: { fontSize: 13, color: Colors.secondary[500], marginTop: 4 },

  // Sections
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  changeLink: {
    fontSize: 13,
    color: '#EA580C',
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 13,
    color: Colors.secondary[600],
    lineHeight: 19,
  },
  shippingPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
    marginTop: 4,
  },
  invoiceSummary: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  invoiceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary[700],
    marginBottom: 2,
  },

  // Per-package shipping
  pkgShippingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pkgShippingLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
  pkgDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  pkgMethodName: { fontSize: 13, fontWeight: '600', color: Colors.secondary[800] },
  pkgWarehouse: { fontSize: 11, color: Colors.secondary[500], marginTop: 1 },
  pkgPaczkomat: { fontSize: 11, color: '#C2410C', marginTop: 2 },
  pkgCustomAddr: { fontSize: 10, color: Colors.secondary[500], marginTop: 2, fontStyle: 'italic' },
  pkgPrice: { fontSize: 14, fontWeight: '600', color: Colors.secondary[800] },

  // Products
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: '#F3F4F6',
  },
  productInfo: { flex: 1 },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.secondary[800],
  },
  productVariant: {
    fontSize: 12,
    color: Colors.secondary[500],
    marginTop: 1,
  },
  productQty: {
    fontSize: 12,
    color: Colors.secondary[500],
    marginTop: 2,
  },
  productTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
    marginLeft: 8,
  },

  // Pricing
  priceSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabel: { fontSize: 14, color: Colors.secondary[600] },
  priceValue: { fontSize: 14, fontWeight: '500', color: Colors.secondary[800] },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.secondary[900] },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#F97316' },

  // Terms
  termsSection: { paddingHorizontal: 16, paddingVertical: 14 },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: Colors.secondary[600],
    lineHeight: 18,
  },
  termsLink: {
    color: '#EA580C',
    textDecorationLine: 'underline',
  },

  // Error
  errorBox: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { fontSize: 13, color: '#991B1B' },

  // Submit
  submitSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  footerNote: {
    fontSize: 11,
    color: Colors.secondary[500],
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 15,
  },

  // Back
  backButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 10,
  },
  backText: {
    fontSize: 15,
    color: Colors.secondary[600],
    fontWeight: '500',
  },
});
