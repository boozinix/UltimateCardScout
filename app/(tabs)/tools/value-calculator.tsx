import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { formatCurrency } from '@/utils/formatters';
import { capture, Events } from '@/lib/analytics';

type CardPreset = {
  id: string;
  name: string;
  annualFee: number;
  benefits: { label: string; value: number; default: boolean }[];
};

const PRESETS: CardPreset[] = [
  {
    id: 'csp',
    name: 'Chase Sapphire Preferred',
    annualFee: 95,
    benefits: [
      { label: '$50 hotel credit', value: 50, default: true },
      { label: 'DashPass ($120 value)', value: 120, default: false },
      { label: 'Travel insurance', value: 50, default: true },
      { label: '10% anniversary bonus', value: 60, default: true },
    ],
  },
  {
    id: 'csr',
    name: 'Chase Sapphire Reserve',
    annualFee: 550,
    benefits: [
      { label: '$300 travel credit', value: 300, default: true },
      { label: 'Priority Pass lounge access', value: 200, default: true },
      { label: 'Global Entry/TSA ($100)', value: 17, default: true },
      { label: 'DashPass + Lyft ($300)', value: 150, default: false },
      { label: 'Peloton/SoulCycle credit', value: 120, default: false },
    ],
  },
  {
    id: 'amex-platinum',
    name: 'Amex Platinum',
    annualFee: 695,
    benefits: [
      { label: '$200 hotel credit', value: 200, default: true },
      { label: '$200 airline fee credit', value: 200, default: true },
      { label: '$189 CLEAR credit', value: 189, default: false },
      { label: '$240 digital entertainment', value: 240, default: false },
      { label: '$300 Equinox credit', value: 300, default: false },
      { label: 'Centurion Lounge access', value: 200, default: true },
      { label: 'Global Entry ($100)', value: 17, default: true },
      { label: 'SoulCycle credit', value: 120, default: false },
    ],
  },
  {
    id: 'venture-x',
    name: 'Capital One Venture X',
    annualFee: 395,
    benefits: [
      { label: '$300 travel credit (portal)', value: 300, default: true },
      { label: '10k anniversary miles (~$100)', value: 100, default: true },
      { label: 'Capital One Lounge access', value: 100, default: true },
      { label: 'Priority Pass ($329 value)', value: 100, default: false },
      { label: 'Global Entry ($100)', value: 17, default: true },
    ],
  },
  {
    id: 'amex-gold',
    name: 'Amex Gold',
    annualFee: 250,
    benefits: [
      { label: '$120 dining credit', value: 120, default: true },
      { label: '$120 Uber Cash', value: 120, default: false },
      { label: '$100 hotel credit', value: 100, default: false },
      { label: '4x restaurants (value ~$200)', value: 100, default: true },
      { label: '4x US supermarkets', value: 80, default: true },
    ],
  },
];

