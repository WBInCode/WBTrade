import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning';

interface BadgeProps {
  text: string | number;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const getVariantColors = (colors: ThemeColors): Record<BadgeVariant, { bg: string; text: string }> => ({
  primary: { bg: colors.tint, text: colors.textInverse },
  secondary: { bg: colors.border, text: colors.text },
  success: { bg: colors.success, text: colors.textInverse },
  danger: { bg: colors.destructive, text: colors.textInverse },
  warning: { bg: colors.warning, text: colors.textInverse },
});

export default function Badge({ text, variant = 'primary', size = 'sm', style }: BadgeProps) {
  const colors = useThemeColors();
  const badgeColors = getVariantColors(colors)[variant];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        {
          backgroundColor: badgeColors.bg,
          borderRadius: 100,
          paddingHorizontal: isSmall ? 6 : 10,
          paddingVertical: isSmall ? 2 : 4,
          alignSelf: 'flex-start',
          minWidth: isSmall ? 18 : 24,
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Text
        style={{
          color: badgeColors.text,
          fontSize: isSmall ? 11 : 13,
          fontWeight: '700',
        }}
      >
        {text}
      </Text>
    </View>
  );
}
