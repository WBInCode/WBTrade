import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export default function Card({ children, style, padding = 16 }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: Colors.white,
          borderRadius: 12,
          padding,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
