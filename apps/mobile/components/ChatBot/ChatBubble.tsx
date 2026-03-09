import React, { useEffect, useRef, useState, useCallback } from 'react';
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

const WUBUS_HEAD = require('../../assets/images/wubus-head.png');

interface ChatBubbleProps {
  onPress: () => void;
  hasActiveChat?: boolean;
  unreadCount?: number;
  isChatOpen?: boolean;
  isHidden?: boolean;
}

export function ChatBubble({ onPress, hasActiveChat, unreadCount = 0, isChatOpen = false, isHidden = false }: ChatBubbleProps) {
  const colors = useThemeColors();
  const pulse = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.2)).current;
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipShownOnce = useRef(false);

  // Existing scale pulse
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

  // Glow/shadow pulse (synced but offset from scale)
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.15, duration: 1500, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [glowOpacity]);

  // Dismiss tooltip helper
  const dismissTooltip = useCallback(() => {
    Animated.timing(tooltipOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowTooltip(false);
    });
    if (tooltipHideTimer.current) {
      clearTimeout(tooltipHideTimer.current);
      tooltipHideTimer.current = null;
    }
  }, [tooltipOpacity]);

  // Start 30s inactivity timer on mount (show tooltip once per session)
  useEffect(() => {
    if (tooltipShownOnce.current || isChatOpen) return;

    inactivityTimer.current = setTimeout(() => {
      if (!isChatOpen) {
        setShowTooltip(true);
        tooltipShownOnce.current = true;
      }
    }, 30000);

    return () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
    };
  }, [isChatOpen]);

  // When chat opens, immediately hide tooltip & cancel timers
  useEffect(() => {
    if (isChatOpen) {
      setShowTooltip(false);
      tooltipOpacity.setValue(0);
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
      if (tooltipHideTimer.current) {
        clearTimeout(tooltipHideTimer.current);
        tooltipHideTimer.current = null;
      }
    }
  }, [isChatOpen, tooltipOpacity]);

  // Animate tooltip in + auto-hide after 5s
  useEffect(() => {
    if (showTooltip) {
      Animated.timing(tooltipOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      tooltipHideTimer.current = setTimeout(() => {
        dismissTooltip();
      }, 5000);
    }
    return () => {
      if (tooltipHideTimer.current) {
        clearTimeout(tooltipHideTimer.current);
        tooltipHideTimer.current = null;
      }
    };
  }, [showTooltip, tooltipOpacity, dismissTooltip]);

  const handlePress = useCallback(() => {
    if (showTooltip) dismissTooltip();
    onPress();
  }, [showTooltip, dismissTooltip, onPress]);

  return (
    <View style={bubbleStyles.outerWrapper}>
      {/* Tooltip "Potrzebujesz pomocy?" */}
      {showTooltip && !isHidden && (
        <Animated.View
          style={[
            bubbleStyles.tooltip,
            {
              opacity: tooltipOpacity,
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <TouchableOpacity onPress={dismissTooltip} activeOpacity={0.7}>
            <Text style={[bubbleStyles.tooltipText, { color: colors.text }]}>
              Potrzebujesz pomocy? 💬
            </Text>
          </TouchableOpacity>
          {/* Arrow pointing right toward the bubble */}
          <View
            style={[
              bubbleStyles.tooltipArrow,
              { borderLeftColor: colors.card },
            ]}
          />
        </Animated.View>
      )}

      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[
          bubbleStyles.wrapper,
          isHidden && bubbleStyles.wrapperHidden,
        ]}
        hitSlop={isHidden ? { top: 30, bottom: 30, left: 80, right: 20 } : undefined}
      >
        {/* Scale animation wraps only the circle so touch bounds stay accurate on Android */}
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          {/* Pulsating glow layer behind bubble — decorative only */}
          <Animated.View
            pointerEvents="none"
            style={[
              bubbleStyles.glow,
              {
                backgroundColor: colors.tint,
                opacity: glowOpacity,
              },
            ]}
          />
          <View style={[bubbleStyles.container, { backgroundColor: colors.tint, shadowColor: colors.shadow }]}>
            <Image source={WUBUS_HEAD} style={bubbleStyles.mascotImage} />
          </View>
          {unreadCount > 0 ? (
            <View style={bubbleStyles.badge}>
              <Text style={bubbleStyles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : (
            <View style={bubbleStyles.activeDot} />
          )}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  outerWrapper: {
    alignItems: 'flex-end',
  },
  glow: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 68,
    height: 68,
    borderRadius: 34,
    alignSelf: 'center',
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrapperHidden: {
    // Larger touch area when hidden so the peeking part is easy to tap
    paddingLeft: 40,
    paddingVertical: 20,
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
    overflow: 'hidden',
  },
  mascotImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    resizeMode: 'contain',
  },
  tooltip: {
    position: 'absolute',
    right: 68,
    top: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 20,
    minWidth: 160,
  },
  tooltipText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    right: -8,
    top: 12,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  label: {
    marginRight: 8,
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
    top: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2.5,
    borderColor: '#fff',
    zIndex: 10,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
});
