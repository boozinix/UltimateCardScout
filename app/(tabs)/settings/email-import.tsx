import React, { useState, useCallback } from 'react';
import { ScrollView, View, Pressable, StyleSheet, Alert } from 'react-native';
import {
  ChevronLeft, Mail, Copy, RefreshCw, CheckCircle, AlertCircle, Clock,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Surface } from '@/components/primitives/Surface';
import { Badge } from '@/components/primitives/Badge';
import {
  useEmailAlias,
  useCreateEmailAlias,
  useRegenerateAlias,
  useEmailImportStats,
  EMAIL_DOMAIN,
  GMAIL_FILTER_RULE,
} from '@/hooks/useEmailAlias';

// ============================================================
// Screen
// ============================================================

export default function EmailImportScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { data: alias, isLoading: aliasLoading } = useEmailAlias();
  const { data: stats } = useEmailImportStats();
  const createAlias = useCreateEmailAlias();
  const regenerateAlias = useRegenerateAlias();

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fullAddress = alias ? `${alias.alias}@${EMAIL_DOMAIN}` : null;

  const handleCopy = useCallback(async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleGenerate = useCallback(async () => {
    await createAlias.mutateAsync();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [createAlias]);

  const handleRegenerate = useCallback(() => {
    Alert.alert(
      'Regenerate Address?',
      'Your current forwarding address will stop working. You\'ll need to update your Gmail filter.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            await regenerateAlias.mutateAsync();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }, [regenerateAlias]);

  const s = makeStyles(colors);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text variant="label" style={{ color: colors.gold, fontSize: 10, letterSpacing: 2, marginBottom: 2 }}>
            SETTINGS
          </Text>
          <Text variant="heading1" style={{ fontFamily: fontSerif.boldItalic, fontSize: 28 }}>
            Email Import
          </Text>
        </View>
      </View>

      <Text variant="bodySmall" color="muted" style={{ marginBottom: spacing.lg, lineHeight: 21 }}>
        Forward card emails from your issuers to automatically track applications, bonuses, and fee reminders.
      </Text>

      {/* Generate alias */}
      {!alias && !aliasLoading && (
        <Surface variant="card" border padding="lg" radius="lg" style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
          <Mail size={40} color={colors.accent} strokeWidth={1.5} />
          <Text variant="heading3" style={{ marginTop: 12, textAlign: 'center' }}>
            Set up email forwarding
          </Text>
          <Text variant="bodySmall" color="muted" style={{ marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
            Generate a unique forwarding address.{'\n'}
            Forward card emails from Chase, Amex, Citi, and more.
          </Text>
          <Button
            label="Generate My Address"
            variant="primary"
            onPress={handleGenerate}
            loading={createAlias.isPending}
            style={{ marginTop: 16 }}
          />
        </Surface>
      )}

      {/* Loading */}
      {aliasLoading && (
        <Surface variant="card" padding="lg" radius="lg" style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <Text variant="body" color="muted">Loading...</Text>
        </Surface>
      )}

      {/* Active alias */}
      {alias && fullAddress && (
        <>
          {/* Address display */}
          <Surface variant="card" border padding="lg" radius="lg" style={{ marginBottom: spacing.lg }}>
            <Text variant="label" color="muted" style={{ fontSize: 10, marginBottom: 8 }}>
              YOUR FORWARDING ADDRESS
            </Text>
            <Pressable style={s.copyRow} onPress={() => handleCopy(fullAddress, 'address')}>
              <Text variant="mono" style={{ fontSize: 16, flex: 1, color: colors.text }}>
                {fullAddress}
              </Text>
              {copiedField === 'address' ? (
                <CheckCircle size={18} color={colors.success} />
              ) : (
                <Copy size={18} color={colors.accent} />
              )}
            </Pressable>
            <Text variant="caption" color="muted" style={{ marginTop: 6 }}>
              Tap to copy. Only processes emails from known issuers.
            </Text>
          </Surface>

          {/* Gmail setup instructions */}
          <Surface variant="card" border padding="lg" radius="lg" style={{ marginBottom: spacing.lg }}>
            <Text variant="heading3" style={{ marginBottom: 12 }}>Gmail Filter Setup</Text>

            <View style={s.step}>
              <Badge variant="info" size="sm" label="1" />
              <Text variant="bodySmall" style={{ flex: 1, marginLeft: 10, lineHeight: 20 }}>
                Open Gmail Settings → Filters → Create new filter
              </Text>
            </View>

            <View style={s.step}>
              <Badge variant="info" size="sm" label="2" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text variant="bodySmall" style={{ lineHeight: 20, marginBottom: 6 }}>
                  In the "From" field, paste this filter rule:
                </Text>
                <Pressable style={s.codeBlock} onPress={() => handleCopy(GMAIL_FILTER_RULE, 'filter')}>
                  <Text variant="mono" style={{ fontSize: 11, color: colors.text, flex: 1 }}>
                    {GMAIL_FILTER_RULE}
                  </Text>
                  {copiedField === 'filter' ? (
                    <CheckCircle size={14} color={colors.success} />
                  ) : (
                    <Copy size={14} color={colors.accent} />
                  )}
                </Pressable>
              </View>
            </View>

            <View style={s.step}>
              <Badge variant="info" size="sm" label="3" />
              <Text variant="bodySmall" style={{ flex: 1, marginLeft: 10, lineHeight: 20 }}>
                Click "Create filter" → check "Forward it to" → enter your CardScout address above
              </Text>
            </View>

            <View style={s.step}>
              <Badge variant="info" size="sm" label="4" />
              <Text variant="bodySmall" style={{ flex: 1, marginLeft: 10, lineHeight: 20 }}>
                Check "Also apply to matching conversations" to import existing emails
              </Text>
            </View>
          </Surface>

          {/* Stats */}
          <Surface variant="card" border padding="lg" radius="lg" style={{ marginBottom: spacing.lg }}>
            <Text variant="label" color="muted" style={{ fontSize: 10, marginBottom: 12 }}>
              IMPORT STATISTICS
            </Text>
            <View style={s.statsGrid}>
              <View style={s.statItem}>
                <Mail size={16} color={colors.accent} />
                <Text variant="mono" style={{ fontSize: 18, marginTop: 4 }}>{stats?.total ?? 0}</Text>
                <Text variant="caption" color="muted">Received</Text>
              </View>
              <View style={s.statItem}>
                <CheckCircle size={16} color={colors.success} />
                <Text variant="mono" style={{ fontSize: 18, marginTop: 4 }}>{stats?.autoApplied ?? 0}</Text>
                <Text variant="caption" color="muted">Applied</Text>
              </View>
              <View style={s.statItem}>
                <Clock size={16} color={colors.warn} />
                <Text variant="mono" style={{ fontSize: 18, marginTop: 4 }}>{stats?.pending ?? 0}</Text>
                <Text variant="caption" color="muted">Pending</Text>
              </View>
            </View>
            {stats?.lastReceived && (
              <Text variant="caption" color="muted" style={{ marginTop: 12, textAlign: 'center' }}>
                Last received: {new Date(stats.lastReceived).toLocaleDateString()}
              </Text>
            )}
          </Surface>

          {/* Regenerate */}
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <Button
              label="Regenerate Address"
              variant="secondary"
              size="sm"
              leftIcon={RefreshCw}
              onPress={handleRegenerate}
              loading={regenerateAlias.isPending}
            />
            <Text variant="caption" color="muted" style={{ marginTop: 6, textAlign: 'center' }}>
              Creates a new address. Your old address will stop working.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ============================================================
// Styles
// ============================================================

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: {
      paddingHorizontal: spacing.screen,
      paddingTop: 56,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    copyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bg,
      borderRadius: radius.sm,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    step: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    codeBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bg,
      borderRadius: radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      paddingVertical: 12,
    },
  });
}
