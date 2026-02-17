import React, { useRef } from 'react';
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

const INPOST_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJzQlpXVzFNZzVlQnpDYU1XU3JvTlBjRWFveFpXcW9Ua2FuZVB3X291LWxvIn0.eyJleHAiOjIwNDkwMzA2NjksImlhdCI6MTczMzY3MDY2OSwiYXV0aF90aW1lIjoxNzMzNjcwNjY5LCJqdGkiOiJiNmUyYmRiOC1iZjFmLTQxNzktOTk5ZC1kNmFlMWY4MjdjNzMiLCJpc3MiOiJodHRwczovL2xvZ2luLmlucG9zdC5wbC9hdXRoL3JlYWxtcy9leHRlcm5hbCIsInN1YiI6ImY6MTJhZTVjODItZTlhNC00NThmLWFhNTItMWViMDNlYmFjOTRlOmtKS1dWdGJZX3R3eVRiUDlFeXU3MmFiUFhCSjlhNXh3eFBKd05pZGhJTjgiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzaGlweCIsInNlc3Npb25fc3RhdGUiOiIzMjY3NzllYi0xMmU5LTQwMjgtODJiMy04MGMzNmIzODRjMWIiLCJzY29wZSI6Im9wZW5pZCBhcGk6YXBpcG9pbnRzIiwic2lkIjoiMzI2Nzc5ZWItMTJlOS00MDI4LTgyYjMtODBjMzZiMzg0YzFiIiwiYWxsb3dlZF9yZWZlcnJlcnMiOiIiLCJ1dWlkIjoiNWExOTEzYjQtMjI3NC01Y2VjLThmZjItNTQ3NThlMmYwNDg0In0.XvzpVGInkjHpQX9lsLNRNXPLAMT1rUdvMFJ7sBU1lHNYTPPOuH2qmw0M6d8V3MO6RB3LFaTdZnr77hkwX2EoNpJLmWCsYbkaoWg0qHYaJn_oWBJ5LAqYbMiNc_JYchRWqP-sBpXaRUWBXCCJZtb4v7gDIc2RL8E7EjrwZ8b_0bIelLEGODwi9bIfRm--TmpBlvSqEBt0lBPGsD4DjXxYKiV7Vkdz9KIEA7OYF6a1f0PaV62bHvti_ILKnIRYMpFXcjRF14xLK3UZN3Gj7WcHFHlNz1FLKCuFxJCPRFCFo0J1f6l0zVHTh9_40Gv8cboY9vbvUMRxaVOkD6IhtBVFA';

export default function PaczkomatPicker({ isOpen, onClose, onPointSelect }: PaczkomatPickerProps) {
  const webViewRef = useRef<WebView>(null);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://geowidget.inpost.pl/inpost-geowidget.css" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        inpost-geowidget { display: block; width: 100%; height: 100%; }
      </style>
    </head>
    <body>
      <script src="https://geowidget.inpost.pl/inpost-geowidget.js" defer></script>
      <script>
        function onPointSelect(point) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'POINT_SELECTED',
            point: point
          }));
        }
        
        document.addEventListener('DOMContentLoaded', function() {
          var el = document.createElement('inpost-geowidget');
          el.setAttribute('token', '${INPOST_TOKEN}');
          el.setAttribute('language', 'pl');
          el.setAttribute('config', 'parcelCollect');
          el.setAttribute('onpoint', 'onPointSelect');
          el.style.width = '100%';
          el.style.height = '100%';
          el.style.display = 'block';
          document.body.appendChild(el);
        });
      </script>
    </body>
    </html>
  `;

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
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
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

        {/* WebView with InPost GeoWidget */}
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.webView}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          allowsInlineMediaPlayback={true}
          mixedContentMode="compatibility"
          geolocationEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loading}>
              <Text style={styles.loadingText}>Ładowanie mapy...</Text>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1D1D1B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1D1D1B',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(29,29,27,0.7)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(29,29,27,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    color: '#1D1D1B',
    fontWeight: '600',
  },
  webView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
});
