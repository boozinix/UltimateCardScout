import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { impactMedium } from '@/utils/haptics';
import { createCheckoutSession } from '@/lib/subscription';
import { capture, Events } from '@/lib/analytics';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
}

const PRO_FEATURES = [
  'Unlimited card wallet',
  'Smart benefit reminders',
  'ROI dashboard',
  'AI benefit extraction',
  'Portfolio expander insights',
  'Export to calendar',
];

export function PaywallModal({ visible, onClose, feature }: PaywallModalProps) {
  React.useEffect(() => {
    if (visible) capture(Events.PAYWALL_SHOWN, { feature });
  }, [visible]);

  const handleUpgrade = async (plan: 'monthly' | 'annual') => {
    await impactMedium();
    capture(Events.UPGRADE_TAPPED, { plan });
    const url = await createCheckoutSession(plan);
    if (url) {
      const { Linking } = require('react-native');
      await Linking.openURL(url);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.eyebrow}>CARDSCOUT PRO</Text>
            <Text style={styles.headline}>Unlock everything</Text>
            {feature && (
              <Text style={styles.featureNote}>"{feature}" requires Pro.</Text>
            )}

            <View style={styles.featureList}>
              {PRO_FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Text style={styles.featureCheck}>✓</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.annualBtn} onPress={() => handleUpgrade('annual')}>
              <View>
                <Text style={styles.annualBtnTitle}>$49 / year</Text>
                <Text style={styles.annualBtnSub}>≈ $4.08/mo · Best value</Text>
              </View>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save 41%</Text>
              </View>
            </Pressable>

            <Pressable style={styles.monthlyBtn} onPress={() => handleUpgrade('monthly')}>
              <Text style={styles.monthlyBtnText}>$6.99 / month</Text>
            </Pressable>

            <Text style={styles.trialNote}>14-day free trial · Cancel anytime</Text>
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Text style={styles.closeBtnText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    width: 40,
    height: 4,
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
  featureList: {
    marginBottom: spacing.lg,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
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
    backgroundColor: colors.gold,
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
  closeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  closeBtnText: {
    fontFamily: fontSans.medium,
    fontSize: 14,
    color: colors.muted,
  },
});
