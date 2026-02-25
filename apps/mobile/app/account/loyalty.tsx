import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';

export default function LoyaltyScreen() {
  const colors = useThemeColors();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing rocket animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fadeAnim, slideAnim, pulseAnim]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Program lojalnościowy',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundTertiary }]} edges={['bottom']}>
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Hero Card */}
            <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
              <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.heroEmoji}>🚀</Text>
              </Animated.View>

              <Text style={[styles.heroTitle, { color: colors.text }]}>
                Już wkrótce!
              </Text>

              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                Pracujemy nad programem lojalnościowym, który nagrodzi Cię za każdy zakup.
                Rozwijamy się dla Ciebie!
              </Text>
            </View>

            {/* Info Card */}
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <View style={styles.infoIconRow}>
                <FontAwesome name="info-circle" size={18} color={colors.tint} />
                <Text style={[styles.infoTitle, { color: colors.text }]}>
                  Twoje zakupy się liczą!
                </Text>
              </View>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Twoje zamówienia są przez nas rejestrowane. Po uruchomieniu programu 
                Twoja historia zakupów zostanie uwzględniona.
              </Text>
            </View>
          </Animated.View>
        </Animated.ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Hero Card
  heroCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroEmoji: {
    fontSize: 40,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 4,
  },

  // Info Card
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
