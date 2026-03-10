import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
  Image,
  useColorScheme,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Simple global flag — home screen sets it when data is loaded
let _dataReady = false;

export function signalDataReady() {
  _dataReady = true;
}

function waitForData(maxMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (_dataReady) return resolve();
    const start = Date.now();
    const check = setInterval(() => {
      if (_dataReady || Date.now() - start > maxMs) {
        clearInterval(check);
        resolve();
      }
    }, 100);
  });
}

interface AnimatedSplashProps {
  onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const barOpacity = useRef(new Animated.Value(0)).current;
  const dotScale1 = useRef(new Animated.Value(0)).current;
  const dotScale2 = useRef(new Animated.Value(0)).current;
  const dotScale3 = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  const bgColor = isDark ? '#1C1C1E' : '#ffffff';
  const textColor = isDark ? '#F5F5F5' : '#171717';
  const subtitleColor = isDark ? '#B0B0B0' : '#737373';
  const dotColor = '#f97316';
  const barBgColor = isDark ? '#3A3A3C' : '#f5f5f5';
  const barFillColor = '#f97316';

  useEffect(() => {
    const runAnimation = async () => {
      // Phase 1-2: Logo + text intro
      await new Promise<void>((resolve) => {
        Animated.sequence([
          Animated.parallel([
            Animated.spring(logoScale, {
              toValue: 1,
              tension: 60,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.timing(logoOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.spring(textTranslateY, {
              toValue: 0,
              tension: 80,
              friction: 10,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(barOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start(() => resolve());
      });

      // Phase 3: Dots bounce infinitely + progress bar fills while waiting for data
      const dotLoop1 = Animated.loop(
        Animated.sequence([
          Animated.timing(dotScale1, { toValue: 1.4, duration: 350, useNativeDriver: true }),
          Animated.timing(dotScale1, { toValue: 0.8, duration: 350, useNativeDriver: true }),
        ])
      );
      const dotLoop2 = Animated.loop(
        Animated.sequence([
          Animated.timing(dotScale2, { toValue: 1.4, duration: 350, useNativeDriver: true }),
          Animated.timing(dotScale2, { toValue: 0.8, duration: 350, useNativeDriver: true }),
        ])
      );
      const dotLoop3 = Animated.loop(
        Animated.sequence([
          Animated.timing(dotScale3, { toValue: 1.4, duration: 350, useNativeDriver: true }),
          Animated.timing(dotScale3, { toValue: 0.8, duration: 350, useNativeDriver: true }),
        ])
      );

      // Start dots with stagger effect
      dotScale1.setValue(0.8);
      dotLoop1.start();
      setTimeout(() => { dotScale2.setValue(0.8); dotLoop2.start(); }, 120);
      setTimeout(() => { dotScale3.setValue(0.8); dotLoop3.start(); }, 240);

      // Progress bar fills slowly
      Animated.timing(barWidth, {
        toValue: 0.85,
        duration: 3000,
        useNativeDriver: false,
      }).start();

      // Wait for data
      await waitForData(8000);

      // Stop dot loops
      dotLoop1.stop();
      dotLoop2.stop();
      dotLoop3.stop();

      // Finish progress bar + fade out
      Animated.parallel([
        Animated.timing(barWidth, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(dotScale1, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(dotScale2, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(dotScale3, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start(() => {
        Animated.timing(fadeOut, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onFinish();
        });
      });
    };

    runAnimation();
  }, []);

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor, opacity: fadeOut }]}>
      {/* Decorative circles */}
      <View style={[styles.circle, styles.circleTopRight, { borderColor: isDark ? '#fb923c20' : '#f9731615' }]} />
      <View style={[styles.circle, styles.circleBottomLeft, { borderColor: isDark ? '#fb923c15' : '#f9731610' }]} />

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          <Image
            source={require('../assets/images/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App Name */}
        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          }}
        >
          <Animated.Text style={[styles.title, { color: textColor }]}>
            WB<Animated.Text style={styles.titleAccent}>Trade</Animated.Text>
          </Animated.Text>
          <Animated.Text style={[styles.subtitle, { color: subtitleColor }]}>
            Sklep spełniający twoje potrzeby
          </Animated.Text>
        </Animated.View>

        {/* Loading indicator */}
        <Animated.View style={[styles.loadingSection, { opacity: barOpacity }]}>
          {/* Progress bar */}
          <View style={[styles.progressBarBg, { backgroundColor: barBgColor }]}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: barFillColor,
                  width: barWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Animated dots */}
          <View style={styles.dotsContainer}>
            {[dotScale1, dotScale2, dotScale3].map((scale, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: dotColor,
                    transform: [{ scale }],
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 999,
  },
  circleTopRight: {
    width: 300,
    height: 300,
    top: -80,
    right: -80,
  },
  circleBottomLeft: {
    width: 400,
    height: 400,
    bottom: -120,
    left: -120,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  titleAccent: {
    color: '#f97316',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  loadingSection: {
    marginTop: 48,
    alignItems: 'center',
  },
  progressBarBg: {
    width: 200,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
