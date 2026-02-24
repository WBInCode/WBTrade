import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

interface ShoppingList {
  id: string;
  name: string;
  itemCount: number;
  updatedAt: string;
}

export default function ShoppingListsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadLists = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const data = await api.get<{ lists: ShoppingList[] }>('/shopping-lists');
      setLists(data.lists || []);
    } catch (err) {
      console.error('Error loading shopping lists:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [])
  );

  const handleCreate = async () => {
    const name = newListName.trim();
    if (!name) return;

    setCreating(true);
    try {
      await api.post('/shopping-lists', { name });
      setModalVisible(false);
      setNewListName('');
      loadLists(true);
    } catch (err) {
      Alert.alert('Błąd', 'Nie udało się utworzyć listy');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Usuń listę', `Czy na pewno chcesz usunąć "${name}"?`, [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/shopping-lists/${id}`);
            setLists((prev) => prev.filter((l) => l.id !== id));
          } catch (err) {
            Alert.alert('Błąd', 'Nie udało się usunąć listy');
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Not logged in
  if (!user) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Listy zakupowe',
            headerShown: true,
            headerBackTitle: 'Konto',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
          }}
        />
        <SafeAreaView style={styles.container} edges={[]}>
          <View style={styles.guestState}>
            <FontAwesome name="list-ul" size={48} color={colors.inputBorder} />
            <Text style={styles.guestTitle}>Zaloguj się</Text>
            <Text style={styles.guestHint}>
              Aby korzystać z list zakupowych, musisz się zalogować.
            </Text>
            <View style={{ marginTop: 12 }}>
              <Button
                title="Zaloguj się"
                onPress={() => router.push('/login')}
              />
            </View>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const renderItem = ({ item }: { item: ShoppingList }) => (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => router.push(`/account/shopping-lists/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.listIcon}>
        <FontAwesome name="list-ul" size={18} color={colors.tint} />
      </View>
      <View style={styles.listInfo}>
        <Text style={styles.listName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.listMeta}>
          {item.itemCount} {item.itemCount === 1 ? 'produkt' : 'produktów'} · {formatDate(item.updatedAt)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleDelete(item.id, item.name)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.deleteListBtn}
      >
        <FontAwesome name="trash-o" size={16} color={colors.textMuted} />
      </TouchableOpacity>
      <FontAwesome name="chevron-right" size={12} color={colors.inputBorder} />
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Listy zakupowe',
          headerShown: true,
          headerBackTitle: 'Konto',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      <SafeAreaView style={styles.container} edges={[]}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : lists.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FontAwesome name="list-ul" size={40} color={colors.inputBorder} />
            </View>
            <Text style={styles.emptyTitle}>Brak list zakupowych</Text>
            <Text style={styles.emptyHint}>
              Utwórz swoją pierwszą listę, aby zapisywać produkty na później.
            </Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <FontAwesome name="plus" size={14} color={colors.textInverse} />
              <Text style={styles.createBtnText}>Nowa lista</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={lists}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadLists(true)}
                  tintColor={colors.tint}
                  colors={[colors.tint]}
                />
              }
              ListHeaderComponent={
                <Text style={styles.listHeader}>
                  Twoje listy ({lists.length})
                </Text>
              }
            />
            {/* FAB */}
            <TouchableOpacity
              style={styles.fab}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <FontAwesome name="plus" size={22} color={colors.textInverse} />
            </TouchableOpacity>
          </>
        )}

        {/* Create modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Nowa lista zakupowa</Text>
              <TextInput
                style={styles.modalInput}
                value={newListName}
                onChangeText={setNewListName}
                placeholder="Nazwa listy"
                placeholderTextColor={colors.placeholder}
                autoFocus
                maxLength={50}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setModalVisible(false);
                    setNewListName('');
                  }}
                >
                  <Text style={styles.modalCancelText}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalCreateBtn, !newListName.trim() && { opacity: 0.5 }]}
                  onPress={handleCreate}
                  disabled={!newListName.trim() || creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <Text style={styles.modalCreateText}>Utwórz</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Guest state
  guestState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.card,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  guestHint: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Empty
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.card,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createBtnText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingBottom: 100,
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    padding: 16,
    paddingBottom: 8,
  },

  // List card
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    gap: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.tintLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  listMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  deleteListBtn: {
    padding: 6,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalCreateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.tint,
    alignItems: 'center',
  },
  modalCreateText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textInverse,
  },
});
