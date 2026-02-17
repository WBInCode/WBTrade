import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../../constants/Colors';
import { useCart } from '../../contexts/CartContext';
import { api } from '../../services/api';
import Button from '../ui/Button';
import PaczkomatPicker, { type InPostPoint } from './PaczkomatPicker';

// ──── Types ────

interface PackageItem {
  productId: string;
  productName: string;
  variantId: string;
  quantity: number;
  isGabaryt: boolean;
  productImage?: string;
}

interface ShippingMethodOption {
  id: string;
  name: string;
  price: number;
  available: boolean;
  message?: string | null;
  estimatedDelivery?: string;
  forced?: boolean;
}

interface PackageInfo {
  id: string;
  type: 'standard' | 'gabaryt';
  wholesaler?: string | null;
  items: PackageItem[];
  isPaczkomatAvailable: boolean;
  isInPostOnly: boolean;
  isCourierOnly: boolean;
  warehouseValue: number;
  hasFreeShipping: boolean;
  paczkomatPackageCount: number;
}

interface PackageWithOptions {
  package: PackageInfo;
  shippingMethods: ShippingMethodOption[];
  selectedMethod?: string;
}

type CustomAddressType = {
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  apartment: string;
  postalCode: string;
  city: string;
};

export interface PackageShippingSelection {
  packageId: string;
  wholesaler?: string;
  method: string;
  price: number;
  paczkomatCode?: string;
  paczkomatAddress?: string;
  items: { productId: string; productName: string; variantId: string; quantity: number; image?: string }[];
  useCustomAddress?: boolean;
  customAddress?: CustomAddressType;
}

export interface ShippingSubmitData {
  method: string;
  price: number;
  packageShipping: PackageShippingSelection[];
  paczkomatCode?: string;
  paczkomatAddress?: string;
}

interface ShippingPerPackageProps {
  postalCode: string;
  onSubmit: (data: ShippingSubmitData) => void;
  onBack: () => void;
}

// ──── Warehouse Config ────

const getWarehouseConfig = (wholesaler: string | null): { name: string; color: string; bgColor: string; borderColor: string } => {
  const configs: Record<string, { name: string; color: string; bgColor: string; borderColor: string }> = {
    'HP': { name: 'Magazyn Zielona Góra', color: '#1D4ED8', bgColor: '#EFF6FF', borderColor: '#BFDBFE' },
    'Hurtownia Przemysłowa': { name: 'Magazyn Zielona Góra', color: '#1D4ED8', bgColor: '#EFF6FF', borderColor: '#BFDBFE' },
    'Ikonka': { name: 'Magazyn Białystok', color: '#7C3AED', bgColor: '#F5F3FF', borderColor: '#DDD6FE' },
    'BTP': { name: 'Magazyn Chotów', color: '#047857', bgColor: '#ECFDF5', borderColor: '#A7F3D0' },
    'Leker': { name: 'Magazyn Chynów', color: '#B91C1C', bgColor: '#FEF2F2', borderColor: '#FECACA' },
    'Rzeszów': { name: 'Magazyn Rzeszów', color: '#BE185D', bgColor: '#FDF2F8', borderColor: '#FBCFE8' },
    'Outlet': { name: 'Magazyn Rzeszów', color: '#BE185D', bgColor: '#FDF2F8', borderColor: '#FBCFE8' },
  };
  return configs[wholesaler || ''] || { name: 'Magazyn Chynów', color: '#374151', bgColor: '#F9FAFB', borderColor: '#E5E7EB' };
};

// ──── Shipping Provider Icon ────

const ShippingIcon = ({ id }: { id: string }) => {
  switch (id) {
    case 'inpost_paczkomat':
    case 'inpost_kurier':
      return (
        <View style={[styles.providerBadge, { backgroundColor: '#FFCD00' }]}>
          <Text style={[styles.providerBadgeText, { color: '#1D1D1B' }]}>InPost</Text>
        </View>
      );
    case 'dpd_kurier':
      return (
        <View style={[styles.providerBadge, { backgroundColor: '#DC0032' }]}>
          <Text style={[styles.providerBadgeText, { color: '#fff' }]}>DPD</Text>
        </View>
      );
    case 'wysylka_gabaryt':
      return (
        <View style={[styles.providerBadge, { backgroundColor: '#F97316' }]}>
          <Text style={[styles.providerBadgeText, { color: '#fff' }]}>📦</Text>
        </View>
      );
    case 'odbior_osobisty_outlet':
      return (
        <View style={[styles.providerBadge, { backgroundColor: '#16A34A' }]}>
          <Text style={[styles.providerBadgeText, { color: '#fff' }]}>📍</Text>
        </View>
      );
    default:
      return null;
  }
};