export default function ValueCalculatorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedPreset, setSelectedPreset] = useState<CardPreset>(PRESETS[0]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    PRESETS[0].benefits.forEach((b) => { init[b.label] = b.default; });
    return init;
  });

  const handlePresetChange = (preset: CardPreset) => {
    setSelectedPreset(preset);
    capture(Events.CALCULATOR_USED, { calculator_name: 'value_calculator' });
    const init: Record<string, boolean> = {};
    preset.benefits.forEach((b) => { init[b.label] = b.default; });
    setEnabled(init);
  };

  const totalBenefitValue = useMemo(() => {
    return selectedPreset.benefits
      .filter((b) => enabled[b.label])
      .reduce((sum, b) => sum + b.value, 0);
  }, [selectedPreset, enabled]);

  const netCost = selectedPreset.annualFee - totalBenefitValue;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Value Calculator</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>SELECT CARD</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
          <View style={styles.presetRow}>
            {PRESETS.map((p) => (
              <Pressable
                key={p.id}
                style={[styles.presetChip, selectedPreset.id === p.id && styles.presetChipActive]}
                onPress={() => handlePresetChange(p)}
              >
                <Text style={[styles.presetChipText, selectedPreset.id === p.id && styles.presetChipTextActive]}>
                  {p.name.split(' ').slice(-2).join(' ')}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.cardName}>{selectedPreset.name}</Text>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Annual Fee</Text>
          <Text style={styles.feeValue}>{formatCurrency(selectedPreset.annualFee)}</Text>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>BENEFITS YOU USE</Text>
        <Text style={styles.sectionSub}>Toggle the benefits you actually use each year</Text>

        {selectedPreset.benefits.map((b) => (
          <View key={b.label} style={styles.benefitRow}>
            <View style={styles.benefitInfo}>
              <Text style={styles.benefitLabel}>{b.label}</Text>
              <Text style={styles.benefitValue}>{formatCurrency(b.value)} value</Text>
            </View>
            <Switch
              value={enabled[b.label] ?? false}
              onValueChange={(val) => setEnabled((prev) => ({ ...prev, [b.label]: val }))}
              trackColor={{ false: colors.border, true: colors.gold }}
              thumbColor={enabled[b.label] ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        ))}

        {/* Result */}
        <View style={styles.resultCard}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Annual Fee</Text>
            <Text style={[styles.resultValue, { color: colors.urgent }]}>
              −{formatCurrency(selectedPreset.annualFee)}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Benefits Used</Text>
            <Text style={[styles.resultValue, { color: colors.success }]}>
              +{formatCurrency(totalBenefitValue)}
            </Text>
          </View>
          <View style={[styles.resultRow, styles.resultRowNet]}>
            <Text style={styles.resultLabelNet}>Net Cost to You</Text>
            <Text style={[styles.resultValueNet, { color: netCost <= 0 ? colors.success : colors.text }]}>
              {netCost <= 0 ? `You save ${formatCurrency(Math.abs(netCost))}` : formatCurrency(netCost)}
            </Text>
          </View>
        </View>

        {netCost <= 0 ? (
          <View style={styles.verdictGood}>
            <Text style={styles.verdictText}>✓ This card pays for itself with your usage</Text>
          </View>
        ) : (
          <View style={styles.verdictBad}>
            <Text style={styles.verdictText}>
              Enable {formatCurrency(netCost)} more in benefits to break even
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { fontFamily: fontSans.medium, fontSize: 15, color: colors.gold },
  headerTitle: { fontFamily: fontSerif.bold, fontSize: 18, color: colors.text },
  content: { paddingHorizontal: spacing.screen, paddingVertical: spacing.lg, paddingBottom: spacing.xl },
  sectionLabel: {
    fontFamily: fontSans.semiBold,
    fontSize: 10,
    color: colors.gold,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  sectionSub: {
    fontFamily: fontSans.regular,
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  presetScroll: { marginBottom: spacing.md },
  presetRow: { flexDirection: 'row', gap: 8, paddingRight: spacing.screen },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  presetChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  presetChipText: { fontFamily: fontSans.medium, fontSize: 13, color: colors.text },
  presetChipTextActive: { color: '#FFFFFF' },
  cardName: {
    fontFamily: fontSerif.bold,
    fontSize: 22,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.sidebar,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  feeLabel: { fontFamily: fontSans.medium, fontSize: 14, color: colors.muted },
  feeValue: { fontFamily: fontSans.bold, fontSize: 14, color: colors.urgent },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benefitInfo: { flex: 1, marginRight: spacing.sm },
  benefitLabel: { fontFamily: fontSans.medium, fontSize: 14, color: colors.text },
  benefitValue: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    gap: 8,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultRowNet: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  resultLabel: { fontFamily: fontSans.medium, fontSize: 14, color: colors.muted },
  resultValue: { fontFamily: fontSans.bold, fontSize: 14 },
  resultLabelNet: { fontFamily: fontSans.bold, fontSize: 15, color: colors.text },
  resultValueNet: { fontFamily: fontSans.bold, fontSize: 16 },
  verdictGood: {
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  verdictBad: {
    backgroundColor: colors.sidebar,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verdictText: { fontFamily: fontSans.medium, fontSize: 13, color: colors.text },
});
