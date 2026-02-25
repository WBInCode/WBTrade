import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export default function Spinner({
  size = 'large',
  color,
  fullScreen = false,
}: SpinnerProps) {
  const colors = useThemeColors();
  const spinnerColor = color || colors.tint;

  if (fullScreen) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size={size} color={spinnerColor} />
      </View>
    );
  }

  return <ActivityIndicator size={size} color={spinnerColor} />;
}
