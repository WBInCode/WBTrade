import { Stack } from 'expo-router';
import { Colors } from '../../constants/Colors';

export default function CheckoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.secondary[900],
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
