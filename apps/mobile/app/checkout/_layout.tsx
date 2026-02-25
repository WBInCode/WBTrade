import { Stack } from 'expo-router';
import { useThemeColors } from '../../hooks/useThemeColors';

export default function CheckoutLayout() {
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
        name="index"
        options={{
          title: 'Zamówienie',
          headerBackTitle: 'Koszyk',
        }}
      />
    </Stack>
  );
}
