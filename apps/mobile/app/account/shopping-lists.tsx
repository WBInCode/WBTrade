import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { shoppingListApi } from '../../services/shopping-lists';
import type { ShoppingList } from '../../services/types';
import Button from '../../components/ui/Button';

export default function ShoppingListsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { show: showToast } = useToast();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchLists = useCallback(async () => {
    if (!user) return;
    try {
      const data = await shoppingListApi.getAll();
      setLists(data.lists || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchLists();
    }, [fetchLists])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLists();
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      setCreating(true);
      await shoppingListApi.create(newListName.trim(), newListDescription.trim() || undefined);
      showToast('Lista utworzona!', 'success');
      setShowCreateModal(false);
      setNewListName('');
      setNewListDescription('');
      fetchLists();
    } catch {
      showToast('Nie udało się utworzyć listy', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteList = (list: ShoppingList) => {
    Alert.alert(
      'Usuń listę',
      `Czy na pewno chcesz usunąć "${list.name}"? Ta operacja jest nieodwracalna.`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await shoppingListApi.delete(list.id);
              showToast('Lista usunięta', 'success');
              fetchLists();
            } catch {
              showToast('Nie udało się usunąć listy', 'error');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // --- Guest State ---
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Listy zakupowe', headerBackTitle: 'Wróć', headerTintColor: Colors.primary[500] }} />
        <View style={styles.guestWrap}>
          <FontAwesome name="list-ul" size={48} color={Colors.secondary[300]} />
          <Text style={styles.guestTitle}>Listy zakupowe</Text>
          <Text style={styles.guestSubtext}>Zaloguj się, aby tworzyć listy zakupowe</Text>
          <Button title="Zaloguj się" onPress={() => router.push('/(auth)/login')} />
        </View>
      </SafeAreaView>
    );
  }

  // --- Loading State ---
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Listy zakupowe', headerBackTitle: 'Wróć', headerTintColor: Colors.primary[500] }} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  const renderListCard = ({ item }: { item: ShoppingList }) => {
    const previewImages = item.items
      .slice(0, 4)
      .map((i) => i.product.images?.[0]?.url)
      .filter(Boolean);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/account/shopping-list/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardIconWrap}>
              <FontAwesome name="list-ul" size={16} color={Colors.primary[500]} />
            </View>
            <View style={styles.cardTitleInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.cardDescription} numberOfLines={1}>{item.description}</Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteList(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome name="trash-o" size={18} color={Colors.secondary[400]} />
          </TouchableOpacity>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardCount}>
            {item.itemCount} {item.itemCount === 1 ? 'produkt' : item.itemCount < 5 ? 'produkty' : 'produktów'}
          </Text>
          <Text style={styles.cardDate}>
            {formatDate(item.updatedAt)}
          </Text>
        </View>

        <View style={styles.cardArrow}>
          <FontAwesome name="chevron-right" size={14} color={Colors.secondary[300]} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Listy zakupowe', headerBackTitle: 'Wróć', headerTintColor: Colors.primary[500] }} />

      {lists.length === 0 ? (
        <View style={styles.emptyWrap}>
          <FontAwesome name="list-ul" size={48} color={Colors.secondary[300]} />
          <Text style={styles.emptyTitle}>Brak list zakupowych</Text>
          <Text style={styles.emptySubtext}>
            Twórz listy zakupowe, aby zapisywać interesujące Cię produkty
          </Text>
          <TouchableOpacity
            style={styles.createBtnLarge}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <FontAwesome name="plus" size={16} color={Colors.white} />
            <Text style={styles.createBtnLargeText}>Utwórz pierwszą listę</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={lists}
            renderItem={renderListCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary[500]}
              />
            }
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowCreateModal(true)}
            activeOpacity={0.8}
          >
            <FontAwesome name="plus" size={22} color={Colors.white} />
          </TouchableOpacity>
        </>
      )}

      {/* Create List Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBg}
            onPress={() => setShowCreateModal(false)}
            activeOpacity={1}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nowa lista zakupowa</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <FontAwesome name="times" size={20} color={Colors.secondary[500]} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nazwa listy *"
              placeholderTextColor={Colors.secondary[400]}
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
              maxLength={100}
            />

            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Opis (opcjonalny)"
              placeholderTextColor={Colors.secondary[400]}
              value={newListDescription}
              onChangeText={setNewListDescription}
              multiline
              maxLength={300}
            />

            <TouchableOpacity
              style={[styles.modalCreateBtn, !newListName.trim() && styles.modalCreateBtnDisabled]}
              onPress={handleCreateList}
              disabled={!newListName.trim() || creating}
              activeOpacity={0.8}
            >
              {creating ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.modalCreateBtnText}>Utwórz listę</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[50],
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[800],
    marginTop: 8,
  },
  guestSubtext: {
    fontSize: 14,
    color: Colors.secondary[500],
    textAlign: 'center',
    marginBottom: 8,
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
    color: Colors.secondary[700],
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.secondary[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  createBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  createBtnLargeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.secondary[500],
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary[100],
  },
  cardCount: {
    fontSize: 13,
    color: Colors.secondary[600],
    fontWeight: '500',
  },
  cardDate: {
    fontSize: 12,
    color: Colors.secondary[400],
  },
  cardArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
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
    backgroundColor: Colors.white,
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
    color: Colors.secondary[900],
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.secondary[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.secondary[800],
    backgroundColor: Colors.secondary[50],
    marginBottom: 12,
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalCreateBtn: {
    backgroundColor: Colors.primary[500],
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCreateBtnDisabled: {
    backgroundColor: Colors.secondary[300],
  },
  modalCreateBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});
