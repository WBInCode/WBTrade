import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────
export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  icon?: 'warning' | 'error' | 'success' | 'info' | 'trash' | 'heart' | 'cart';
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
}

// ─── Context ─────────────────────────────────────────────
const AlertContext = createContext<AlertContextType>({
  showAlert: () => {},
});

export const useAlert = () => useContext(AlertContext);

// ─── Imperative API (same signature as Alert.alert) ──────
let _globalShowAlert: ((options: AlertOptions) => void) | null = null;

export function customAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (_globalShowAlert) {
    _globalShowAlert({ title, message, buttons });
  }
}


// ─── Icon mapping ────────────────────────────────────────
function AlertIcon({ type, colors }: { type: AlertOptions['icon']; colors: ThemeColors }) {
  const iconConfig: Record<string, { name: string; color: string; bgColor: string }> = {
    warning: { name: 'exclamation-triangle', color: colors.warning, bgColor: colors.warningBg },
    error: { name: 'times-circle', color: colors.destructive, bgColor: colors.destructiveBg },
    success: { name: 'check-circle', color: colors.success, bgColor: colors.successBg },
    info: { name: 'info-circle', color: colors.tint, bgColor: colors.tintLight },
    trash: { name: 'trash', color: colors.destructive, bgColor: colors.destructiveBg },
    heart: { name: 'heart', color: colors.destructive, bgColor: colors.destructiveBg },
    cart: { name: 'shopping-cart', color: colors.tint, bgColor: colors.tintLight },
  };

  if (!type) return null;

  const config = iconConfig[type] || iconConfig.info;

  return (
    <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
      <FontAwesome name={config.name as any} size={28} color={config.color} />
    </View>
  );
}

// ─── Helper: derive icon from title/buttons ──────────────
function deriveIcon(options: AlertOptions): AlertOptions['icon'] {
  if (options.icon) return options.icon;

  const hasDestructive = options.buttons?.some((b) => b.style === 'destructive');
  const titleLower = (options.title || '').toLowerCase();

  if (titleLower.includes('usuń') || titleLower.includes('usun')) return 'trash';
  if (titleLower.includes('błąd') || titleLower.includes('blad') || titleLower.includes('error')) return 'error';
  if (titleLower.includes('sukces') || titleLower.includes('udało') || titleLower.includes('gotowe') || titleLower.includes('wysłano'))
    return 'success';
  if (titleLower.includes('brak') || titleLower.includes('uwaga')) return 'warning';
  if (hasDestructive) return 'warning';

  return 'info';
}

// ─── Provider ────────────────────────────────────────────
export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const colors = useThemeColors();
  const dynamicStyles = useMemo(() => createDynamicStyles(colors), [colors]);

  const show = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const hide = useCallback(
    (callback?: () => void) => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        setAlertOptions(null);
        callback?.();
      });
    },
    [fadeAnim, scaleAnim]
  );

  const showAlert = useCallback(
    (options: AlertOptions) => {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
      setAlertOptions(options);
      setVisible(true);
    },
    [fadeAnim, scaleAnim]
  );

  // Register global imperative handler
  useEffect(() => {
    _globalShowAlert = showAlert;
    return () => { _globalShowAlert = null; };
  }, [showAlert]);

  useEffect(() => {
    if (visible) show();
  }, [visible, show]);

  const handlePress = useCallback(
    (button: AlertButton) => {
      hide(button.onPress);
    },
    [hide]
  );

  const handleBackdropPress = useCallback(() => {
    const cancelBtn = alertOptions?.buttons?.find((b) => b.style === 'cancel');
    hide(cancelBtn?.onPress);
  }, [alertOptions, hide]);

  const icon = alertOptions ? deriveIcon(alertOptions) : undefined;
  const buttons = alertOptions?.buttons || [{ text: 'OK', style: 'default' as const }];

  // Sort buttons: cancel first, then default, then destructive
  const sortedButtons = [...buttons].sort((a, b) => {
    const order = { cancel: 0, default: 1, destructive: 2 };
    return (order[a.style || 'default'] || 1) - (order[b.style || 'default'] || 1);
  });

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleBackdropPress}>
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  dynamicStyles.dialog,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                {/* Icon */}
                {icon && <AlertIcon type={icon} colors={colors} />}

                {/* Title */}
                {alertOptions?.title && <Text style={dynamicStyles.title}>{alertOptions.title}</Text>}

                {/* Message */}
                {alertOptions?.message && <Text style={dynamicStyles.message}>{alertOptions.message}</Text>}

                {/* Buttons */}
                <View style={[styles.buttonRow, sortedButtons.length === 1 && styles.buttonRowSingle]}>
                  {sortedButtons.map((button, index) => {
                    const isCancel = button.style === 'cancel';
                    const isDestructive = button.style === 'destructive';

                    let buttonStyle: any[];
                    let textStyle: any[];

                    if (isCancel) {
                      buttonStyle = [dynamicStyles.button, dynamicStyles.cancelButton];
                      textStyle = [dynamicStyles.buttonText, dynamicStyles.cancelButtonText];
                    } else if (isDestructive) {
                      buttonStyle = [dynamicStyles.button, dynamicStyles.destructiveButton];
                      textStyle = [dynamicStyles.buttonText, dynamicStyles.destructiveButtonText];
                    } else {
                      buttonStyle = [dynamicStyles.button, dynamicStyles.primaryButton];
                      textStyle = [dynamicStyles.buttonText, dynamicStyles.primaryButtonText];
                    }

                    // If single button, make it full width
                    if (sortedButtons.length === 1) {
                      buttonStyle.push(styles.fullWidthButton);
                    }

                    return (
                      <TouchableOpacity
                        key={index}
                        style={buttonStyle}
                        onPress={() => handlePress(button)}
                        activeOpacity={0.7}
                      >
                        <Text style={textStyle}>{button.text}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </AlertContext.Provider>
  );
}

// ─── Static styles ───────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  buttonRowSingle: {
    justifyContent: 'center',
  },
  fullWidthButton: {
    flex: 1,
  },
});

// ─── Dynamic styles ──────────────────────────────────────
const createDynamicStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    dialog: {
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingTop: 28,
      paddingBottom: 24,
      paddingHorizontal: 24,
      width: Math.min(SCREEN_WIDTH - 64, 340),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 0,
    },
    button: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '600',
    },
    cancelButton: {
      backgroundColor: colors.backgroundTertiary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      color: colors.textSecondary,
    },
    primaryButton: {
      backgroundColor: colors.tint,
    },
    primaryButtonText: {
      color: colors.textInverse,
    },
    destructiveButton: {
      backgroundColor: colors.destructive,
    },
    destructiveButtonText: {
      color: colors.textInverse,
    },
  });
