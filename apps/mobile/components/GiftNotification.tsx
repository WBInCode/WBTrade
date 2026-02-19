import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CONFETTI_COUNT = 50;
const CONFETTI_COLORS = [
  '#f97316', '#fb923c', '#fdba74', // oranges (brand)
  '#22c55e', '#4ade80',            // greens
  '#3b82f6', '#60a5fa',            // blues
  '#eab308', '#fbbf24',            // golds
  '#ef4444',                        // red
  '#8b5cf6',                        // purple
  '#ec4899',                        // pink
];

interface GiftNotificationProps {
  visible: boolean;
  discountPercent: number;
  couponCode: string;
  onClaim: () => void;
}

// ─── Confetti shapes: circles, squares, ribbons ───
function ConfettiPiece({ delay, startX, index }: { delay: number; startX: number; index: number }) {
  const fall = useRef(new Animated.Value(-60)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const swingX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const shapeType = index % 3; // 0=circle, 1=square, 2=ribbon
  const size = 5 + Math.random() * 7;
  const ribbonHeight = shapeType === 2 ? size * 2.5 : size;
  const spinDir = index % 2 === 0 ? 1 : -1;

  useEffect(() => {
    const duration = 2200 + Math.random() * 1800;
    const swingAmount = 30 + Math.random() * 40;

    Animated.parallel([
      // Appear
      Animated.timing(opacity, {
        toValue: 1,
        duration: 100,
        delay,
        useNativeDriver: true,
      }),
      // Fall
      Animated.timing(fall, {
        toValue: SCREEN_H + 60,
        duration,
        delay,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      // Swing
      Animated.loop(
        Animated.sequence([
          Animated.timing(swingX, {
            toValue: swingAmount,
            duration: 400 + Math.random() * 300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(swingX, {
            toValue: -swingAmount,
            duration: 400 + Math.random() * 300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
      // Spin
      Animated.loop(
        Animated.timing(spin, {
          toValue: spinDir,
          duration: 600 + Math.random() * 600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
      // Fade out near bottom
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        delay: delay + duration * 0.75,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: 0,
        width: size,
        height: ribbonHeight,
        borderRadius: shapeType === 0 ? size / 2 : shapeType === 2 ? 2 : 2,
        backgroundColor: color,
        opacity,
        transform: [
          { translateY: fall },
          { translateX: swingX },
          { rotate },
        ],
      }}
    />
  );
}

// ─── Sparkle star ───
function Sparkle({ x, y, delay: d, size: s }: { x: number; y: number; delay: number; size: number }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(d),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        Animated.delay(600 + Math.random() * 1000),
      ]),
    ).start();
  }, []);

  const rotateStr = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity,
        transform: [{ scale }, { rotate: rotateStr }],
      }}
    >
      <FontAwesome name="star" size={s} color="#fbbf24" />
    </Animated.View>
  );
}

// ─── Floating particle ring around gift ───
function FloatingDot({ angle, radius, delay: d }: { angle: number; radius: number; delay: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(d),
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const x = Math.cos((angle * Math.PI) / 180) * radius;
  const y = Math.sin((angle * Math.PI) / 180) * radius;
  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.9] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary[300],
        left: x - 3,
        top: y - 3,
        opacity: dotOpacity,
        transform: [{ scale: dotScale }],
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

  // ── Animation values ──
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Gift phase
  const giftScale = useRef(new Animated.Value(0)).current;
  const giftRotate = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0.2)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const tapPulse = useRef(new Animated.Value(1)).current;
  const lidBounce = useRef(new Animated.Value(0)).current;

  // Reveal phase
  const revealScale = useRef(new Animated.Value(0)).current;
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const codeSlide = useRef(new Animated.Value(30)).current;
  const codeOpacity = useRef(new Animated.Value(0)).current;
  const btnSlide = useRef(new Animated.Value(40)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const badgeGlow = useRef(new Animated.Value(0)).current;

  // Refs for cleanup
  const wiggleRef = useRef<Animated.CompositeAnimation | null>(null);
  const glowRef = useRef<Animated.CompositeAnimation | null>(null);
  const floatRef = useRef<Animated.CompositeAnimation | null>(null);
  const tapRef = useRef<Animated.CompositeAnimation | null>(null);
  const lidRef = useRef<Animated.CompositeAnimation | null>(null);

  const resetAll = useCallback(() => {
    wiggleRef.current?.stop();
    glowRef.current?.stop();
    floatRef.current?.stop();
    tapRef.current?.stop();
    lidRef.current?.stop();

    setPhase('gift');
    setShowConfetti(false);
    backdropOpacity.setValue(0);
    giftScale.setValue(0);
    giftRotate.setValue(0);
    glowScale.setValue(0.8);
    glowOpacity.setValue(0.2);
    floatY.setValue(0);
    tapPulse.setValue(1);
    lidBounce.setValue(0);
    revealScale.setValue(0);
    revealOpacity.setValue(0);
    badgeScale.setValue(0);
    codeSlide.setValue(30);
    codeOpacity.setValue(0);
    btnSlide.setValue(40);
    btnOpacity.setValue(0);
    titleOpacity.setValue(0);
    subtitleOpacity.setValue(0);
    infoOpacity.setValue(0);
    badgeGlow.setValue(0);
  }, []);

  useEffect(() => {
    if (!visible) {
      resetAll();
      return;
    }

    // ── Enter: backdrop fade + gift bounce in ──
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(giftScale, {
        toValue: 1,
        friction: 5,
        tension: 45,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // ── Wiggle (excitement) ──
    wiggleRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(giftRotate, { toValue: 1, duration: 80, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(giftRotate, { toValue: -1, duration: 160, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(giftRotate, { toValue: 0.6, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(giftRotate, { toValue: -0.6, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(giftRotate, { toValue: 0, duration: 80, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(1200),
      ]),
    );
    wiggleRef.current.start();

    // ── Glow pulse ──
    glowRef.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, { toValue: 1.4, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.6, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, { toValue: 0.9, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.15, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ]),
    );
    glowRef.current.start();

    // ── Float up/down ──
    floatRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -10, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 10, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    floatRef.current.start();

    // ── Tap text pulse ──
    tapRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(tapPulse, { toValue: 1.08, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(tapPulse, { toValue: 0.95, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    tapRef.current.start();

    // ── Lid bounce (little jump on top) ──
    lidRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(lidBounce, { toValue: -6, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(lidBounce, { toValue: 0, duration: 300, easing: Easing.bounce, useNativeDriver: true }),
        Animated.delay(1800),
      ]),
    );
    lidRef.current.start();
  }, [visible]);

  // ── Handle open gift ──
  const handleOpen = () => {
    // Stop loops
    wiggleRef.current?.stop();
    glowRef.current?.stop();
    floatRef.current?.stop();
    tapRef.current?.stop();
    lidRef.current?.stop();

    // Explode sequence
    Animated.sequence([
      // Quick shake
      Animated.sequence([
        Animated.timing(giftRotate, { toValue: 2, duration: 40, useNativeDriver: true }),
        Animated.timing(giftRotate, { toValue: -2, duration: 40, useNativeDriver: true }),
        Animated.timing(giftRotate, { toValue: 1.5, duration: 30, useNativeDriver: true }),
        Animated.timing(giftRotate, { toValue: -1.5, duration: 30, useNativeDriver: true }),
      ]),
      // Swell
      Animated.spring(giftScale, { toValue: 1.4, friction: 3, tension: 200, useNativeDriver: true }),
      // Pop out
      Animated.parallel([
        Animated.timing(giftScale, { toValue: 0, duration: 250, easing: Easing.in(Easing.back(3)), useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 2.5, duration: 300, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setPhase('revealed');
      setShowConfetti(true);

      // ── Staggered reveal ──
      Animated.parallel([
        Animated.spring(revealScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(revealOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();

      // Badge with overshoot
      Animated.sequence([
        Animated.delay(150),
        Animated.spring(badgeScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
      ]).start();

      // Badge glow loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(badgeGlow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(badgeGlow, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ).start();

      // Title
      Animated.sequence([
        Animated.delay(250),
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();

      // Subtitle
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();

      // Code box slide in
      Animated.sequence([
        Animated.delay(500),
        Animated.parallel([
          Animated.spring(codeSlide, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
          Animated.timing(codeOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]),
      ]).start();

      // Info text
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(infoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();

      // Button slide in
      Animated.sequence([
        Animated.delay(800),
        Animated.parallel([
          Animated.spring(btnSlide, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
          Animated.timing(btnOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        ]),
      ]).start();
    });
  };

  // ── Claim & exit ──
  const handleClaim = () => {
    Animated.parallel([
      Animated.timing(revealScale, { toValue: 0.85, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(revealOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => {
      onClaim();
    });
  };

  // ── Interpolations ──
  const giftRotation = giftRotate.interpolate({
    inputRange: [-2, -1, 0, 1, 2],
    outputRange: ['-16deg', '-8deg', '0deg', '8deg', '16deg'],
  });

  const badgeGlowOpacity = badgeGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  if (!visible) return null;

  // ── Confetti pieces ──
  const confettiPieces = showConfetti
    ? Array.from({ length: CONFETTI_COUNT }, (_, i) => (
        <ConfettiPiece
          key={`c-${i}`}
          index={i}
          delay={i * 40}
          startX={Math.random() * SCREEN_W}
        />
      ))
    : null;

  // ── Sparkles around gift ──
  const sparkles = phase === 'gift' ? [
    { x: -70, y: -80, delay: 0, size: 14 },
    { x: 65, y: -60, delay: 400, size: 10 },
    { x: -55, y: 50, delay: 800, size: 12 },
    { x: 70, y: 40, delay: 200, size: 11 },
    { x: -30, y: -90, delay: 600, size: 9 },
    { x: 45, y: 70, delay: 1000, size: 13 },
    { x: -80, y: -10, delay: 300, size: 10 },
    { x: 80, y: -20, delay: 700, size: 11 },
  ] : [];

  // ── Floating dots ring ──
  const floatingDots = phase === 'gift'
    ? Array.from({ length: 12 }, (_, i) => (
        <FloatingDot
          key={`dot-${i}`}
          angle={i * 30}
          radius={110}
          delay={i * 150}
        />
      ))
    : null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        {/* Confetti layer */}
        {confettiPieces}

        {/* ═══════ Phase 1: Gift box ═══════ */}
        {phase === 'gift' && (
          <Animated.View
            style={[
              styles.giftWrapper,
              {
                transform: [
                  { scale: giftScale },
                  { rotate: giftRotation },
                  { translateY: floatY },
                ],
              },
            ]}
          >
            {/* Outer glow */}
            <Animated.View
              style={[
                styles.glowRing,
                {
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                },
              ]}
            />

            {/* Second glow ring */}
            <Animated.View
              style={[
                styles.glowRingInner,
                {
                  opacity: glowOpacity,
                  transform: [{ scale: Animated.multiply(glowScale, 0.7) }],
                },
              ]}
            />

            {/* Floating dots */}
            <View style={styles.dotsContainer}>
              {floatingDots}
            </View>

            {/* Sparkles */}
            {sparkles.map((s, i) => (
              <Sparkle key={`s-${i}`} {...s} />
            ))}

            <TouchableOpacity
              onPress={handleOpen}
              activeOpacity={0.9}
              style={styles.giftTouchable}
            >
              {/* Gift box */}
              <View style={styles.giftBox}>
                {/* Lid (top section) */}
                <Animated.View style={[styles.giftLid, { transform: [{ translateY: lidBounce }] }]}>
                  <View style={styles.lidBow}>
                    <View style={styles.bowLoop1} />
                    <View style={styles.bowCenter} />
                    <View style={styles.bowLoop2} />
                  </View>
                  <View style={styles.lidBody}>
                    <View style={styles.lidRibbon} />
                  </View>
                </Animated.View>

                {/* Box body */}
                <View style={styles.boxBody}>
                  <View style={styles.boxRibbonV} />
                  <FontAwesome name="gift" size={44} color="rgba(255,255,255,0.25)" style={{ marginTop: 2 }} />
                </View>
              </View>

              {/* CTA */}
              <Animated.View style={{ transform: [{ scale: tapPulse }], marginTop: 20 }}>
                <Text style={styles.tapText}>Dotknij, aby otworzyć!</Text>
              </Animated.View>
              <Text style={styles.tapSubtext}>Mamy dla Ciebie niespodziankę 🎉</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ═══════ Phase 2: Revealed discount ═══════ */}
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
            {/* Decorative top arc */}
            <View style={styles.cardTopArc} />

            {/* Discount badge */}
            <Animated.View style={[styles.badgeOuter, { transform: [{ scale: badgeScale }] }]}>
              <Animated.View style={[styles.badgeGlow, { opacity: badgeGlowOpacity }]} />
              <View style={styles.discountBadge}>
                <Text style={styles.discountValue}>-{discountPercent}%</Text>
              </View>
            </Animated.View>

            {/* Title */}
            <Animated.View style={{ opacity: titleOpacity }}>
              <Text style={styles.revealTitle}>Gratulacje! 🎉</Text>
            </Animated.View>

            {/* Subtitle */}
            <Animated.View style={{ opacity: subtitleOpacity }}>
              <Text style={styles.revealSubtitle}>
                Oto Twoja zniżka powitalna{'\n'}na pierwsze zakupy w WBTrade!
              </Text>
            </Animated.View>

            {/* Dashed separator */}
            <View style={styles.dashedLine} />

            {/* Code display */}
            <Animated.View
              style={[
                styles.codeBox,
                {
                  transform: [{ translateY: codeSlide }],
                  opacity: codeOpacity,
                },
              ]}
            >
              <Text style={styles.codeLabel}>TWÓJ KOD RABATOWY</Text>
              <View style={styles.codeValueRow}>
                <Text style={styles.codeText}>{couponCode}</Text>
              </View>
            </Animated.View>

            {/* Info */}
            <Animated.View style={{ opacity: infoOpacity }}>
              <View style={styles.infoRow}>
                <FontAwesome name="info-circle" size={14} color={Colors.secondary[400]} />
                <Text style={styles.infoText}>
                  Kod znajdziesz w{' '}
                  <Text style={styles.infoBold}>Konto → Moje rabaty</Text>
                </Text>
              </View>
            </Animated.View>

            {/* Claim button */}
            <Animated.View
              style={[
                styles.claimBtnWrap,
                {
                  transform: [{ translateY: btnSlide }],
                  opacity: btnOpacity,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.claimButton}
                onPress={handleClaim}
                activeOpacity={0.85}
              >
                <View style={styles.claimBtnInner}>
                  <FontAwesome name="check-circle" size={20} color={Colors.white} style={{ marginRight: 10 }} />
                  <Text style={styles.claimButtonText}>Super, odbieram!</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}

// ════════════════════════════════════════
// STYLES
// ════════════════════════════════════════

const CARD_WIDTH = Math.min(SCREEN_W - 48, 360);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Gift phase ──
  giftWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 260,
    height: 300,
  },
  glowRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.primary[500],
  },
  glowRingInner: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary[400],
  },
  dotsContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftTouchable: {
    alignItems: 'center',
  },
  giftBox: {
    width: 130,
    height: 130,
    alignItems: 'center',
  },

  // Lid
  giftLid: {
    alignItems: 'center',
    zIndex: 2,
  },
  lidBow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 22,
    marginBottom: -2,
  },
  bowLoop1: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: Colors.primary[200],
    backgroundColor: 'transparent',
    marginRight: -3,
  },
  bowCenter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary[200],
    zIndex: 1,
  },
  bowLoop2: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: Colors.primary[200],
    backgroundColor: 'transparent',
    marginLeft: -3,
  },
  lidBody: {
    width: 136,
    height: 22,
    backgroundColor: Colors.primary[600],
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  lidRibbon: {
    width: 18,
    height: '100%' as any,
    backgroundColor: Colors.primary[300],
    opacity: 0.6,
  },

  // Box body
  boxBody: {
    width: 130,
    height: 86,
    backgroundColor: Colors.primary[500],
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary[700],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
    overflow: 'hidden',
  },
  boxRibbonV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 18,
    backgroundColor: Colors.primary[300],
    opacity: 0.4,
  },

  tapText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 0.3,
  },
  tapSubtext: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },

  // ── Revealed phase ──
  revealCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 28,
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: { elevation: 24 },
    }),
  },
  cardTopArc: {
    position: 'absolute',
    top: -60,
    width: CARD_WIDTH + 40,
    height: 120,
    borderBottomLeftRadius: CARD_WIDTH,
    borderBottomRightRadius: CARD_WIDTH,
    backgroundColor: Colors.primary[50],
  },

  // Badge
  badgeOuter: {
    position: 'absolute',
    top: -32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary[400],
  },
  discountBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary[600],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  discountValue: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  revealTitle: {
    fontSize: 26,
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
    marginBottom: 16,
  },

  dashedLine: {
    width: '85%' as any,
    height: 1,
    borderWidth: 1,
    borderColor: Colors.secondary[200],
    borderStyle: 'dashed',
    marginBottom: 16,
  },

  codeBox: {
    width: '100%' as any,
    backgroundColor: Colors.primary[50],
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary[200],
    borderStyle: 'dashed',
  },
  codeLabel: {
    fontSize: 11,
    color: Colors.secondary[400],
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  codeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.primary[600],
    letterSpacing: 3,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 18,
  },
  infoText: {
    fontSize: 13,
    color: Colors.secondary[400],
    marginLeft: 8,
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '700',
    color: Colors.secondary[600],
  },

  claimBtnWrap: {
    width: '100%' as any,
  },
  claimButton: {
    width: '100%' as any,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.primary[500],
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary[600],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  claimBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  claimButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
