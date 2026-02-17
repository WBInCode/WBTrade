import { Stack } from 'expo-router';
import { Colors } from '../../../constants/Colors';

export default function OrderLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.secondary[900],
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
