import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { impactMedium } from '@/utils/haptics';
import { createCheckoutSession, PRICING_MONTHLY_USD, PRICING_ANNUAL_USD } from '@/lib/subscription';
import { capture, Events } from '@/lib/analytics';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
}

const PRO_FEATURES = [
  'Unlimited card wallet',
  'Application Ledger — replace your spreadsheet',
  'Velocity Dashboard — 5/24, issuer rules, eligibility',
  'Points Portfolio valuation',
  'Annual Fee Advisor + retention scripts',
  'Spend Optimizer — which card right now?',
  'Deal Passport — transfer bonuses & elevated offers',
  'AI natural language card entry',
];

const ANNUAL_MONTHLY = (PRICING_ANNUAL_USD / 12).toFixed(2);
const ANNUAL_SAVINGS_PCT = Math.round(
  (1 - PRICING_ANNUAL_USD / (PRICING_MONTHLY_USD * 12)) * 100,
);

export function PaywallModal({ visible, onClose, feature }: PaywallModalProps) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  React.useEffect(() => {
    if (visible) capture(Events.PAYWALL_VIEWED, { trigger: feature });
  }, [visible]);

  const handleUpgrade = async (plan: 'monthly' | 'annual') => {
    await impactMedium();
    capture(Events.PAYWALL_VIEWED, { trigger: `upgrade_${plan}` });
    const url = await createCheckoutSession(plan);
    if (url) {
      const { Linking } = require('react-native');
      await Linking.openURL(url);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.eyebrow}>CARDSCOUT PRO</Text>
            <Text style={s.headline}>Unlock everything</Text>
            {feature && (
              <Text style={s.featureNote}>"{feature}" requires Pro.</Text>
            )}

            <View style={s.featureList}>
              {PRO_FEATURES.map((f) => (
                <View key={f} style={s.featureRow}>
                  <Text style={s.featureCheck}>✓</Text>
                  <Text style={s.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            {/* Annual — primary CTA */}
            <Pressable style={s.annualBtn} onPress={() => handleUpgrade('annual')}>
              <View>
                <Text style={s.annualBtnTitle}>${PRICING_ANNUAL_USD.toFixed(0)} / year</Text>
                <Text style={s.annualBtnSub}>≈ ${ANNUAL_MONTHLY}/mo · Best value</Text>
              </View>
              <View style={s.saveBadge}>
                <Text style={s.saveBadgeText}>Save {ANNUAL_SAVINGS_PCT}%</Text>
              </View>
            </Pressable>

            {/* Monthly — secondary */}
            <Pressable style={s.monthlyBtn} onPress={() => handleUpgrade('monthly')}>
              <Text style={s.monthlyBtnText}>${PRICING_MONTHLY_USD.toFixed(2)} / month</Text>
            </Pressable>

            <Text style={s.trialNote}>14-day free trial · Cancel anytime</Text>
          </ScrollView>

          <Pressable style={s.closeBtn} onPress={onClose} hitSlop={12}>
            <Text style={s.closeBtnText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: spacing.screen,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      maxHeight: '90%',
    },
    handle: {
      width: 40, height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    eyebrow: {
      fontFamily: fontSans.semiBold,
      fontSize: 10,
      color: colors.gold,
      letterSpacing: 1.5,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    headline: {
      fontFamily: fontSerif.bold,
      fontSize: 28,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    featureNote: {
      fontFamily: fontSans.regular,
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: spacing.lg,
      fontStyle: 'italic',
    },
    featureList: { marginBottom: spacing.lg, gap: 10 },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    featureCheck: {
      fontFamily: fontSans.bold,
      fontSize: 14,
      color: colors.gold,
      lineHeight: 22,
      flexShrink: 0,
    },
    featureText: {
      fontFamily: fontSans.medium,
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
      flex: 1,
    },
    annualBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    annualBtnTitle: {
      fontFamily: fontSans.bold,
      fontSize: 17,
      color: '#FFFFFF',
    },
    annualBtnSub: {
      fontFamily: fontSans.regular,
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
    },
    saveBadge: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    saveBadgeText: {
      fontFamily: fontSans.bold,
      fontSize: 12,
      color: '#FFFFFF',
    },
    monthlyBtn: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    monthlyBtnText: {
      fontFamily: fontSans.semiBold,
      fontSize: 16,
      color: colors.text,
    },
    trialNote: {
      fontFamily: fontSans.regular,
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    closeBtn: { alignItems: 'center', paddingVertical: spacing.sm },
    closeBtnText: {
      fontFamily: fontSans.medium,
      fontSize: 14,
      color: colors.muted,
    },
  });
}
