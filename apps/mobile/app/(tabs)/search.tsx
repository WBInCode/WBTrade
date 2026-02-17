import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '../../constants/Colors';
import { useSearch } from '../../hooks/useSearch';
import ProductCard from '../../components/product/ProductCard';
import Spinner from '../../components/ui/Spinner';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { results, suggestions, debouncedQuery } = useSearch(query);

  const products = results.data?.products || [];
  const suggestionList = suggestions.data || [];
  const showSuggestions = query.length >= 2 && suggestionList.length > 0 && products.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Search bar */}
      <View
        style={{
          backgroundColor: Colors.white,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Colors.secondary[100],
            borderRadius: 10,
            paddingHorizontal: 12,
            height: 44,
          }}
        >
          <FontAwesome name="search" size={16} color={Colors.secondary[400]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Szukaj produktów..."
            placeholderTextColor={Colors.secondary[400]}
            style={{
              flex: 1,
              marginLeft: 10,
              fontSize: 15,
              color: Colors.secondary[900],
            }}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <FontAwesome name="times-circle" size={18} color={Colors.secondary[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggestions */}
      {showSuggestions && (
        <View style={{ backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
          {suggestionList.map((s: string, i: number) => (
            <TouchableOpacity
              key={i}
              onPress={() => setQuery(s)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: i < suggestionList.length - 1 ? 1 : 0,
                borderBottomColor: Colors.secondary[100],
                gap: 10,
              }}
            >
              <FontAwesome name="search" size={13} color={Colors.secondary[400]} />
              <Text style={{ fontSize: 14, color: Colors.secondary[700] }}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results */}
      {query.length < 2 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <FontAwesome name="search" size={48} color={Colors.secondary[300]} />
          <Text style={{ fontSize: 16, color: Colors.secondary[500], marginTop: 16, textAlign: 'center' }}>
            Wpisz min. 2 znaki, aby wyszukać produkty
          </Text>
        </View>
      ) : results.isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Spinner size="large" />
        </View>
      ) : products.length === 0 && debouncedQuery.length >= 2 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <FontAwesome name="frown-o" size={48} color={Colors.secondary[300]} />
          <Text style={{ fontSize: 16, color: Colors.secondary[500], marginTop: 16, textAlign: 'center' }}>
            Brak wyników dla "{debouncedQuery}"
          </Text>
          <Text style={{ fontSize: 14, color: Colors.secondary[400], marginTop: 8, textAlign: 'center' }}>
            Spróbuj innej frazy
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => <ProductCard product={item} />}
        />
      )}
    </SafeAreaView>
  );
}
