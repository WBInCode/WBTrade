import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

import { AppThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { WishlistProvider } from '../contexts/WishlistContext';
import { ToastProvider } from '../contexts/ToastContext';
import { useAuthRedirect } from '../hooks/useProtectedRoute';
import GiftNotification from '../components/GiftNotification';
import { couponsApi } from '../services/coupons';
import AnimatedSplash from '../components/AnimatedSplash';
import { AlertProvider } from '../components/ui/CustomAlert';

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

  if (!loaded && !error) {
    return null;
  }

  return (
    <AppThemeProvider>
      <RootLayoutNav />
    </AppThemeProvider>
  );
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
        } else {
          // API responded but no discount yet (async generation) — show with default
          setDiscountData({ percent: 20, code: 'Sprawdź w Moje rabaty' });
          setGiftVisible(true);
        }
      } catch (err) {
        // API endpoint may not be deployed yet — show gift with default values
        console.warn('Could not fetch welcome discount:', err);
        setDiscountData({ percent: 20, code: 'Sprawdź w Moje rabaty' });
        setGiftVisible(true);
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
  const { colorScheme, colors, themeLoaded } = useTheme();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    if (themeLoaded) {
      SplashScreen.hideAsync();
    }
  }, [themeLoaded]);

  if (!themeLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <WishlistProvider>
              <AlertProvider>
              <AuthRedirectHandler />
              <GiftNotificationHandler />
              <StatusBar barStyle={colors.statusBar} />
              {showAnimatedSplash && (
                <AnimatedSplash onFinish={() => setShowAnimatedSplash(false)} colorScheme={colorScheme} />
              )}
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
                      headerTintColor: colors.tint,
                      headerStyle: { backgroundColor: colors.headerBackground },
                      headerTitleStyle: { color: colors.headerText },
                    }}
                  />
                  <Stack.Screen
                    name="product/reviews"
                    options={{
                      headerShown: true,
                      title: 'Opinie',
                      headerBackTitle: 'Wróć',
                      headerTintColor: colors.tint,
                      headerStyle: { backgroundColor: colors.headerBackground },
                      headerTitleStyle: { color: colors.headerText },
                    }}
                  />
                </Stack>
              </ThemeProvider>
              </AlertProvider>
            </WishlistProvider>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
