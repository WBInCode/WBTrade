import { Stack } from 'expo-router';
import { useThemeColors } from '../../../hooks/useThemeColors';

export default function OrderLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="confirmation"
        options={{ title: 'Potwierdzenie zamówienia' }}
      />
      <Stack.Screen
        name="payment"
        options={{ title: 'Płatność', headerShown: false }}
      />
    </Stack>
  );
}
