import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';
import type { Product } from '../services/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface AddedProductInfo {
  productId: string;
  name: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  warehouse?: string;
}

interface AddToCartModalProps {
  visible: boolean;
  product: AddedProductInfo | null;
  onClose: () => void;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
}

export default function AddToCartModal({
  visible,
  product,
  onClose,
  addToCart,
}: AddToCartModalProps) {
  const router = useRouter();
  const [sameWarehouseProducts, setSameWarehouseProducts] = useState<Product[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  // Fetch same-warehouse products
  useEffect(() => {
    if (!visible || !product?.productId) {
      setSameWarehouseProducts([]);
      return;
    }

    setLoadingRelated(true);
    api
      .get<{ products: Product[] }>(`/products/same-warehouse/${product.productId}?limit=4`)
      .then((data) => {
        const products = data.products || [];
        setSameWarehouseProducts(products);
      })
      .catch(() => setSameWarehouseProducts([]))
      .finally(() => setLoadingRelated(false));
  }, [visible, product?.productId]);

  const handleAddRelated = async (relatedProduct: Product) => {
    const variantId = relatedProduct.variants?.[0]?.id;
    if (!variantId) return;

    setAddingIds((prev) => new Set(prev).add(relatedProduct.id));
    try {
      await addToCart(variantId, 1);
      // Remove from list after adding
      setSameWarehouseProducts((prev) => prev.filter((p) => p.id !== relatedProduct.id));
    } catch {
      // ignore
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(relatedProduct.id);
        return next;
      });
    }
  };

  const handleGoToCart = () => {
    onClose();
    router.push('/(tabs)/cart');
  };

  if (!product) return null;

  const warehouseName = product.warehouse
    ? getWarehouseLabel(product.warehouse)
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modal}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.secondary[500]} />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Success icon */}
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={32} color="#22C55E" />
            </View>

            <Text style={styles.title}>Produkt dodany do koszyka!</Text>

            {/* Product info card */}
            <View style={styles.productCard}>
              {product.imageUrl ? (
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.productImage}
                  contentFit="contain"
                />
              ) : (
                <View style={[styles.productImage, styles.imagePlaceholder]}>
                  <FontAwesome name="image" size={20} color={Colors.secondary[300]} />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.productQty}>Ilość: {product.quantity}</Text>
                <Text style={styles.productPrice}>{product.price.toFixed(2)} zł</Text>
              </View>
            </View>

            {/* Same warehouse cross-sell */}
            {(loadingRelated || sameWarehouseProducts.length > 0) && (
              <View style={styles.crossSellSection}>
                <View style={styles.crossSellHeader}>
                  <View style={styles.crossSellBadge}>
                    <Ionicons name="cube-outline" size={16} color="#2563EB" />
                  </View>
                  <View style={styles.crossSellTitleCol}>
                    <Text style={styles.crossSellTitle}>Zamów w jednej przesyłce</Text>
                    {warehouseName && (
                      <Text style={styles.crossSellWarehouse}>{warehouseName}</Text>
                    )}
                  </View>
                </View>

                {loadingRelated ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={Colors.primary[500]} />
                    <Text style={styles.loadingText}>Ładowanie...</Text>
                  </View>
                ) : (
                  <View style={styles.crossSellGrid}>
                    {sameWarehouseProducts.map((p) => {
                      const img = p.images?.[0]?.url;
                      const price =
                        typeof p.price === 'string' ? parseFloat(p.price) : p.price || 0;
                      const isAdding = addingIds.has(p.id);

                      return (
                        <View key={p.id} style={styles.crossSellItem}>
                          <TouchableOpacity
                            onPress={() => {
                              onClose();
                              router.push(`/product/${p.id}` as any);
                            }}
                            style={styles.crossSellImageWrap}
                          >
                            {img ? (
                              <Image
                                source={{ uri: img }}
                                style={styles.crossSellImage}
                                contentFit="contain"
                              />
                            ) : (
                              <View style={[styles.crossSellImage, styles.imagePlaceholder]}>
                                <FontAwesome
                                  name="image"
                                  size={14}
                                  color={Colors.secondary[300]}
                                />
                              </View>
                            )}
                          </TouchableOpacity>
                          <Text style={styles.crossSellName} numberOfLines={2}>
                            {p.name}
                          </Text>
                          <Text style={styles.crossSellPrice}>
                            {price.toFixed(2)} zł
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.addButton,
                              isAdding && styles.addButtonDisabled,
                            ]}
                            onPress={() => handleAddRelated(p)}
                            disabled={isAdding}
                          >
                            {isAdding ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={styles.addButtonText}>Dodaj</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.continueButton} onPress={onClose}>
              <Ionicons name="arrow-back" size={16} color={Colors.secondary[700]} />
              <Text style={styles.continueText}>Kupuj dalej</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.goToCartButton} onPress={handleGoToCart}>
              <Ionicons name="cart" size={16} color="#fff" />
              <Text style={styles.goToCartText}>Przejdź do koszyka</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getWarehouseLabel(w: string): string {
  const map: Record<string, string> = {
    HP: 'Magazyn Zielona Góra',
    'Hurtownia Przemysłowa': 'Magazyn Zielona Góra',
    Ikonka: 'Magazyn Białystok',
    BTP: 'Magazyn Chotów',
    Leker: 'Magazyn Chynów',
    Rzeszów: 'Magazyn Rzeszów',
    Outlet: 'Magazyn Rzeszów',
  };
  return map[w] || `Magazyn ${w}`;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },

  // Success
  successCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[900],
    textAlign: 'center',
    marginBottom: 16,
  },

  // Product card
  productCard: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary[50],
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 16,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary[100],
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.secondary[800],
    lineHeight: 18,
  },
  productQty: {
    fontSize: 12,
    color: Colors.secondary[500],
    marginTop: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary[600],
    marginTop: 4,
  },

  // Cross-sell
  crossSellSection: {
    marginBottom: 8,
  },
  crossSellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  crossSellBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossSellTitleCol: {
    flex: 1,
  },
  crossSellTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  crossSellWarehouse: {
    fontSize: 12,
    color: Colors.secondary[500],
    marginTop: 1,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.secondary[500],
  },
  crossSellGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  crossSellItem: {
    width: (SCREEN_WIDTH - 40 - 10) / 2 - 1,
    backgroundColor: Colors.secondary[50],
    borderRadius: 10,
    padding: 8,
  },
  crossSellImageWrap: {
    alignItems: 'center',
    marginBottom: 6,
  },
  crossSellImage: {
    width: 72,
    height: 72,
    borderRadius: 6,
  },
  crossSellName: {
    fontSize: 12,
    color: Colors.secondary[700],
    lineHeight: 16,
    marginBottom: 4,
  },
  crossSellPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#F97316',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[100],
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.secondary[300],
    backgroundColor: '#fff',
  },
  continueText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[700],
  },
  goToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary[500],
  },
  goToCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
