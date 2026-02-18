import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

const TOPICS = [
  'Zamówienie',
  'Dostawa',
  'Zwrot / Reklamacja',
  'Płatność',
  'Konto',
  'Inne',
] as const;

function ContactCard({
  icon,
  title,
  value,
  onPress,
}: {
  icon: string;
  title: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardIcon}>
        <FontAwesome name={icon as any} size={20} color={Colors.primary[600]} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
      </View>
      <FontAwesome name="chevron-right" size={12} color={Colors.secondary[300]} />
    </TouchableOpacity>
  );
}

export default function ContactScreen() {
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [showTopics, setShowTopics] = useState(false);

  const handleSend = () => {
    if (!topic || !email.trim() || !message.trim()) {
      Alert.alert('Uzupełnij pola', 'Wybierz temat, podaj e-mail i wpisz wiadomość.');
      return;
    }
    setSending(true);
    // Build mailto link with pre-filled subject and body
    const subject = encodeURIComponent(`[WBTrade] ${topic}`);
    const body = encodeURIComponent(`Temat: ${topic}\n\nWiadomość:\n${message}\n\nAdres e-mail nadawcy: ${email}`);
    Linking.openURL(`mailto:support@wb-partners.pl?subject=${subject}&body=${body}`).finally(() => {
      setSending(false);
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Kontakt', headerBackTitle: 'Wróć' }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <FontAwesome name="headphones" size={32} color={Colors.primary[600]} />
            </View>
            <Text style={styles.heroTitle}>Jak możemy Ci pomóc?</Text>
            <Text style={styles.heroSubtitle}>
              Jesteśmy dostępni od poniedziałku do piątku, 9:00–17:00
            </Text>
          </View>

          {/* Contact cards */}
          <View style={styles.cardsRow}>
            <ContactCard
              icon="envelope"
              title="E-mail"
              value="support@wb-partners.pl"
              onPress={() => Linking.openURL('mailto:support@wb-partners.pl')}
            />
            <ContactCard
              icon="phone"
              title="Telefon"
              value="+48 570 034 367"
              onPress={() => Linking.openURL('tel:+48570034367')}
            />
            <ContactCard
              icon="map-marker"
              title="Adres"
              value="ul. Słowackiego 24/11, Rzeszów"
              onPress={() =>
                Linking.openURL(
                  'https://maps.google.com/?q=ul.+Juliusza+Słowackiego+24/11,+35-060+Rzeszów'
                )
              }
            />
          </View>

          {/* Contact form */}
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Napisz do nas</Text>
            <Text style={styles.formSubtitle}>
              Odpowiadamy zwykle w ciągu 24 godzin w dni robocze
            </Text>

            {/* Topic picker */}
            <Text style={styles.label}>Temat</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowTopics(!showTopics)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickerText, !topic && styles.pickerPlaceholder]}>
                {topic || 'Wybierz temat...'}
              </Text>
              <FontAwesome
                name={showTopics ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={Colors.secondary[400]}
              />
            </TouchableOpacity>
            {showTopics && (
              <View style={styles.topicsList}>
                {TOPICS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.topicItem, topic === t && styles.topicItemActive]}
                    onPress={() => {
                      setTopic(t);
                      setShowTopics(false);
                    }}
                  >
                    <Text
                      style={[styles.topicItemText, topic === t && styles.topicItemTextActive]}
                    >
                      {t}
                    </Text>
                    {topic === t && (
                      <FontAwesome name="check" size={14} color={Colors.primary[600]} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Email */}
            <Text style={styles.label}>Twój e-mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="jan@example.com"
              placeholderTextColor={Colors.secondary[300]}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Message */}
            <Text style={styles.label}>Wiadomość</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Opisz, w czym możemy pomóc..."
              placeholderTextColor={Colors.secondary[300]}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={sending}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <FontAwesome name="paper-plane" size={16} color={Colors.white} />
                  <Text style={styles.sendBtnText}>Wyślij wiadomość</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Company info */}
          <View style={styles.companySection}>
            <Text style={styles.companySectionTitle}>Dane firmy</Text>
            <View style={styles.companyCard}>
              <InfoRow label="Firma" value="WB PARTNERS Sp. z o.o." />
              <InfoRow label="Adres" value="ul. Juliusza Słowackiego 24/11, 35-060 Rzeszów" />
              <InfoRow label="NIP" value="5170455185" />
              <InfoRow label="REGON" value="540735769" />
              <InfoRow label="KRS" value="0001151642" />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary[100],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ─── Hero ───
  hero: {
    backgroundColor: Colors.white,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary[200],
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.secondary[500],
    textAlign: 'center',
    lineHeight: 20,
  },

  // ─── Cards ───
  cardsRow: {
    paddingHorizontal: 12,
    paddingTop: 16,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[900],
  },

  // ─── Form ───
  formSection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 20,
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: Colors.secondary[500],
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary[700],
    marginBottom: 6,
    marginTop: 14,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.secondary[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.secondary[50],
  },
  pickerText: {
    fontSize: 15,
    color: Colors.secondary[900],
  },
  pickerPlaceholder: {
    color: Colors.secondary[300],
  },
  topicsList: {
    borderWidth: 1,
    borderColor: Colors.secondary[200],
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.secondary[100],
  },
  topicItemActive: {
    backgroundColor: Colors.primary[50],
  },
  topicItemText: {
    fontSize: 15,
    color: Colors.secondary[700],
  },
  topicItemTextActive: {
    color: Colors.primary[700],
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.secondary[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.secondary[900],
    backgroundColor: Colors.secondary[50],
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[600],
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
    marginTop: 20,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },

  // ─── Company ───
  companySection: {
    paddingHorizontal: 12,
    marginTop: 24,
  },
  companySectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.secondary[900],
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  companyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.secondary[100],
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.secondary[500],
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary[900],
    flex: 2,
    textAlign: 'right',
  },
});
