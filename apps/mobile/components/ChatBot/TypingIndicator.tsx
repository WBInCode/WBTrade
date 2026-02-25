import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

const DOT_SIZE = 8;
const BOUNCE_HEIGHT = -6;
const DURATION = 300;
const DELAYS = [0, 150, 300];

export default function TypingIndicator() {
  const colors = useThemeColors();
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(DELAYS[i]),
          Animated.timing(dot, {
            toValue: 1,
            duration: DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: DURATION,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    animations.forEach((a) => a.start());

    return () => {
      animations.forEach((a) => a.stop());
    };
  }, []);

  return (
    <View style={styles.container}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: colors.textMuted },
            {
              transform: [
                {
                  translateY: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, BOUNCE_HEIGHT],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    paddingVertical: 4,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginHorizontal: 3,
  },
});
