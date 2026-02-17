import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '../../constants/Colors';
import { useCart } from '../../contexts/CartContext';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';

function formatPrice(price: number) {
  return price.toFixed(2).replace('.', ',') + ' zł';
}

export default function CartScreen() {
  const router = useRouter();
  const { cart, loading, itemCount, updateQuantity, removeFromCart, refreshCart } = useCart();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
        <Spinner fullScreen />
      </SafeAreaView>
    );
  }

  const items = cart?.items || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          backgroundColor: Colors.white,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.secondary[900] }}>
          Koszyk {itemCount > 0 ? `(${itemCount})` : ''}
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <FontAwesome name="shopping-cart" size={56} color={Colors.secondary[300]} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: Colors.secondary[700], marginTop: 16 }}>
            Koszyk jest pusty
          </Text>
          <Text style={{ fontSize: 14, color: Colors.secondary[500], marginTop: 8, textAlign: 'center' }}>
            Dodaj produkty, aby rozpocząć zakupy
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/search')}
            style={{
              marginTop: 20,
              backgroundColor: Colors.primary[500],
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: Colors.white, fontWeight: '600', fontSize: 14 }}>
              Przeglądaj produkty
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={refreshCart} colors={[Colors.primary[500]]} />
            }
          >
            {items.map((item) => {
              const imageUrl = item.variant.product.images?.[0]?.url;
              const price = item.variant.price;

              return (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    backgroundColor: Colors.white,
                    marginHorizontal: 16,
                    marginTop: 10,
                    borderRadius: 10,
                    padding: 12,
                    gap: 12,
                  }}
                >
                  {/* Image */}
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: Colors.secondary[100] }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 8,
                        backgroundColor: Colors.secondary[100],
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <FontAwesome name="image" size={24} color={Colors.secondary[300]} />
                    </View>
                  )}

                  {/* Details */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, fontWeight: '500', color: Colors.secondary[900] }}
                      numberOfLines={2}
                    >
                      {item.variant.product.name}
                    </Text>
                    {item.variant.name && (
                      <Text style={{ fontSize: 12, color: Colors.secondary[500], marginTop: 2 }}>
                        {item.variant.name}
                      </Text>
                    )}
                    <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.primary[500], marginTop: 6 }}>
                      {formatPrice(price * item.quantity)}
                    </Text>

                    {/* Quantity controls */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
                      <TouchableOpacity
                        onPress={() =>
                          item.quantity > 1
                            ? updateQuantity(item.id, item.quantity - 1)
                            : removeFromCart(item.id)
                        }
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 6,
                          backgroundColor: Colors.secondary[100],
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <FontAwesome
                          name={item.quantity > 1 ? 'minus' : 'trash'}
                          size={12}
                          color={Colors.secondary[600]}
                        />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.secondary[900] }}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 6,
                          backgroundColor: Colors.primary[50],
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <FontAwesome name="plus" size={12} color={Colors.primary[500]} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Remove button */}
                  <TouchableOpacity onPress={() => removeFromCart(item.id)} style={{ padding: 4 }}>
                    <FontAwesome name="times" size={16} color={Colors.secondary[400]} />
                  </TouchableOpacity>
                </View>
              );
            })}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Bottom summary */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: Colors.white,
              borderTopWidth: 1,
              borderTopColor: Colors.border,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, color: Colors.secondary[600] }}>Razem:</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.secondary[900] }}>
                {formatPrice(cart?.total || 0)}
              </Text>
            </View>
            <Button
              title="Przejdź do kasy"
              onPress={() => router.push('/checkout')}
              fullWidth
              size="lg"
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
