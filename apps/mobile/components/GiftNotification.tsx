import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Modal,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface GiftNotificationProps {
  visible: boolean;
  discountPercent: number;
  couponCode: string;
  onClaim: () => void;
}

// Confetti particle
function ConfettiPiece({ delay, startX }: { delay: number; startX: number }) {
  const fall = useRef(new Animated.Value(-20)).current;
  const swing = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const color = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ef4444', '#8b5cf6'][
    Math.floor(Math.random() * 6)
  ];
  const size = 6 + Math.random() * 6;

  useEffect(() => {
    const duration = 2000 + Math.random() * 1500;
    Animated.parallel([
      Animated.timing(fall, {
        toValue: SCREEN_H + 40,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(swing, {
            toValue: 1,
            duration: 300 + Math.random() * 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(swing, {
            toValue: -1,
            duration: 300 + Math.random() * 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        delay: delay + duration * 0.6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const translateX = swing.interpolate({
    inputRange: [-1, 1],
    outputRange: [-20, 20],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY: fall }, { translateX }],
      }}
    />
  );
}

export default function GiftNotification({
  visible,
  discountPercent,
  couponCode,
  onClaim,
}: GiftNotificationProps) {
  const [phase, setPhase] = useState<'gift' | 'revealed'>('gift');
  const [showConfetti, setShowConfetti] = useState(false);

  // Animations
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const giftScale = useRef(new Animated.Value(0)).current;
  const giftRotate = useRef(new Animated.Value(0)).current;
  const giftBounce = useRef(new Animated.Value(0)).current;
  const revealScale = useRef(new Animated.Value(0)).current;
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const pulseGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setPhase('gift');
      setShowConfetti(false);
      backdropOpacity.setValue(0);
      giftScale.setValue(0);
      giftRotate.setValue(0);
      giftBounce.setValue(0);
      revealScale.setValue(0);
      revealOpacity.setValue(0);
      shimmer.setValue(0);
      return;
    }

    // Enter: fade backdrop + bounce gift in
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(giftScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    // Wiggle loop
    startWiggle();
    // Glow pulse
    startGlow();
  }, [visible]);

  const startWiggle = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(giftRotate, {
          toValue: 1,
          duration: 120,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(giftRotate, {
          toValue: -1,
          duration: 240,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(giftRotate, {
          toValue: 0,
          duration: 120,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(800),
      ]),
    ).start();
  };

  const startGlow = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseGlow, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseGlow, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const handleOpen = () => {
    // Explode gift
    Animated.sequence([
      // Quick scale up
      Animated.timing(giftScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      // Scale down to 0
      Animated.timing(giftScale, {
        toValue: 0,
        duration: 200,
        easing: Easing.back(2),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPhase('revealed');
      setShowConfetti(true);

      // Reveal card
      Animated.parallel([
        Animated.spring(revealScale, {
          toValue: 1,
          friction: 5,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(revealOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Shimmer
      Animated.loop(
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    });
  };

  const handleClaim = () => {
    // Exit animation
    Animated.parallel([
      Animated.timing(revealScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(revealOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClaim();
    });
  };

  const giftRotation = giftRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const glowOpacity = pulseGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  if (!visible) return null;

  // Generate confetti pieces
  const confettiPieces = showConfetti
    ? Array.from({ length: 40 }, (_, i) => (
        <ConfettiPiece
          key={i}
          delay={i * 50}
          startX={Math.random() * SCREEN_W}
        />
      ))
    : null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        {/* Confetti layer */}
        {confettiPieces}

        {/* Phase 1: Gift box */}
        {phase === 'gift' && (
          <Animated.View
            style={[
              styles.giftContainer,
              {
                transform: [
                  { scale: giftScale },
                  { rotate: giftRotation },
                ],
              },
            ]}
          >
            {/* Glow ring */}
            <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />

            <TouchableOpacity
              onPress={handleOpen}
              activeOpacity={0.9}
              style={styles.giftTouchable}
            >
              {/* Gift box */}
              <View style={styles.giftBox}>
                {/* Ribbon vertical */}
                <View style={styles.ribbonV} />
                {/* Ribbon horizontal */}
                <View style={styles.ribbonH} />
                {/* Icon */}
                <FontAwesome name="gift" size={64} color={Colors.white} />
              </View>

              {/* CTA text */}
              <Text style={styles.tapText}>Dotknij, aby otworzyć!</Text>
              <Text style={styles.tapSubtext}>Mamy dla Ciebie niespodziankę 🎁</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Phase 2: Revealed discount */}
        {phase === 'revealed' && (
          <Animated.View
            style={[
              styles.revealCard,
              {
                transform: [{ scale: revealScale }],
                opacity: revealOpacity,
              },
            ]}
          >
            {/* Top badge */}
            <View style={styles.discountBadge}>
              <Text style={styles.discountValue}>-{discountPercent}%</Text>
            </View>

            <Text style={styles.revealTitle}>Gratulacje! 🎉</Text>
            <Text style={styles.revealSubtitle}>
              Otrzymujesz zniżkę powitalną na pierwsze zakupy!
            </Text>

            {/* Code display */}
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>Twój kod rabatowy:</Text>
              <Text style={styles.codeText}>{couponCode}</Text>
            </View>

            <Text style={styles.infoText}>
              Kod znajdziesz w zakładce {'\n'}
              <Text style={{ fontWeight: '700' }}>Konto → Moje rabaty</Text>
            </Text>

            <TouchableOpacity
              style={styles.claimButton}
              onPress={handleClaim}
              activeOpacity={0.8}
            >
              <FontAwesome name="check" size={18} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.claimButtonText}>Odbieram!</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Gift phase ──
  giftContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary[400],
  },
  giftTouchable: {
    alignItems: 'center',
  },
  giftBox: {
    width: 140,
    height: 140,
    borderRadius: 24,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
  },
  ribbonV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 18,
    marginLeft: -9,
    backgroundColor: Colors.primary[300],
    opacity: 0.5,
  },
  ribbonH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 18,
    marginTop: -9,
    backgroundColor: Colors.primary[300],
    opacity: 0.5,
  },
  tapText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 24,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tapSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 6,
  },

  // ── Revealed phase ──
  revealCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 50,
    paddingBottom: 28,
    marginHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  discountBadge: {
    position: 'absolute',
    top: -28,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  discountValue: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '900',
  },
  revealTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.secondary[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  revealSubtitle: {
    fontSize: 15,
    color: Colors.secondary[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  codeBox: {
    backgroundColor: Colors.secondary[50],
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.secondary[200],
    borderStyle: 'dashed',
    width: '100%',
  },
  codeLabel: {
    fontSize: 12,
    color: Colors.secondary[400],
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary[600],
    letterSpacing: 2,
  },
  infoText: {
    fontSize: 13,
    color: Colors.secondary[400],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  claimButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  claimButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
