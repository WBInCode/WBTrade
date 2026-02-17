import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

import { Colors } from '../constants/Colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Nie znaleziono' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Ta strona nie istnieje.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Wróć na stronę główną</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.secondary[900],
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary[500],
  },
});
