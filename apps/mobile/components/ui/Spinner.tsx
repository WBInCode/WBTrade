import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export default function Spinner({
  size = 'large',
  color = Colors.primary[500],
  fullScreen = false,
}: SpinnerProps) {
  if (fullScreen) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size={size} color={color} />
      </View>
    );
  }

  return <ActivityIndicator size={size} color={color} />;
}