// ──── Helper: split items for multi-slot paczkomat ────

const getItemsForPaczkomatSlot = (items: PackageItem[], slotIndex: number, totalSlots: number): PackageItem[] => {
  if (totalSlots <= 1) return items;
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  const itemsPerSlot = Math.ceil(totalQty / totalSlots);
  let currentSlot = 0;
  let currentSlotCount = 0;
  const slotItems: PackageItem[][] = Array.from({ length: totalSlots }, () => []);

  for (const item of items) {
    let remainingQty = item.quantity;
    while (remainingQty > 0) {
      const spaceInSlot = itemsPerSlot - currentSlotCount;
      const qtyForSlot = Math.min(remainingQty, spaceInSlot);
      if (qtyForSlot > 0) {
        const existing = slotItems[currentSlot].find(i => i.productId === item.productId);
        if (existing) {
          existing.quantity += qtyForSlot;
        } else {
          slotItems[currentSlot].push({ ...item, quantity: qtyForSlot });
        }
        currentSlotCount += qtyForSlot;
        remainingQty -= qtyForSlot;
      }
      if (currentSlotCount >= itemsPerSlot && currentSlot < totalSlots - 1) {
        currentSlot++;
        currentSlotCount = 0;
      }
    }
  }
  return slotItems[slotIndex] || [];
};

// ──── Round money helper ────
const roundMoney = (v: number) => Math.round(v * 100) / 100;

// ──── Component ────

