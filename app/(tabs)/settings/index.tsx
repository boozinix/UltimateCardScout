import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSerif, fontSans, radius } from '@/lib/theme';
import { useSubscription } from '@/hooks/useSubscription';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext';
import { PaywallModal } from '@/components/PaywallModal';
import { exportCalendar } from '@/utils/icsExport';
import { requestNotificationPermissions, cancelAllReminderNotifications } from '@/utils/notifications';
import { createCheckoutSession } from '@/lib/subscription';
import { format, parseISO } from 'date-fns';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { subscription, isPro, loading } = useSubscription();
  const { isDesktop } = useBreakpoint();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  const [showPaywall, setShowPaywall] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '');
    });
  }, []);

  const handleSignOut = async () => {
    await cancelAllReminderNotifications().catch(() => {});
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const handleExportCalendar = async () => {
    if (!isPro) { setShowPaywall(true); return; }
    setExporting(true);
    const result = await exportCalendar();
    setExporting(false);
    if (!result.success) Alert.alert('Export failed', result.error ?? 'Unknown error');
  };

  const handleNotifToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      setNotifEnabled(granted);
      if (!granted) Alert.alert('Permission denied', 'Enable notifications in Settings to receive benefit reminders.');
    } else {
      await cancelAllReminderNotifications().catch(() => {});
      setNotifEnabled(false);
    }
  };

  const handleUpgrade = async (plan: 'monthly' | 'annual') => {
    const url = await createCheckoutSession(plan);
    if (url) await Linking.openURL(url);
  };

  const periodEnd = subscription?.currentPeriodEnd
    ? format(parseISO(subscription.currentPeriodEnd), 'MMMM d, yyyy')
    : null;

  const trialEnd = subscription?.trialEnd
    ? format(parseISO(subscription.trialEnd), 'MMMM d, yyyy')
    : null;

  return (
    <ScrollView
      style={styles.bg}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        isDesktop && { maxWidth: 600, alignSelf: 'center' as const, width: '100%' as any },
      ]}
    >
      <Text style={styles.heading}>Settings</Text>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        {userEmail ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{userEmail}</Text>
          </View>
        ) : null}
        <Pressable style={styles.row} onPress={handleSignOut}>
          <Text style={[styles.rowLabel, { color: colors.urgent }]}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
        {!loading && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              {isPro ? 'CardScout Pro' : 'Free Plan'}
            </Text>
            <Text style={styles.rowSub}>
              {isPro && subscription?.status === 'trialing' && trialEnd
                ? `Trial ends ${trialEnd}`
                : isPro && periodEnd
                ? `Renews ${periodEnd}`
                : `Up to ${3} cards`}
            </Text>
          </View>
        )}
        {!isPro && (
          <>
            <Pressable style={styles.upgradeRow} onPress={() => handleUpgrade('monthly')}>
              <Text style={styles.upgradePrimary}>Upgrade — $6.99/mo</Text>
              <Text style={styles.upgradeSub}>14-day free trial</Text>
            </Pressable>
            <Pressable style={styles.upgradeRowSecondary} onPress={() => handleUpgrade('annual')}>
              <Text style={styles.upgradeSecondaryText}>Annual plan — $49/yr (save 41%)</Text>
            </Pressable>
          </>
        )}
        {isPro && subscription?.cancelAtPeriodEnd && (
          <View style={[styles.row, { backgroundColor: colors.warnBg }]}>
            <Text style={[styles.rowLabel, { color: colors.warn }]}>Cancels at period end</Text>
          </View>
        )}
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
          <Pressable
            key={m}
            style={[styles.row, styles.rowSwitch]}
            onPress={() => setThemeMode(m)}
          >
            <Text style={styles.rowLabel}>
              {m === 'light' ? 'Light' : m === 'dark' ? 'Dark' : 'System'}
            </Text>
            <View style={{
              width: 20, height: 20, borderRadius: 10,
              borderWidth: 2,
              borderColor: themeMode === m ? colors.accent : colors.border,
              backgroundColor: themeMode === m ? colors.accent : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {themeMode === m && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
              )}
            </View>
          </Pressable>
        ))}
      </View>

      {/* Reminders */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>REMINDERS</Text>
        <View style={[styles.row, styles.rowSwitch]}>
          <Text style={styles.rowLabel}>Push notifications</Text>
          <Switch
            value={notifEnabled}
            onValueChange={handleNotifToggle}
            trackColor={{ false: colors.border, true: '#D97706' }}
            thumbColor={notifEnabled ? colors.gold : colors.muted}
          />
        </View>
        <Pressable style={styles.row} onPress={handleExportCalendar} disabled={exporting}>
          <Text style={styles.rowLabel}>{exporting ? 'Exporting…' : 'Export to Calendar (.ics)'}</Text>
          {!isPro && <Text style={styles.proTag}>PRO</Text>}
        </Pressable>
      </View>

      {/* Data Import */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DATA IMPORT</Text>
        <Pressable style={styles.row} onPress={() => router.push('/(tabs)/settings/email-import')}>
          <Text style={styles.rowLabel}>Email Forwarding</Text>
          <Text style={styles.rowSub}>Auto-import card emails from your issuers</Text>
        </Pressable>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>CardScout</Text>
          <Text style={styles.rowSub}>Version 1.0.0</Text>
        </View>
        <Pressable
          style={styles.row}
          onPress={() => Linking.openURL('mailto:zubair.nizami@yahoo.com?subject=CardScout%20Feedback')}
        >
          <Text style={styles.rowLabel}>Send Feedback</Text>
        </Pressable>
      </View>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} feature="Calendar export" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.screen },
  heading: { fontFamily: fontSerif.bold, fontSize: 28, color: colors.text, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionLabel: {
    fontFamily: fontSans.medium, fontSize: 10, color: colors.muted,
    letterSpacing: 1.2, marginBottom: spacing.sm,
  },
  row: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingVertical: 14, paddingHorizontal: spacing.md, marginBottom: 8,
  },
  rowSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontFamily: fontSans.medium, fontSize: 15, color: colors.text },
  rowSub: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  proTag: {
    fontFamily: fontSans.medium, fontSize: 10, color: colors.gold,
    letterSpacing: 0.5,
  },
  upgradeRow: {
    backgroundColor: colors.text, borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: spacing.md, marginBottom: 8, alignItems: 'center',
  },
  upgradePrimary: { fontFamily: fontSans.bold, fontSize: 15, color: '#fff' },
  upgradeSub: { fontFamily: fontSans.regular, fontSize: 12, color: '#ffffff99', marginTop: 2 },
  upgradeRowSecondary: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingVertical: 14, paddingHorizontal: spacing.md, marginBottom: 8, alignItems: 'center',
  },
  upgradeSecondaryText: { fontFamily: fontSans.medium, fontSize: 14, color: colors.text },
});
