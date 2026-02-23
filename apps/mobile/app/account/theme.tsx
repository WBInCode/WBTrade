import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme, ThemePreference } from '../../contexts/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';

const options: { value: ThemePreference; label: string; description: string; icon: string }[] = [
  {
    value: 'auto',
    label: 'Automatyczny',
    description: 'Motyw dostosowuje się do ustawień systemu',
    icon: 'mobile-phone',
  },
  {
    value: 'light',
    label: 'Jasny',
    description: 'Zawsze jasny motyw',
    icon: 'sun-o',
  },
  {
    value: 'dark',
    label: 'Ciemny',
    description: 'Zawsze ciemny motyw',
    icon: 'moon-o',
  },
];

export default function ThemeScreen() {
  const { themePreference, setThemePreference, colorScheme } = useTheme();
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Motyw',
          headerBackTitle: 'Wróć',
          headerTintColor: colors.tint,
          headerStyle: { backgroundColor: colors.headerBackground },
          headerTitleStyle: { color: colors.headerText },
        }}
      />

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {options.map((option, index) => {
            const isSelected = themePreference === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  index < options.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
                ]}
                onPress={() => setThemePreference(option.value)}
                activeOpacity={0.6}
              >
                <View style={[styles.iconWrap, { backgroundColor: isSelected ? colors.tintLight : colors.backgroundTertiary }]}>
                  <FontAwesome
                    name={option.icon as any}
                    size={18}
                    color={isSelected ? colors.tint : colors.textMuted}
                  />
                </View>
                <View style={styles.textWrap}>
                  <Text style={[styles.label, { color: colors.text }]}>{option.label}</Text>
                  <Text style={[styles.description, { color: colors.textSecondary }]}>{option.description}</Text>
                </View>
                <View style={[styles.radio, { borderColor: isSelected ? colors.tint : colors.border }]}>
                  {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.tint }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {themePreference === 'auto' && (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Aktualny motyw systemu: {colorScheme === 'dark' ? 'ciemny' : 'jasny'}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
});
