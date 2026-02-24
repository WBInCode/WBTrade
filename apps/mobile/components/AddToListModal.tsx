import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import type { ThemeColors } from '../constants/Colors';
import { shoppingListApi } from '../services/shopping-lists';
import { useToast } from '../contexts/ToastContext';
import type { ShoppingList } from '../services/types';

interface AddToListModalProps {
  visible: boolean;
  onClose: () => void;
  productId: string;
  productName?: string;
}

export default function AddToListModal({ visible, onClose, productId, productName }: AddToListModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [addingToListId, setAddingToListId] = useState<string | null>(null);
  const { show: showToast } = useToast();

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      const data = await shoppingListApi.getAll();
      setLists(data.lists || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchLists();
      setShowNewListInput(false);
      setNewListName('');
    }
  }, [visible, fetchLists]);

  const handleCreateAndAdd = async () => {
    if (!newListName.trim()) return;
    try {
      setCreating(true);
      const newList = await shoppingListApi.create(newListName.trim());
      await shoppingListApi.addItem(newList.id, productId);
      showToast(`Dodano do "${newList.name}"`, 'success');
      onClose();
    } catch (err: any) {
      showToast('Nie udało się utworzyć listy', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleAddToList = async (list: ShoppingList) => {
    try {
      setAddingToListId(list.id);
      await shoppingListApi.addItem(list.id, productId);
      showToast(`Dodano do "${list.name}"`, 'success');
      onClose();
    } catch (err: any) {
      showToast('Nie udało się dodać do listy', 'error');
    } finally {
      setAddingToListId(null);
    }
  };

  const renderListItem = ({ item }: { item: ShoppingList }) => {
    const isAdding = addingToListId === item.id;
    return (
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => handleAddToList(item)}
        disabled={isAdding}
        activeOpacity={0.7}
      >
        <View style={styles.listItemLeft}>
          <View style={styles.listIcon}>
            <FontAwesome name="list-ul" size={16} color={colors.tint} />
          </View>
          <View style={styles.listItemInfo}>
            <Text style={styles.listItemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.listItemCount}>
              {item.itemCount} {item.itemCount === 1 ? 'produkt' : item.itemCount < 5 ? 'produkty' : 'produktów'}
            </Text>
          </View>
        </View>
        {isAdding ? (
          <ActivityIndicator size="small" color={colors.tint} />
        ) : (
          <FontAwesome name="plus" size={16} color={colors.tint} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.overlayBg} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Dodaj do listy</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <FontAwesome name="times" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {productName && (
            <Text style={styles.productName} numberOfLines={1}>{productName}</Text>
          )}

          {/* List of existing lists */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <>
              {lists.length > 0 && (
                <FlatList
                  data={lists}
                  renderItem={renderListItem}
                  keyExtractor={(item) => item.id}
                  style={styles.flatList}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              )}

              {lists.length === 0 && !showNewListInput && (
                <View style={styles.emptyWrap}>
                  <FontAwesome name="list-ul" size={40} color={colors.inputBorder} />
                  <Text style={styles.emptyText}>Nie masz jeszcze żadnych list</Text>
                  <Text style={styles.emptySubtext}>Utwórz swoją pierwszą listę zakupową</Text>
                </View>
              )}
            </>
          )}

          {/* Create new list section */}
          {showNewListInput ? (
            <View style={styles.newListSection}>
              <TextInput
                style={styles.newListInput}
                placeholder="Nazwa nowej listy..."
                placeholderTextColor={colors.placeholder}
                value={newListName}
                onChangeText={setNewListName}
                autoFocus
                maxLength={100}
              />
              <View style={styles.newListActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowNewListInput(false);
                    setNewListName('');
                  }}
                >
                  <Text style={styles.cancelBtnText}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createBtn, !newListName.trim() && styles.createBtnDisabled]}
                  onPress={handleCreateAndAdd}
                  disabled={!newListName.trim() || creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <Text style={styles.createBtnText}>Utwórz i dodaj</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.newListBtn}
              onPress={() => setShowNewListInput(true)}
              activeOpacity={0.7}
            >
              <FontAwesome name="plus-circle" size={20} color={colors.tint} />
              <Text style={styles.newListBtnText}>Utwórz nową listę</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  productName: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  flatList: {
    maxHeight: 250,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.tintLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  listItemCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  separator: {
    height: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textMuted,
  },
  newListSection: {
    marginTop: 16,
    gap: 12,
  },
  newListInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.inputText,
    backgroundColor: colors.backgroundSecondary,
  },
  newListActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  createBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.tint,
    alignItems: 'center',
  },
  createBtnDisabled: {
    backgroundColor: colors.inputBorder,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textInverse,
  },
  newListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundTertiary,
  },
  newListBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.tint,
  },
});
