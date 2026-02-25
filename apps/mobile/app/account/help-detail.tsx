import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../constants/Colors';

// ─── Section component ───
function Section({ title, children, colors, styles }: { title?: string; children: React.ReactNode; colors: any; styles: any }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

function BulletItem({ text, colors, styles }: { text: string; colors: any; styles: any }) {
  return (
    <View style={styles.bulletRow}>
      <FontAwesome name="circle" size={5} color={colors.tint} style={{ marginTop: 7 }} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function NumberedItem({ num, text, colors, styles }: { num: number; text: string; colors: any; styles: any }) {
  return (
    <View style={styles.numberedRow}>
      <View style={styles.numBadge}>
        <Text style={styles.numText}>{num}</Text>
      </View>
      <Text style={styles.numberedText}>{text}</Text>
    </View>
  );
}

function InfoBox({ text, icon, colors, styles }: { text: string; icon?: string; colors: any; styles: any }) {
  return (
    <View style={styles.infoBox}>
      <FontAwesome name={(icon as any) || 'lightbulb-o'} size={16} color={colors.tint} style={{ marginTop: 2 }} />
      <Text style={styles.infoBoxText}>{text}</Text>
    </View>
  );
}

export default function HelpDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { title, answer } = useLocalSearchParams<{ title: string; answer: string }>();

  // Parse the answer - it's JSON encoded sections
  let sections: { heading?: string; lines: string[]; type?: string }[] = [];
  try {
    sections = JSON.parse(answer || '[]');
  } catch {
    sections = [{ lines: [answer || ''] }];
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: title || 'Pomoc', headerBackTitle: 'Wróć' }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <FontAwesome name="question-circle" size={24} color={colors.tint} />
          </View>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {sections.map((section, si) => (
            <View key={si} style={styles.section}>
              {section.heading ? (
                <Text style={styles.sectionTitle}>{section.heading}</Text>
              ) : null}
              {section.lines.map((line, li) => {
                // Numbered step
                if (/^\d+\.\s/.test(line)) {
                  const num = parseInt(line);
                  const text = line.replace(/^\d+\.\s*/, '');
                  return (
                    <View key={li} style={styles.numberedRow}>
                      <View style={styles.numBadge}>
                        <Text style={styles.numText}>{num}</Text>
                      </View>
                      <Text style={styles.numberedText}>{text}</Text>
                    </View>
                  );
                }
                // Bullet point
                if (line.startsWith('• ') || line.startsWith('- ')) {
                  const text = line.replace(/^[•\-]\s*/, '');
                  return (
                    <View key={li} style={styles.bulletRow}>
                      <FontAwesome name="circle" size={5} color={colors.tint} style={{ marginTop: 7 }} />
                      <Text style={styles.bulletText}>{text}</Text>
                    </View>
                  );
                }
                // Check mark
                if (line.startsWith('✅ ') || line.startsWith('✓ ')) {
                  const text = line.replace(/^[✅✓]\s*/, '');
                  return (
                    <View key={li} style={styles.checkRow}>
                      <FontAwesome name="check-circle" size={14} color="#22c55e" style={{ marginTop: 3 }} />
                      <Text style={styles.bulletText}>{text}</Text>
                    </View>
                  );
                }
                // Cross mark
                if (line.startsWith('❌ ')) {
                  const text = line.replace(/^❌\s*/, '');
                  return (
                    <View key={li} style={styles.checkRow}>
                      <FontAwesome name="times-circle" size={14} color="#ef4444" style={{ marginTop: 3 }} />
                      <Text style={styles.bulletText}>{text}</Text>
                    </View>
                  );
                }
                // Warning/info box
                if (line.startsWith('💡 ') || line.startsWith('WSKAZÓWKA:') || line.startsWith('⚠️ ') || line.startsWith('WAŻNE:')) {
                  const isWarning = line.startsWith('⚠️ ') || line.startsWith('WAŻNE:');
                  const text = line.replace(/^(💡|⚠️)\s*/, '').replace(/^(WSKAZÓWKA|WAŻNE):\s*/, '');
                  return (
                    <View key={li} style={[styles.infoBox, isWarning && styles.warningBox]}>
                      <FontAwesome
                        name={isWarning ? 'exclamation-triangle' : 'lightbulb-o'}
                        size={16}
                        color={isWarning ? '#f59e0b' : colors.tint}
                        style={{ marginTop: 2 }}
                      />
                      <Text style={styles.infoBoxText}>{text}</Text>
                    </View>
                  );
                }
                // Bold heading line (starts with emoji or uppercase)
                if (section.type === 'heading-line') {
                  return (
                    <Text key={li} style={styles.subHeading}>{line}</Text>
                  );
                }
                // Regular paragraph
                return (
                  <Text key={li} style={styles.paragraph}>{line}</Text>
                );
              })}
            </View>
          ))}
        </View>

        {/* Contact CTA */}
        <View style={styles.contactBox}>
          <FontAwesome name="envelope" size={18} color={colors.tint} />
          <Text style={styles.contactTitle}>Potrzebujesz dodatkowej pomocy?</Text>
          <Text style={styles.contactEmail}>support@wb-partners.pl</Text>
          <Text style={styles.contactPhone}>+48 570 028 761 (pon-pt 9-17)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundTertiary,
    },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    // ─── Header ───
    header: {
      backgroundColor: colors.card,
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.tintLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      lineHeight: 24,
    },

    // ─── Content ───
    content: {
      paddingHorizontal: 12,
      marginTop: 16,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    subHeading: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginTop: 8,
      marginBottom: 4,
    },
    paragraph: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 21,
      marginBottom: 8,
    },

    // ─── Bullets ───
    bulletRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 6,
      paddingLeft: 4,
    },
    bulletText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 21,
      flex: 1,
    },
    checkRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 6,
      paddingLeft: 4,
    },

    // ─── Numbered ───
    numberedRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 10,
    },
    numBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.tintLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.tint,
    },
    numberedText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 21,
      flex: 1,
      paddingTop: 2,
    },

    // ─── Info box ───
    infoBox: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: colors.tintLight,
      borderRadius: 10,
      padding: 12,
      marginTop: 8,
    },
    warningBox: {
      backgroundColor: '#fef3c7',
    },
    infoBoxText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
      flex: 1,
    },

    // ─── Contact ───
    contactBox: {
      backgroundColor: colors.card,
      borderRadius: 12,
      marginHorizontal: 12,
      marginTop: 16,
      padding: 20,
      alignItems: 'center',
    },
    contactTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginTop: 8,
      marginBottom: 8,
    },
    contactEmail: {
      fontSize: 13,
      color: colors.tint,
      fontWeight: '600',
    },
    contactPhone: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
    },
  });
