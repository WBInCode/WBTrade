import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { WB_LOGO } from './constants';

interface ChatBubbleProps {
  onPress: () => void;
  hasActiveChat?: boolean;
}

export function ChatBubble({ onPress, hasActiveChat }: ChatBubbleProps) {
  const colors = useThemeColors();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <View style={bubbleStyles.wrapper}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={[bubbleStyles.container, { backgroundColor: colors.tint, shadowColor: colors.shadow }]}
        >
          <FontAwesome name="comments" size={24} color="#fff" />
          {hasActiveChat && (
            <View style={bubbleStyles.activeDot} />
          )}
        </TouchableOpacity>
        <View style={[bubbleStyles.label, { backgroundColor: colors.card, shadowColor: colors.shadow, borderColor: colors.border }]}>
          <Text style={[bubbleStyles.labelText, { color: colors.text }]}>Zapytaj</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const bubbleStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  container: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  activeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
