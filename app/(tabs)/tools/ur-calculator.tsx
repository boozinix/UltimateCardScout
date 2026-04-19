import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { capture, Events } from '@/lib/analytics';

const PORTAL_CPP = 1.5; // CSR: 1.5¢ | CSP: 1.25¢
const TRANSFER_PARTNERS = [
  { name: 'Hyatt', cpp: 1.7, category: 'Hotel' },
  { name: 'United', cpp: 1.2, category: 'Airline' },
  { name: 'Southwest', cpp: 1.3, category: 'Airline' },
  { name: 'British Airways', cpp: 1.0, category: 'Airline' },
  { name: 'Air France/KLM', cpp: 1.1, category: 'Airline' },
  { name: 'Singapore Airlines', cpp: 1.3, category: 'Airline' },
  { name: 'Marriott Bonvoy', cpp: 0.8, category: 'Hotel' },
  { name: 'IHG', cpp: 0.6, category: 'Hotel' },
];

export default function URCalculatorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [points, setPoints] = useState('50000');
  const [selectedCard, setSelectedCard] = useState<'CSP' | 'CSR'>('CSR');
  const [hasFired, setHasFired] = React.useState(false);

  React.useEffect(() => {
    if (!hasFired && parseInt(points.replace(/,/g, ''), 10) > 0) {
      capture(Events.CALCULATOR_USED, { calculator_name: 'ur_calculator' });
      setHasFired(true);
    }
  }, [points, hasFired]);

  const portalCpp = selectedCard === 'CSR' ? 1.5 : 1.25;
  const pointsNum = parseInt(points.replace(/,/g, ''), 10) || 0;

  const portalValue = useMemo(() => (pointsNum * portalCpp) / 100, [pointsNum, portalCpp]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Chase UR Calculator</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Chase Ultimate Rewards</Text>
        <Text style={styles.sub}>
          Compare portal redemptions vs. transfer partners to find the best value.
        </Text>

        {/* Card selector */}
        <Text style={styles.sectionLabel}>YOUR SAPPHIRE CARD</Text>
        <View style={styles.segmentRow}>
          {(['CSR', 'CSP'] as const).map((c) => (
            <Pressable
              key={c}
              style={[styles.segment, selectedCard === c && styles.segmentActive]}
              onPress={() => setSelectedCard(c)}
            >
              <Text style={[styles.segmentText, selectedCard === c && styles.segmentTextActive]}>
                {c === 'CSR' ? 'Sapphire Reserve' : 'Sapphire Preferred'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Points input */}
        <Text style={styles.sectionLabel}>YOUR UR POINTS BALANCE</Text>
        <TextInput
          style={styles.pointsInput}
          value={points}
          onChangeText={setPoints}
          keyboardType="numeric"
          placeholder="50000"
          placeholderTextColor={colors.muted}
        />

        {/* Portal value */}
        <View style={styles.resultCard}>
          <Text style={styles.resultCardLabel}>Chase Travel Portal</Text>
          <Text style={styles.resultCardCpp}>{portalCpp}¢ per point</Text>
          <Text style={styles.resultCardValue}>{formatCurrency(portalValue)}</Text>
          <Text style={styles.resultCardNote}>
            Redeem {formatNumber(pointsNum)} pts → {formatCurrency(portalValue)} in travel
          </Text>
        </View>

        {/* Transfer partners */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>TRANSFER PARTNERS</Text>
        <Text style={styles.sectionSub}>1:1 transfer ratio to all partners</Text>

        {TRANSFER_PARTNERS.map((p) => {
          const value = (pointsNum * p.cpp) / 100;
          const delta = value - portalValue;
          const better = delta > 0;
          return (
            <View key={p.name} style={styles.partnerRow}>
              <View style={styles.partnerLeft}>
                <Text style={styles.partnerName}>{p.name}</Text>
                <Text style={styles.partnerCategory}>{p.category} · {p.cpp}¢/pt</Text>
              </View>
              <View style={styles.partnerRight}>
                <Text style={styles.partnerValue}>{formatCurrency(value)}</Text>
                <Text style={[styles.partnerDelta, { color: better ? colors.success : colors.muted }]}>
                  {better ? `+${formatCurrency(delta)} vs portal` : `${formatCurrency(delta)} vs portal`}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={styles.tip}>
          <Text style={styles.tipText}>
            💡 Hyatt typically offers the best value among Chase partners — especially for luxury hotels where cash rates are high.
          </Text>
        </View>
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
  headline: { fontFamily: fontSerif.bold, fontSize: 24, color: colors.text, marginBottom: 4 },
  sub: { fontFamily: fontSans.regular, fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: spacing.lg },
  sectionLabel: {
    fontFamily: fontSans.semiBold,
    fontSize: 10,
    color: colors.gold,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  sectionSub: { fontFamily: fontSans.regular, fontSize: 13, color: colors.muted, marginBottom: spacing.sm },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.sidebar,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginBottom: spacing.md,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm - 2,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  segmentText: { fontFamily: fontSans.medium, fontSize: 13, color: colors.muted },
  segmentTextActive: { color: colors.text, fontFamily: fontSans.semiBold },
  pointsInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fontSans.bold,
    fontSize: 22,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  resultCard: {
    backgroundColor: colors.goldBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gold + '40',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  resultCardLabel: { fontFamily: fontSans.semiBold, fontSize: 12, color: colors.gold, marginBottom: 2 },
  resultCardCpp: { fontFamily: fontSans.medium, fontSize: 13, color: colors.muted },
  resultCardValue: { fontFamily: fontSerif.bold, fontSize: 32, color: colors.gold, marginVertical: 4 },
  resultCardNote: { fontFamily: fontSans.regular, fontSize: 13, color: colors.muted },
  partnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: 8,
  },
  partnerLeft: { flex: 1 },
  partnerName: { fontFamily: fontSans.semiBold, fontSize: 14, color: colors.text },
  partnerCategory: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  partnerRight: { alignItems: 'flex-end' },
  partnerValue: { fontFamily: fontSans.bold, fontSize: 15, color: colors.text },
  partnerDelta: { fontFamily: fontSans.medium, fontSize: 12, marginTop: 2 },
  tip: {
    backgroundColor: colors.sidebar,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipText: { fontFamily: fontSans.regular, fontSize: 13, color: colors.muted, lineHeight: 19 },
});
