import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import Config from '../../constants/Config';
import { useThemeColors } from '../../hooks/useThemeColors';

export interface InPostPoint {
  name: string;
  address: {
    line1: string;
    line2: string;
  };
  address_details?: {
    city: string;
    street: string;
    building_number: string;
    post_code: string;
  };
}

interface PaczkomatPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onPointSelect: (point: InPostPoint) => void;
}

const INPOST_TOKEN =
  'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJzQlpXVzFNZzVlQnpDYU1XU3JvTlBjRWFveFpXcW9Ua2FuZVB3X291LWxvIn0.eyJleHAiOjIwMzQyNDc0MDQsImlhdCI6MTcxODg4NzQwNCwianRpIjoiMmZhNWI5YTktZjhhNS00ZWI4LTljNjgtZjJkN2JiNmJhZmI3IiwiaXNzIjoiaHR0cHM6Ly9sb2dpbi5pbnBvc3QucGwvYXV0aC9yZWFsbXMvZXh0ZXJuYWwiLCJzdWIiOiJmOjEyNDc1MDUxLTFjMDMtNGU1OS1iYTBjLTJiNDU2OTVlZjUzNTpncGwtbWFwLXdpZGdldC10b2tlbiIsInR5cCI6IkJlYXJlciIsImF6cCI6InNoaXB4LWFwcC13aWRnZXRzIiwiYWxsb3dlZC1vcmlnaW5zIjpbIioiXSwic2NvcGUiOiJvcGVuaWQgYXBpOmFwaXBvaW50cyIsInNpZCI6IjM5ZjI3MjFiLTkyYjUtNGMwNC04YTNjLTYxYWZiZjMzYjE2NyIsImNsaWVudEhvc3QiOiIxNzIuMjYuMTAuMjM1IiwiY2xpZW50QWRkcmVzcyI6IjE3Mi4yNi4xMC4yMzUiLCJjbGllbnRfaWQiOiJzaGlweC1hcHAtd2lkZ2V0cyJ9.nS8CZjQC_6yxKQKvQdh2mJzW-kQqZw6gxEJQjB7YfQ3VLCEbTZCEGlnD6QMXwqOblFf-zCHGV8H9y7nqgXYD_e89SQnJF6GqFy_hJ6YLsQ';

export default function PaczkomatPicker({ isOpen, onClose, onPointSelect }: PaczkomatPickerProps) {
  const colors = useThemeColors();
  const webViewRef = useRef<WebView>(null);

  // Request location permission when the picker opens
  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.log('Location permission not granted for PaczkomatPicker');
          }
        } catch (err) {
          console.error('Failed to request location permission:', err);
        }
      })();
    }
  }, [isOpen]);

  // The widget is served by our API server so the browser origin is our real domain — no "Brak dostępu" issue
  const baseApiUrl = Config.API_URL.replace(/\/api\/?$/, '');
  const widgetUrl = `${baseApiUrl}/api/inpost-widget?token=${encodeURIComponent(INPOST_TOKEN)}`;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'POINT_SELECTED' && data.point) {
        onPointSelect(data.point);
        onClose();
      }
    } catch (err) {
      console.error('PaczkomatPicker message parse error:', err);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Text style={styles.headerIconText}>📍</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Wybierz Paczkomat</Text>
              <Text style={styles.headerSubtitle}>Znajdź najbliższy punkt odbioru</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* InPost GeoWidget loaded from our API server */}
        <WebView
          ref={webViewRef}
          source={{ uri: widgetUrl }}
          style={[styles.webView, { backgroundColor: colors.background }]}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          allowsInlineMediaPlayback={true}
          mixedContentMode="compatibility"
          geolocationEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={[styles.loading, { backgroundColor: colors.background }]}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Ładowanie mapy InPost...</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFCD00',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFCD00',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1D1D1B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: { fontSize: 20 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1D1D1B' },
  headerSubtitle: { fontSize: 12, color: 'rgba(29,29,27,0.7)' },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(29,29,27,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 18, color: '#1D1D1B', fontWeight: '600' },
  webView: { flex: 1 },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { fontSize: 14 },
});
