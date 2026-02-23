import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const getVariantStyles = (colors: ThemeColors): Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> => ({
  primary: {
    container: { backgroundColor: colors.tint },
    text: { color: colors.textInverse },
  },
  secondary: {
    container: { backgroundColor: colors.text },
    text: { color: colors.textInverse },
  },
  outline: {
    container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.tint },
    text: { color: colors.tint },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.tint },
  },
});

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
    text: { fontSize: 13 },
  },
  md: {
    container: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
    text: { fontSize: 15 },
  },
  lg: {
    container: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 10 },
    text: { fontSize: 17 },
  },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
}: ButtonProps) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;
  const variantStyles = getVariantStyles(colors);
  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        vStyle.container,
        sStyle.container,
        fullWidth && { width: '100%' },
        isDisabled && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.tint : colors.textInverse}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              { fontWeight: '600', textAlign: 'center' },
              vStyle.text,
              sStyle.text,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
