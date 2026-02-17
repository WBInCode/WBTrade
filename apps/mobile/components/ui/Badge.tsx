import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning';

interface BadgeProps {
  text: string | number;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: Colors.primary[500], text: Colors.white },
  secondary: { bg: Colors.secondary[200], text: Colors.secondary[800] },
  success: { bg: Colors.success, text: Colors.white },
  danger: { bg: Colors.destructive, text: Colors.white },
  warning: { bg: Colors.warning, text: Colors.white },
};

export default function Badge({ text, variant = 'primary', size = 'sm', style }: BadgeProps) {
  const colors = variantColors[variant];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        {
          backgroundColor: colors.bg,
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
          color: colors.text,
          fontSize: isSmall ? 11 : 13,
          fontWeight: '700',
        }}
      >
        {text}
      </Text>
    </View>
  );
}
