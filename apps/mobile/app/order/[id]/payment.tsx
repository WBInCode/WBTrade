import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import Button from '../../../components/ui/Button';

export default function PaymentScreen() {
  const { id, url } = useLocalSearchParams<{ id: string; url: string }>();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  const paymentUrl = decodeURIComponent(url || '');

  const handleNavigationChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);

    const currentUrl = navState.url;

    // Detect return from PayU - redirect to confirmation
    // PayU returns to our frontend URL with /order/{id}/confirmation
    if (
      currentUrl.includes('/order/') && currentUrl.includes('/confirmation')
    ) {
      // Payment completed (success or partial), navigate to confirmation
      router.replace(`/order/${id}/confirmation` as any);
      return;
    }

    // Detect cancel from PayU
    if (currentUrl.includes('cancelled=true') || currentUrl.includes('/checkout?orderId=')) {
      // Payment was cancelled, go to confirmation which shows retry option
      router.replace(`/order/${id}/confirmation` as any);
      return;
    }

    // Detect deep link scheme (if API returns wbtrade:// URL)
    if (currentUrl.startsWith('wbtrade://')) {
      const path = currentUrl.replace('wbtrade://', '');
      router.replace(`/${path}` as any);
      return;
    }
  };

  const handleShouldStartLoad = (event: any) => {
    const url = event.url;

    // Intercept wbtrade:// deep links
    if (url.startsWith('wbtrade://')) {
      const path = url.replace('wbtrade://', '');
      router.replace(`/${path}` as any);
      return false;
    }

    return true;
  };

  if (!paymentUrl) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.destructive} />
        <Text style={styles.errorText}>Brak adresu URL płatności</Text>
        <Button
          title="Wróć do zamówienia"
          onPress={() => router.replace(`/order/${id}/confirmation` as any)}
          variant="outline"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            if (canGoBack && webViewRef.current) {
              webViewRef.current.goBack();
            } else {
              router.replace(`/order/${id}/confirmation` as any);
            }
          }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.secondary[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Płatność PayU</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.replace(`/order/${id}/confirmation` as any)}
        >
          <Ionicons name="close" size={24} color={Colors.secondary[800]} />
        </TouchableOpacity>
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Ładowanie strony płatności...</Text>
        </View>
      )}

      {/* Error state */}
      {error && (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Spróbuj ponownie"
            onPress={() => {
              setError(null);
              setLoading(true);
              webViewRef.current?.reload();
            }}
            variant="outline"
          />
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: paymentUrl }}
        style={[styles.webview, error && { display: 'none' }]}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          setError(`Błąd ładowania: ${nativeEvent.description}`);
          setLoading(false);
        }}
        onNavigationStateChange={handleNavigationChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        scalesPageToFit
        sharedCookiesEnabled
      />

      {/* Security info bar */}
      <View style={styles.securityBar}>
        <Ionicons name="lock-closed" size={14} color={Colors.success} />
        <Text style={styles.securityText}>Bezpieczna płatność PayU</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary[900],
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.secondary[500],
  },
  errorText: {
    fontSize: 14,
    color: Colors.destructive,
    textAlign: 'center',
  },
  webview: {
    flex: 1,
  },
  securityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    backgroundColor: Colors.secondary[50],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  securityText: {
    fontSize: 12,
    color: Colors.secondary[500],
  },
});
