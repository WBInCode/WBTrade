import React, { useState, useCallback, useMemo } from 'react';
import { pluralizeProducts } from '../../../utils/pluralize';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../../hooks/useThemeColors';
import type { ThemeColors } from '../../../constants/Colors';
import { useToast } from '../../../contexts/ToastContext';
import { useCart } from '../../../contexts/CartContext';
import { shoppingListApi } from '../../../services/shopping-lists';
import type { ShoppingList, ShoppingListItem } from '../../../services/types';

export default function ShoppingListDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { show: showToast } = useToast();
  const { addToCart } = useCart();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    if (!id) return;
    try {
      const data = await shoppingListApi.getOne(id);
      setList(data);
    } catch {
      showToast('Nie udało się załadować listy', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchList();
    }, [fetchList])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchList();
  };

  const handleRemoveItem = (item: ShoppingListItem) => {
    Alert.alert(
      'Usuń produkt',
      `Usunąć "${item.product.name}" z listy?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await shoppingListApi.removeItem(id!, item.id);
              showToast('Usunięto z listy', 'success');
              fetchList();
            } catch {
              showToast('Nie udało się usunąć', 'error');
            }
          },
        },
      ]
    );
  };

  const handleAddToCart = async (item: ShoppingListItem) => {
    try {
      const variantId = item.variantId || item.productId;
      await addToCart(variantId, item.quantity || 1);
      showToast('Dodano do koszyka', 'success');
    } catch {
      showToast('Nie udało się dodać do koszyka', 'error');
    }
  };

  const handleEditList = () => {
    if (!list) return;
    setEditName(list.name);
    setEditDescription(list.description || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !id) return;
    try {
      setSaving(true);
      await shoppingListApi.update(id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      showToast('Lista zaktualizowana', 'success');
      setEditModalVisible(false);
      fetchList();
    } catch {
      showToast('Nie udało się zaktualizować listy', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteList = () => {
    if (!list) return;
    Alert.alert(
      'Usuń listę',
      `Usunąć "${list.name}"? Ta operacja jest nieodwracalna.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await shoppingListApi.delete(id!);
              showToast('Lista usunięta', 'success');
              router.back();
            } catch {
              showToast('Nie udało się usunąć listy', 'error');
            }
          },
        },
      ]
    );
  };

  const formatPrice = (price: number | string) => {
    const n = typeof price === 'string' ? parseFloat(price) : price;
    return `${n.toFixed(2).replace('.', ',')} zł`;
  };

  // --- Loading ---
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Lista zakupowa', headerBackTitle: 'Wróć', headerTintColor: colors.tint }} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!list) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Lista zakupowa', headerBackTitle: 'Wróć', headerTintColor: colors.tint }} />
        <View style={styles.emptyWrap}>
          <FontAwesome name="exclamation-circle" size={40} color={colors.inputBorder} />
          <Text style={styles.emptyTitle}>Nie znaleziono listy</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: ShoppingListItem }) => {
    const imageUrl = item.product.images?.[0]?.url;
    const isActive = item.product.status !== 'ARCHIVED';

    return (
      <View style={[styles.itemCard, !isActive && styles.itemCardInactive]}>
        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => router.push(`/product/${item.productId}`)}
          activeOpacity={0.7}
        >
          <View style={styles.itemImage}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} contentFit="contain" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <FontAwesome name="image" size={20} color={colors.inputBorder} />
              </View>
            )}
          </View>

          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
            {item.variant && (
              <Text style={styles.itemVariant}>{item.variant.name}</Text>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.itemPrice}>{formatPrice(item.product.price)}</Text>
              {item.product.compareAtPrice && (
                <Text style={styles.itemOldPrice}>
                  {formatPrice(item.product.compareAtPrice)}
                </Text>
              )}
            </View>
            {item.note && (
              <Text style={styles.itemNote} numberOfLines={1}>📝 {item.note}</Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => handleAddToCart(item)}
            activeOpacity={0.7}
            disabled={!isActive}
          >
            <FontAwesome name="shopping-cart" size={14} color={colors.textInverse} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => handleRemoveItem(item)}
            activeOpacity={0.7}
          >
            <FontAwesome name="trash-o" size={14} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: list.name,
          headerBackTitle: 'Wróć',
          headerTintColor: colors.tint,
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleEditList} style={styles.headerBtn}>
                <FontAwesome name="pencil" size={18} color={colors.tint} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteList} style={styles.headerBtn}>
                <FontAwesome name="trash-o" size={18} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {list.description && (
        <View style={styles.descriptionBanner}>
          <Text style={styles.descriptionText}>{list.description}</Text>
        </View>
      )}

      {list.items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <FontAwesome name="shopping-basket" size={48} color={colors.inputBorder} />
          <Text style={styles.emptyTitle}>Lista jest pusta</Text>
          <Text style={styles.emptySubtext}>
            Dodawaj produkty do tej listy ze strony produktu
          </Text>
        </View>
      ) : (
        <FlatList
          data={list.items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {pluralizeProducts(list.itemCount)}
              </Text>
            </View>
          }
        />
      )}

      {/* Edit List Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBg}
            onPress={() => setEditModalVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edytuj listę</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <FontAwesome name="times" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nazwa listy *"
              placeholderTextColor={colors.placeholder}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              maxLength={100}
            />

            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Opis (opcjonalny)"
              placeholderTextColor={colors.placeholder}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              maxLength={300}
            />

            <TouchableOpacity
              style={[styles.saveBtn, !editName.trim() && styles.saveBtnDisabled]}
              onPress={handleSaveEdit}
              disabled={!editName.trim() || saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={styles.saveBtnText}>Zapisz</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerBtn: {
    padding: 4,
  },
  descriptionBanner: {
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  descriptionText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  itemCardInactive: {
    opacity: 0.5,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.backgroundTertiary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 18,
  },
  itemVariant: {
    fontSize: 12,
    color: colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.tint,
  },
  itemOldPrice: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  itemNote: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemActions: {
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  cartBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.inputText,
    backgroundColor: colors.inputBackground,
    marginBottom: 12,
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: colors.tint,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: {
    backgroundColor: colors.inputBorder,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textInverse,
  },
});
