import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '../constants/Colors';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { WishlistProvider } from '../contexts/WishlistContext';
import { ToastProvider } from '../contexts/ToastContext';
import { useAuthRedirect } from '../hooks/useProtectedRoute';
import GiftNotification from '../components/GiftNotification';
import { couponsApi } from '../services/coupons';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      console.warn('Font loading error:', error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return <RootLayoutNav />;
}

function AuthRedirectHandler() {
  useAuthRedirect();
  return null;
}

function GiftNotificationHandler() {
  const { justRegistered, clearJustRegistered } = useAuth();
  const [giftVisible, setGiftVisible] = useState(false);
  const [discountData, setDiscountData] = useState<{ percent: number; code: string }>({
    percent: 0,
    code: '',
  });

  useEffect(() => {
    if (!justRegistered) return;

    // Wait a moment for the registration redirect to settle, then fetch discount
    const timer = setTimeout(async () => {
      try {
        const data = await couponsApi.getWelcomeDiscount();
        if (data.discount) {
          setDiscountData({
            percent: data.discount.discountPercent,
            code: data.discount.couponCode,
          });
          setGiftVisible(true);
        }
      } catch (err) {
        console.warn('Could not fetch welcome discount:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [justRegistered]);

  const handleClaim = () => {
    setGiftVisible(false);
    clearJustRegistered();
  };

  return (
    <GiftNotification
      visible={giftVisible}
      discountPercent={discountData.percent}
      couponCode={discountData.code}
      onClaim={handleClaim}
    />
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
          <WishlistProvider>
          <AuthRedirectHandler />
          <GiftNotificationHandler />
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="checkout" options={{ headerShown: false }} />
              <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
              <Stack.Screen
                name="product/[id]"
                options={{
                  headerShown: true,
                  title: 'Produkt',
                  headerBackTitle: 'Wróć',
                  headerTintColor: Colors.primary[500],
                }}
              />
              <Stack.Screen
                name="category/[slug]"
                options={{
                  headerShown: true,
                  title: 'Kategoria',
                  headerBackTitle: 'Wróć',
                  headerTintColor: Colors.primary[500],
                }}
              />
            </Stack>
          </ThemeProvider>
          </WishlistProvider>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