export default function ShippingPerPackage({ postalCode, onSubmit, onBack }: ShippingPerPackageProps) {
  const { cart } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<PackageWithOptions[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  // Paczkomat selections: packageId -> array of {code, address}
  const [paczkomatSelections, setPaczkomatSelections] = useState<Record<string, Array<{ code: string; address: string }>>>({});
  // Which slot is currently being selected
  const [geoWidgetSlot, setGeoWidgetSlot] = useState<{ packageId: string; index: number } | null>(null);

  // Custom address per package
  const [useCustomAddress, setUseCustomAddress] = useState<Record<string, boolean>>({});
  const [customAddresses, setCustomAddresses] = useState<Record<string, CustomAddressType>>({});

  useEffect(() => {
    loadShippingOptions();
  }, []);

  const loadShippingOptions = async () => {
    if (!cart?.items.length) return;
    setLoading(true);
    setError(null);

    try {
      const items = cart.items.map(item => ({
        variantId: item.variant.id,
        quantity: item.quantity,
      }));

      const response = await api.post<{
        packagesWithOptions: PackageWithOptions[];
        totalShippingCost: number;
        warnings: string[];
      }>('/checkout/shipping/per-package', { items });

      setPackages(response.packagesWithOptions || []);
      setWarnings(response.warnings || []);

      // Auto-select default methods
      const defaultSelections: Record<string, string> = {};
      for (const pkg of response.packagesWithOptions || []) {
        const defaultMethod =
          pkg.selectedMethod ||
          pkg.shippingMethods.find(m => m.available)?.id ||
          '';
        if (defaultMethod) {
          defaultSelections[pkg.package.id] = defaultMethod;
        }
      }
      setSelections(defaultSelections);
    } catch (err: any) {
      setError(err.message || 'Nie udało się załadować metod wysyłki');
    } finally {
      setLoading(false);
    }
  };

  // ── Method selection ──

  const selectMethod = (packageId: string, methodId: string) => {
    setSelections(prev => ({ ...prev, [packageId]: methodId }));
    setError(null);

    // Clear paczkomat if switching away
    if (methodId !== 'inpost_paczkomat') {
      setPaczkomatSelections(prev => {
        const { [packageId]: _, ...rest } = prev;
        return rest;
      });
    }
    // Disable custom address if switching to paczkomat
    if (methodId === 'inpost_paczkomat') {
      setUseCustomAddress(prev => ({ ...prev, [packageId]: false }));
    }
  };

  // ── Custom address ──

  const toggleCustomAddress = (packageId: string) => {
    setUseCustomAddress(prev => {
      const newVal = !prev[packageId];
      if (newVal && !customAddresses[packageId]) {
        setCustomAddresses(addrs => ({
          ...addrs,
          [packageId]: { firstName: '', lastName: '', phone: '', street: '', apartment: '', postalCode: '', city: '' },
        }));
      }
      return { ...prev, [packageId]: newVal };
    });
  };

  const updateCustomAddress = (packageId: string, field: string, value: string) => {
    setCustomAddresses(prev => ({
      ...prev,
      [packageId]: { ...prev[packageId], [field]: value },
    }));
  };

  // ── Paczkomat selection ──

  const handlePointSelect = (point: InPostPoint) => {
    if (!geoWidgetSlot) return;
    const { packageId, index } = geoWidgetSlot;

    const address = point.address_details
      ? `${point.address_details.street} ${point.address_details.building_number}, ${point.address_details.post_code} ${point.address_details.city}`
      : `${point.address.line1}, ${point.address.line2}`;

    setPaczkomatSelections(prev => {
      const current = prev[packageId] || [];
      const newArr = [...current];
      newArr[index] = { code: point.name, address };
      return { ...prev, [packageId]: newArr };
    });
    setError(null);
  };

  // ── Pricing ──

  const getSelectedPrice = (pkg: PackageWithOptions): number => {
    const selectedId = selections[pkg.package.id];
    const method = pkg.shippingMethods.find(m => m.id === selectedId && m.available);
    return method?.price || 0;
  };

  const totalShipping = roundMoney(packages.reduce((sum, pkg) => sum + getSelectedPrice(pkg), 0));

  const calculateShipmentCount = (): number => {
    let count = 0;
    for (const pkg of packages) {
      const method = selections[pkg.package.id];
      if (method === 'inpost_paczkomat') {
        count += pkg.package.paczkomatPackageCount || 1;
      } else {
        count += 1;
      }
    }
    return count || packages.length;
  };

  // ── Validation & Submit ──

  const allSelected = packages.every(pkg => {
    const selectedId = selections[pkg.package.id];
    if (!selectedId || !pkg.shippingMethods.some(m => m.id === selectedId && m.available)) return false;

    // Validate paczkomat selections
    if (selectedId === 'inpost_paczkomat') {
      const count = pkg.package.paczkomatPackageCount || 1;
      const sels = paczkomatSelections[pkg.package.id] || [];
      for (let i = 0; i < count; i++) {
        if (!sels[i]?.code) return false;
      }
    }

    // Validate custom address
    if (useCustomAddress[pkg.package.id] && selectedId !== 'inpost_paczkomat') {
      const addr = customAddresses[pkg.package.id];
      if (!addr?.firstName || !addr?.lastName || !addr?.street || !addr?.postalCode || !addr?.city || !addr?.phone) return false;
    }

    return true;
  });

  const handleSubmit = () => {
    // Validate
    for (const pkg of packages) {
      const methodId = selections[pkg.package.id];
      if (!methodId) {
        setError('Wybierz metodę dostawy dla każdej paczki');
        return;
      }
      if (methodId === 'inpost_paczkomat') {
        const count = pkg.package.paczkomatPackageCount || 1;
        const sels = paczkomatSelections[pkg.package.id] || [];
        for (let i = 0; i < count; i++) {
          if (!sels[i]?.code) {
            setError(`Wybierz paczkomat ${count > 1 ? `#${i + 1} ` : ''}dla przesyłki`);
            return;
          }
        }
      }
      if (useCustomAddress[pkg.package.id] && methodId !== 'inpost_paczkomat') {
        const addr = customAddresses[pkg.package.id];
        if (!addr?.firstName || !addr?.lastName || !addr?.street || !addr?.postalCode || !addr?.city || !addr?.phone) {
          setError('Uzupełnij adres dostawy dla przesyłki');
          return;
        }
      }
    }

    // Build package shipping selections
    const packageShipping: PackageShippingSelection[] = [];

    for (const pkg of packages) {
      const methodId = selections[pkg.package.id];
      const method = pkg.shippingMethods.find(m => m.id === methodId);
      const sels = paczkomatSelections[pkg.package.id] || [];
      const hasCustomAddr = useCustomAddress[pkg.package.id] && methodId !== 'inpost_paczkomat';
      const paczkomatCount = pkg.package.paczkomatPackageCount || 1;

      if (methodId === 'inpost_paczkomat' && paczkomatCount > 1) {
        const pricePerPkg = roundMoney((method?.price || 0) / paczkomatCount);
        for (let i = 0; i < paczkomatCount; i++) {
          const slotItems = getItemsForPaczkomatSlot(pkg.package.items, i, paczkomatCount);
          packageShipping.push({
            packageId: `${pkg.package.id}_slot${i}`,
            wholesaler: pkg.package.wholesaler || undefined,
            method: methodId,
            price: pricePerPkg,
            paczkomatCode: sels[i]?.code,
            paczkomatAddress: sels[i]?.address,
            items: slotItems.map(it => ({
              productId: it.productId,
              productName: it.productName,
              variantId: it.variantId,
              quantity: it.quantity,
              image: it.productImage,
            })),
            useCustomAddress: false,
          });
        }
      } else {
        packageShipping.push({
          packageId: pkg.package.id,
          wholesaler: pkg.package.wholesaler || undefined,
          method: methodId,
          price: method?.price || 0,
          paczkomatCode: methodId === 'inpost_paczkomat' ? sels[0]?.code : undefined,
          paczkomatAddress: methodId === 'inpost_paczkomat' ? sels[0]?.address : undefined,
          items: pkg.package.items.map(it => ({
            productId: it.productId,
            productName: it.productName,
            variantId: it.variantId,
            quantity: it.quantity,
            image: it.productImage,
          })),
          useCustomAddress: hasCustomAddr,
          customAddress: hasCustomAddr ? customAddresses[pkg.package.id] : undefined,
        });
      }
    }

    // Determine primary method
    const methodCounts: Record<string, number> = {};
    for (const s of packageShipping) {
      methodCounts[s.method] = (methodCounts[s.method] || 0) + 1;
    }
    const primaryMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'inpost_kurier';

    onSubmit({
      method: primaryMethod,
      price: totalShipping,
      packageShipping,
      paczkomatCode: packageShipping.find(p => p.paczkomatCode)?.paczkomatCode,
      paczkomatAddress: packageShipping.find(p => p.paczkomatAddress)?.paczkomatAddress,
    });
  };

  // ── Loading / Error states ──

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Ładowanie opcji dostawy...</Text>
      </View>
    );
  }

  if (error && packages.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTextCenter}>{error}</Text>
        <Button title="Spróbuj ponownie" onPress={loadShippingOptions} variant="outline" />
      </View>
    );
  }

  const shipmentCount = calculateShipmentCount();

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>
            {shipmentCount === 1 ? 'Dostawa' : 'Wybór dostawy'}
          </Text>
          <View style={styles.headerBadges}>
            <View style={styles.shipmentBadge}>
              <Text style={styles.shipmentBadgeText}>
                📦 {shipmentCount} {shipmentCount === 1 ? 'przesyłka' : shipmentCount < 5 ? 'przesyłki' : 'przesyłek'}
              </Text>
            </View>
            {packages.some(p => p.package.type === 'gabaryt') && (
              <View style={styles.gabarytBadge}>
                <Text style={styles.gabarytBadgeText}>⚠️ Zawiera gabaryty</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerDesc}>
            {shipmentCount === 1
              ? 'Wybierz sposób dostawy dla Twojego zamówienia.'
              : 'Produkty zostaną wysłane z różnych magazynów. Wybierz sposób dostawy dla każdej przesyłki.'}
          </Text>
        </View>

        {/* Warnings */}
        {warnings.length > 0 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Informacja o wysyłce</Text>
            {warnings.map((w, i) => (
              <Text key={i} style={styles.warningText}>{w}</Text>
            ))}
          </View>
        )}

        {/* Packages */}
        {packages.map((pkg, pkgIndex) => {
          const pkgInfo = pkg.package;
          const wConfig = getWarehouseConfig(pkgInfo.wholesaler ?? null);
          const isGabaryt = pkgInfo.type === 'gabaryt';
          const selectedMethod = pkg.shippingMethods.find(m => m.id === selections[pkgInfo.id] && m.available);

          return (
            <View
              key={pkgInfo.id}
              style={[styles.packageCard, { backgroundColor: wConfig.bgColor, borderColor: wConfig.borderColor }]}
            >
              {/* Package header */}
              <View style={styles.packageHeader}>
                <View style={styles.packageHeaderLeft}>
                  <View style={[styles.packageNumber, { backgroundColor: '#fff' }]}>
                    <Text style={[styles.packageNumberText, { color: wConfig.color }]}>{pkgIndex + 1}</Text>
                  </View>
                  <View>
                    <View style={styles.warehouseRow}>
                      <Text style={[styles.warehouseName, { color: wConfig.color }]}>{wConfig.name}</Text>
                      {isGabaryt && (
                        <View style={styles.gabarytTag}>
                          <Text style={styles.gabarytTagText}>GABARYT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemCountText}>
                      {pkgInfo.items.reduce((s, i) => s + i.quantity, 0)} {pkgInfo.items.length === 1 ? 'produkt' : 'produktów'}
                    </Text>
                  </View>
                </View>
                {selectedMethod && (
                  <View style={styles.packageHeaderRight}>
                    <Text style={styles.headerPrice}>{selectedMethod.price.toFixed(2)} zł</Text>
                    <Text style={styles.headerMethodName}>{selectedMethod.name}</Text>
                  </View>
                )}
              </View>

              {/* Product chips */}
              <View style={styles.productChips}>
                {pkgInfo.items.slice(0, 3).map((item, idx) => (
                  <View key={`${item.variantId}-${idx}`} style={styles.productChip}>
                    {item.productImage && (
                      <Image source={{ uri: item.productImage }} style={styles.chipImage} contentFit="cover" />
                    )}
                    <View style={styles.chipInfo}>
                      <Text style={styles.chipName} numberOfLines={1}>{item.productName}</Text>
                      {item.quantity > 1 && <Text style={styles.chipQty}>{item.quantity} szt.</Text>}
                    </View>
                  </View>
                ))}
                {pkgInfo.items.length > 3 && (
                  <View style={styles.moreChip}>
                    <Text style={styles.moreChipText}>+{pkgInfo.items.length - 3} więcej</Text>
                  </View>
                )}
              </View>

              {/* Shipping methods */}
              <View style={styles.methodsContainer}>
                <Text style={styles.methodsSectionLabel}>WYBIERZ SPOSÓB DOSTAWY:</Text>

                {pkg.shippingMethods.filter(m => m.available).map(method => {
                  const isSelected = selections[pkgInfo.id] === method.id;

                  return (
                    <View key={method.id}>
                      <TouchableOpacity
                        style={[
                          styles.methodCard,
                          isSelected && styles.methodCardSelected,
                        ]}
                        onPress={() => selectMethod(pkgInfo.id, method.id)}
                        activeOpacity={0.7}
                      >
                        {/* Radio */}
                        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>

                        {/* Provider icon */}
                        <ShippingIcon id={method.id} />

                        {/* Name + delivery time */}
                        <View style={styles.methodTextArea}>
                          <Text style={styles.methodName}>{method.name}</Text>
                          {method.estimatedDelivery && (
                            <Text style={styles.methodDelivery}>{method.estimatedDelivery}</Text>
                          )}
                        </View>

                        {/* Price */}
                        <Text style={styles.methodPrice}>
                          {method.price === 0 ? 'Gratis' : `${method.price.toFixed(2)} zł`}
                        </Text>
                      </TouchableOpacity>

                      {/* Paczkomat selector(s) */}
                      {method.id === 'inpost_paczkomat' && isSelected && (
                        <View style={styles.paczkomatSection}>
                          {Array.from({ length: pkgInfo.paczkomatPackageCount || 1 }).map((_, slotIdx) => {
                            const sel = paczkomatSelections[pkgInfo.id]?.[slotIdx];
                            const count = pkgInfo.paczkomatPackageCount || 1;

                            return (
                              <View key={slotIdx} style={styles.paczkomatSlot}>
                                {count > 1 && (
                                  <View style={styles.slotHeader}>
                                    <Text style={styles.slotLabel}>
                                      Paczka {slotIdx + 1} z {count}
                                    </Text>
                                    <View style={styles.slotItems}>
                                      {getItemsForPaczkomatSlot(pkgInfo.items, slotIdx, count).map((it, i) => (
                                        <View key={i} style={styles.slotItemChip}>
                                          <Text style={styles.slotItemText} numberOfLines={1}>
                                            {it.productName.slice(0, 15)}...
                                          </Text>
                                          {it.quantity > 1 && (
                                            <Text style={styles.slotItemQty}>×{it.quantity}</Text>
                                          )}
                                        </View>
                                      ))}
                                    </View>
                                  </View>
                                )}

                                {sel?.code ? (
                                  <View style={styles.selectedPaczkomat}>
                                    <View style={styles.paczkomatIcon}>
                                      <Text style={styles.paczkomatIconText}>📍</Text>
                                    </View>
                                    <View style={styles.paczkomatInfo}>
                                      <Text style={styles.paczkomatCode}>{sel.code}</Text>
                                      <Text style={styles.paczkomatAddr} numberOfLines={1}>{sel.address}</Text>
                                    </View>
                                    <TouchableOpacity
                                      onPress={() => setGeoWidgetSlot({ packageId: pkgInfo.id, index: slotIdx })}
                                    >
                                      <Text style={styles.changeBtn}>Zmień</Text>
                                    </TouchableOpacity>
                                  </View>
                                ) : (
                                  <TouchableOpacity
                                    style={styles.selectPaczkomatBtn}
                                    onPress={() => setGeoWidgetSlot({ packageId: pkgInfo.id, index: slotIdx })}
                                  >
                                    <Text style={styles.selectPaczkomatText}>
                                      🗺️ Wybierz paczkomat{count > 1 ? ` #${slotIdx + 1}` : ''}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Custom address option (only for courier, not paczkomat) */}
                {selections[pkgInfo.id] && selections[pkgInfo.id] !== 'inpost_paczkomat' && (
                  <View style={styles.customAddrSection}>
                    <TouchableOpacity
                      style={styles.customAddrToggle}
                      onPress={() => toggleCustomAddress(pkgInfo.id)}
                    >
                      <View style={[styles.checkboxOuter, useCustomAddress[pkgInfo.id] && styles.checkboxChecked]}>
                        {useCustomAddress[pkgInfo.id] && <Text style={styles.checkboxMark}>✓</Text>}
                      </View>
                      <Text style={styles.customAddrLabel}>Wyślij pod inny adres</Text>
                    </TouchableOpacity>

                    {useCustomAddress[pkgInfo.id] && (
                      <View style={styles.customAddrForm}>
                        <Text style={styles.customAddrTitle}>Adres dostawy dla tej przesyłki</Text>
                        <View style={styles.formRow}>
                          <View style={styles.formHalf}>
                            <Text style={styles.formLabel}>Imię *</Text>
                            <TextInput
                              style={styles.formInput}
                              value={customAddresses[pkgInfo.id]?.firstName || ''}
                              onChangeText={v => updateCustomAddress(pkgInfo.id, 'firstName', v)}
                              placeholder="Jan"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                          <View style={styles.formHalf}>
                            <Text style={styles.formLabel}>Nazwisko *</Text>
                            <TextInput
                              style={styles.formInput}
                              value={customAddresses[pkgInfo.id]?.lastName || ''}
                              onChangeText={v => updateCustomAddress(pkgInfo.id, 'lastName', v)}
                              placeholder="Kowalski"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                        </View>
                        <Text style={styles.formLabel}>Telefon *</Text>
                        <TextInput
                          style={styles.formInput}
                          value={customAddresses[pkgInfo.id]?.phone || ''}
                          onChangeText={v => updateCustomAddress(pkgInfo.id, 'phone', v)}
                          placeholder="+48 123 456 789"
                          keyboardType="phone-pad"
                          placeholderTextColor="#9CA3AF"
                        />
                        <Text style={styles.formLabel}>Ulica i numer *</Text>
                        <TextInput
                          style={styles.formInput}
                          value={customAddresses[pkgInfo.id]?.street || ''}
                          onChangeText={v => updateCustomAddress(pkgInfo.id, 'street', v)}
                          placeholder="ul. Przykładowa 10"
                          placeholderTextColor="#9CA3AF"
                        />
                        <View style={styles.formRow}>
                          <View style={styles.formHalf}>
                            <Text style={styles.formLabel}>Nr mieszkania</Text>
                            <TextInput
                              style={styles.formInput}
                              value={customAddresses[pkgInfo.id]?.apartment || ''}
                              onChangeText={v => updateCustomAddress(pkgInfo.id, 'apartment', v)}
                              placeholder="5A"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                          <View style={styles.formHalf}>
                            <Text style={styles.formLabel}>Kod pocztowy *</Text>
                            <TextInput
                              style={styles.formInput}
                              value={customAddresses[pkgInfo.id]?.postalCode || ''}
                              onChangeText={v => updateCustomAddress(pkgInfo.id, 'postalCode', v)}
                              placeholder="00-001"
                              keyboardType="numeric"
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                        </View>
                        <Text style={styles.formLabel}>Miasto *</Text>
                        <TextInput
                          style={styles.formInput}
                          value={customAddresses[pkgInfo.id]?.city || ''}
                          onChangeText={v => updateCustomAddress(pkgInfo.id, 'city', v)}
                          placeholder="Warszawa"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Free shipping progress bar */}
              {!pkgInfo.hasFreeShipping && pkgInfo.warehouseValue < 300 && (
                <View style={styles.freeShippingBar}>
                  <View style={styles.freeShippingHeader}>
                    <Text style={styles.freeShippingLabel}>Do darmowej dostawy:</Text>
                    <Text style={styles.freeShippingAmount}>
                      {(300 - pkgInfo.warehouseValue).toFixed(2)} zł
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min((pkgInfo.warehouseValue / 300) * 100, 100)}%` as any },
                      ]}
                    />
                  </View>
                </View>
              )}
              {pkgInfo.hasFreeShipping && (
                <View style={styles.freeShippingDone}>
                  <Text style={styles.freeShippingDoneText}>✅ Darmowa dostawa!</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Łączny koszt dostawy:</Text>
          <Text style={styles.totalPrice}>{totalShipping.toFixed(2)} zł</Text>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Navigation */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backText}>← Wstecz</Text>
          </TouchableOpacity>
          <View style={styles.nextButton}>
            <Button title="Dalej →" onPress={handleSubmit} disabled={!allSelected} size="lg" />
          </View>
        </View>
      </ScrollView>

      {/* Paczkomat Picker Modal */}
      <PaczkomatPicker
        isOpen={geoWidgetSlot !== null}
        onClose={() => setGeoWidgetSlot(null)}
        onPointSelect={handlePointSelect}
      />
    </>
  );
}

// ──── Styles ────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.secondary[500] },
  errorTextCenter: { fontSize: 14, color: Colors.destructive, marginBottom: 12, textAlign: 'center' },

  // Header
  headerSection: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.secondary[900] },
  headerBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  shipmentBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  shipmentBadgeText: { fontSize: 13, fontWeight: '600', color: '#C2410C' },
  gabarytBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  gabarytBadgeText: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  headerDesc: { fontSize: 13, color: Colors.secondary[500], marginTop: 8, lineHeight: 18 },

  // Warnings
  warningBox: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningTitle: { fontSize: 13, fontWeight: '600', color: '#92400E', marginBottom: 4 },
  warningText: { fontSize: 12, color: '#92400E', marginTop: 2 },

  // Package card
  packageCard: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  packageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  packageNumber: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  packageNumberText: { fontSize: 17, fontWeight: '700' },
  warehouseRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warehouseName: { fontSize: 14, fontWeight: '600' },
  gabarytTag: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gabarytTagText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  itemCountText: { fontSize: 11, color: Colors.secondary[500], marginTop: 1 },
  packageHeaderRight: { alignItems: 'flex-end' },
  headerPrice: { fontSize: 17, fontWeight: '700', color: Colors.secondary[900] },
  headerMethodName: { fontSize: 11, color: Colors.secondary[500] },

  // Product chips
  productChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 10 },
  productChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  chipImage: { width: 28, height: 28, borderRadius: 4 },
  chipInfo: { maxWidth: 120 },
  chipName: { fontSize: 11, fontWeight: '500', color: Colors.secondary[900] },
  chipQty: { fontSize: 9, color: Colors.secondary[500] },
  moreChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    justifyContent: 'center',
  },
  moreChipText: { fontSize: 11, color: Colors.secondary[500] },

  // Shipping methods
  methodsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  methodsSectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondary[500],
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  methodCardSelected: {
    borderColor: '#FB923C',
    backgroundColor: '#FFF7ED',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioOuterSelected: {
    borderColor: '#F97316',
    backgroundColor: '#F97316',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  providerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  providerBadgeText: { fontSize: 9, fontWeight: '800' },
  methodTextArea: { flex: 1 },
  methodName: { fontSize: 14, fontWeight: '500', color: Colors.secondary[900] },
  methodDelivery: { fontSize: 11, color: Colors.secondary[500], marginTop: 1 },
  methodPrice: { fontSize: 15, fontWeight: '700', color: Colors.secondary[900], marginLeft: 8 },

  // Paczkomat
  paczkomatSection: { paddingLeft: 10, paddingBottom: 4 },
  paczkomatSlot: {
    marginTop: 6,
    padding: 10,
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FFCD00',
    borderRadius: 10,
  },
  slotHeader: { marginBottom: 8 },
  slotLabel: { fontSize: 11, fontWeight: '600', color: '#1D1D1B' },
  slotItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  slotItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 4,
  },
  slotItemText: { fontSize: 9, color: Colors.secondary[600], maxWidth: 80 },
  slotItemQty: { fontSize: 9, fontWeight: '600', color: Colors.secondary[700] },
  selectedPaczkomat: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paczkomatIcon: {
    width: 30,
    height: 30,
    backgroundColor: '#FFCD00',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paczkomatIconText: { fontSize: 16 },
  paczkomatInfo: { flex: 1 },
  paczkomatCode: { fontSize: 13, fontWeight: '600', color: Colors.secondary[900] },
  paczkomatAddr: { fontSize: 11, color: Colors.secondary[500] },
  changeBtn: { fontSize: 12, color: '#EA580C', fontWeight: '600' },
  selectPaczkomatBtn: {
    backgroundColor: '#FFCD00',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectPaczkomatText: { fontSize: 13, fontWeight: '700', color: '#1D1D1B' },

  // Custom address
  customAddrSection: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  customAddrToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxOuter: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#F97316', borderColor: '#F97316' },
  checkboxMark: { fontSize: 11, color: '#fff', fontWeight: '700' },
  customAddrLabel: { fontSize: 13, color: Colors.secondary[700] },
  customAddrForm: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customAddrTitle: { fontSize: 13, fontWeight: '600', color: Colors.secondary[900], marginBottom: 10 },
  formRow: { flexDirection: 'row', gap: 8 },
  formHalf: { flex: 1 },
  formLabel: { fontSize: 11, color: Colors.secondary[600], marginBottom: 3, marginTop: 6 },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.secondary[900],
    backgroundColor: '#fff',
  },

  // Free shipping progress
  freeShippingBar: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#FFEDD5',
  },
  freeShippingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  freeShippingLabel: { fontSize: 11, color: Colors.secondary[600] },
  freeShippingAmount: { fontSize: 13, fontWeight: '600', color: '#EA580C' },
  progressTrack: {
    height: 5,
    backgroundColor: '#FED7AA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#F97316',
  },
  freeShippingDone: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
  },
  freeShippingDoneText: { fontSize: 13, fontWeight: '600', color: '#047857' },

  // Total
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  totalLabel: { fontSize: 14, color: Colors.secondary[600] },
  totalPrice: { fontSize: 20, fontWeight: '700', color: Colors.secondary[900] },

  // Error
  errorBox: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: 12,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { fontSize: 12, color: '#991B1B' },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 12,
  },
  backButton: { paddingVertical: 14, paddingHorizontal: 16 },
  backText: { fontSize: 15, color: Colors.secondary[600], fontWeight: '500' },
  nextButton: { flex: 1 },
});
