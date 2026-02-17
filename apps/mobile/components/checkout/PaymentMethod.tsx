import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import Button from '../ui/Button';

interface PaymentOption {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  extraFee: number;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'payu',
    name: 'PayU',
    description: 'BLIK, karta płatnicza, szybki przelew, Google Pay, Apple Pay',
    icon: 'shield-checkmark-outline',
    extraFee: 0,
  },
];

interface PaymentMethodProps {
  onSubmit: (data: { method: string; methodName: string; extraFee: number }) => void;
  onBack: () => void;
}

export default function PaymentMethod({ onSubmit, onBack }: PaymentMethodProps) {
  const [selected, setSelected] = useState<string>('payu');

  const handleSubmit = () => {
    const option = PAYMENT_OPTIONS.find(o => o.id === selected);
    if (option) {
      onSubmit({
        method: option.id,
        methodName: option.name,
        extraFee: option.extraFee,
      });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Krok 3: Metoda płatności</Text>
        <Text style={styles.stepDesc}>Wybierz sposób płatności za zamówienie</Text>
      </View>

      <View style={styles.optionsSection}>
        {PAYMENT_OPTIONS.map(option => {
          const isSelected = selected === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => setSelected(option.id)}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionHeader}>
                  <View style={styles.payuBadge}>
                    <Text style={styles.payuBadgeText}>PayU</Text>
                  </View>
                  <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>
                    {option.name}
                  </Text>
                </View>
                <Text style={styles.optionDesc}>{option.description}</Text>
                {option.extraFee > 0 && (
                  <Text style={styles.optionFee}>
                    Dodatkowa opłata: {option.extraFee.toFixed(2)} zł
                  </Text>
                )}
                {isSelected && (
                  <View style={styles.paymentIcons}>
                    <View style={[styles.methodBadge, { backgroundColor: '#E51151' }]}>
                      <Text style={styles.methodBadgeText}>BLIK</Text>
                    </View>
                    <View style={[styles.methodBadge, { backgroundColor: '#1A1F71' }]}>
                      <Text style={styles.methodBadgeText}>VISA</Text>
                    </View>
                    <View style={[styles.methodBadge, { backgroundColor: '#EB001B' }]}>
                      <Text style={styles.methodBadgeText}>MC</Text>
                    </View>
                    <View style={[styles.methodBadge, { backgroundColor: '#4285F4' }]}>
                      <Text style={styles.methodBadgeText}>GPay</Text>
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="shield-checkmark-outline" size={18} color={Colors.success} />
        <Text style={styles.infoText}>
          Płatność jest bezpieczna i szyfrowana. Po kliknięciu "Dalej" przejdziesz do podsumowania
          zamówienia.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Wstecz</Text>
        </TouchableOpacity>
        <View style={styles.nextButton}>
          <Button
            title="Dalej — podsumowanie"
            onPress={handleSubmit}
            disabled={!selected}
            size="lg"
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  stepHeader: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary[900],
  },
  stepDesc: {
    fontSize: 13,
    color: Colors.secondary[500],
    marginTop: 4,
  },
  optionsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  optionCardSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  optionLeft: { marginRight: 12, marginTop: 2 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.secondary[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: Colors.primary[500] },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary[500],
  },
  optionContent: { flex: 1 },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary[800],
  },
  optionNameSelected: {
    color: Colors.primary[700],
  },
  optionDesc: {
    fontSize: 13,
    color: Colors.secondary[500],
    lineHeight: 18,
  },
  optionFee: {
    fontSize: 12,
    color: Colors.warning,
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
  },
  payuBadge: {
    backgroundColor: '#A6C307',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  payuBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  paymentIcons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  methodBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 12,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  backText: {
    fontSize: 15,
    color: Colors.secondary[600],
    fontWeight: '500',
  },
  nextButton: { flex: 1 },
});
