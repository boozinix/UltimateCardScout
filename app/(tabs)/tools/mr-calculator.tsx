import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { capture, Events } from '@/lib/analytics';

const MR_TRANSFER_PARTNERS = [
  { name: 'Air Canada Aeroplan', cpp: 1.5, category: 'Airline' },
  { name: 'ANA Mileage Club', cpp: 1.5, category: 'Airline' },
  { name: 'British Airways Avios', cpp: 1.0, category: 'Airline' },
  { name: 'Delta SkyMiles', cpp: 1.0, category: 'Airline' },
  { name: 'Avianca LifeMiles', cpp: 1.3, category: 'Airline' },
  { name: 'Singapore KrisFlyer', cpp: 1.3, category: 'Airline' },
  { name: 'Virgin Atlantic', cpp: 1.1, category: 'Airline' },
  { name: 'Air France/KLM', cpp: 1.1, category: 'Airline' },
  { name: 'Hilton Honors', cpp: 0.5, category: 'Hotel' },
  { name: 'Marriott Bonvoy', cpp: 0.8, category: 'Hotel' },
];

const PORTAL_CPP = 1.0;

export default function MRCalculatorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [points, setPoints] = useState('100000');
  const [hasFired, setHasFired] = React.useState(false);

  React.useEffect(() => {
    if (!hasFired && parseInt(points.replace(/,/g, ''), 10) > 0) {
      capture(Events.CALCULATOR_USED, { calculator_name: 'mr_calculator' });
      setHasFired(true);
    }
  }, [points, hasFired]);

  const pointsNum = parseInt(points.replace(/,/g, ''), 10) || 0;
  const portalValue = (pointsNum * PORTAL_CPP) / 100;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Amex MR Calculator</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Membership Rewards</Text>
        <Text style={styles.sub}>
          Estimate the value of your Amex MR points across redemption options.
        </Text>

        <Text style={styles.sectionLabel}>YOUR MR BALANCE</Text>
        <TextInput
          style={styles.pointsInput}
          value={points}
          onChangeText={setPoints}
          keyboardType="numeric"
          placeholder="100000"
          placeholderTextColor={colors.muted}
        />

        {/* Cash redemption */}
        <View style={styles.resultCard}>
          <Text style={styles.resultCardLabel}>Pay with Points (Amex Travel Portal)</Text>
          <Text style={styles.resultCardCpp}>{PORTAL_CPP}¢ per point</Text>
          <Text style={styles.resultCardValue}>{formatCurrency(portalValue)}</Text>
          <Text style={styles.resultCardNote}>
            {formatNumber(pointsNum)} pts → {formatCurrency(portalValue)} toward travel
          </Text>
        </View>

        {/* Cash equivalent */}
        <View style={[styles.resultCard, styles.resultCardCash]}>
          <Text style={styles.resultCardLabel}>Cash / Statement Credit</Text>
          <Text style={styles.resultCardCpp}>0.6¢ per point</Text>
          <Text style={[styles.resultCardValue, { color: colors.muted }]}>
            {formatCurrency((pointsNum * 0.6) / 100)}
          </Text>
          <Text style={styles.resultCardNote}>Worst option — avoid for points/miles</Text>
        </View>

        {/* Transfer partners */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>TRANSFER PARTNERS</Text>
        <Text style={styles.sectionSub}>Typically 1:1 transfer ratio</Text>

        {MR_TRANSFER_PARTNERS.map((p) => {
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
                  {better ? `+${formatCurrency(delta)}` : formatCurrency(delta)}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={styles.tip}>
          <Text style={styles.tipText}>
            💡 Aeroplan, ANA, and Avianca often offer the best transfer value for long-haul business class redemptions.
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
  resultCardCash: {
    backgroundColor: colors.sidebar,
    borderColor: colors.border,
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
