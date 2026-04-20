import { useState, useMemo } from 'react';
import { View, FlatList, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, FileUp, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { spacing, radius, fontSans, fontSerif } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Badge } from '@/components/primitives/Badge';
import { Surface } from '@/components/primitives/Surface';
import { FilterChip } from '@/components/composed/FilterChip';
import { EmptyState } from '@/components/composed/EmptyState';
import { ProgressBar } from '@/components/composed/ProgressBar';
import { useApplications } from '@/hooks/useApplications';
import { useHousehold } from '@/hooks/useHousehold';
import {
  ISSUER_LABELS,
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  type ApplicationWithMember,
} from '@/lib/applicationTypes';

// ─── Status badge mapping ────────────────────────────────────────────────────

const STATUS_BADGE: Record<ApplicationStatus, 'success' | 'danger' | 'warning' | 'neutral' | 'info'> = {
  active: 'success',
  pending: 'warning',
  denied: 'danger',
  closed: 'neutral',
  product_changed: 'info',
  shutdown_by_issuer: 'danger',
};

type StatusFilter = 'all' | 'open' | 'closed';

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function LedgerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isDesktop } = useBreakpoint();
  const { data: apps, isLoading } = useApplications();
  const { data: members } = useHousehold();

  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    let list = apps ?? [];
    if (memberFilter) {
      list = list.filter((a) => a.household_member_id === memberFilter);
    }
    if (statusFilter === 'open') {
      list = list.filter((a) => a.status === 'active' || a.status === 'pending');
    } else if (statusFilter === 'closed') {
      list = list.filter((a) =>
        a.status === 'closed' || a.status === 'denied' ||
        a.status === 'product_changed' || a.status === 'shutdown_by_issuer',
      );
    }
    return list;
  }, [apps, memberFilter, statusFilter]);

  const s = makeStyles(colors);

  const renderItem = ({ item }: { item: ApplicationWithMember }) => {
    const hasActiveBonus = item.status === 'active' && !item.bonus_achieved && item.bonus_amount && item.bonus_min_spend;

    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/(tabs)/intelligence/${item.id}` as any);
        }}
        style={({ pressed }) => [s.row, { opacity: pressed ? 0.7 : 1 }]}
      >
        {/* Issuer dot */}
        <View style={[s.issuerDot, { backgroundColor: colors.accent }]} />

        <View style={{ flex: 1 }}>
          <View style={s.rowTop}>
            <Text variant="body" numberOfLines={1} style={{ flex: 1, fontWeight: '500' }}>
              {item.card_name_override ?? item.card_name}
            </Text>
            <Badge
              label={APPLICATION_STATUS_LABELS[item.status]}
              variant={STATUS_BADGE[item.status]}
              size="sm"
            />
          </View>

          <View style={s.rowMeta}>
            <Text variant="caption" color="muted">
              {ISSUER_LABELS[item.issuer]} · {formatMonth(item.applied_month)}
            </Text>
            {item.household_member?.name && (
              <Text variant="caption" color="muted">
                {' '}· {item.household_member.name}
              </Text>
            )}
          </View>

          {hasActiveBonus && (
            <View style={{ marginTop: 8 }}>
              <ProgressBar
                current={item.bonus_spend_progress}
                total={item.bonus_min_spend!}
                showLabel
                height={4}
              />
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerRow}>
          <Text
            variant="heading2"
            style={{ fontFamily: fontSerif.bold, flex: 1 }}
          >
            Application Ledger
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/intelligence/csv-import' as any)}
            hitSlop={8}
            style={s.headerAction}
          >
            <FileUp size={18} color={colors.muted} strokeWidth={1.75} />
          </Pressable>
        </View>

        {/* Filters */}
        <View style={s.filters}>
          {/* Member filter */}
          {members && members.length > 1 && (
            <>
              <FilterChip
                label="All"
                selected={memberFilter === null}
                onPress={() => setMemberFilter(null)}
              />
              {members.map((m) => (
                <FilterChip
                  key={m.id}
                  label={m.name}
                  selected={memberFilter === m.id}
                  onPress={() => setMemberFilter(memberFilter === m.id ? null : m.id)}
                />
              ))}
            </>
          )}
        </View>

        {/* Status filter */}
        <View style={s.filters}>
          {(['all', 'open', 'closed'] as StatusFilter[]).map((sf) => (
            <FilterChip
              key={sf}
              label={sf === 'all' ? 'All' : sf === 'open' ? 'Open' : 'Closed'}
              selected={statusFilter === sf}
              onPress={() => setStatusFilter(sf)}
            />
          ))}
        </View>
      </View>

      {/* Application list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          { padding: spacing.screen, paddingBottom: 100 },
          isDesktop && { maxWidth: 1200, alignSelf: 'center' as const, width: '100%' as any },
        ]}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={FileText}
              title="No applications yet."
              description="Import your spreadsheet or add your first card."
              action={{
                label: 'Add application',
                onPress: () => router.push('/(tabs)/intelligence/add' as any),
              }}
            />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      {/* FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/(tabs)/intelligence/add' as any);
        }}
        style={[
          s.fab,
          { bottom: insets.bottom + 20 },
        ]}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMonth(ym: string): string {
  const [year, month] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = parseInt(month, 10);
  return `${months[m - 1] ?? month} ${year}`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      paddingHorizontal: spacing.screen,
      paddingBottom: 12,
      backgroundColor: colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    headerAction: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filters: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
      flexWrap: 'wrap',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.card,
    },
    issuerDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rowMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    fab: {
      position: 'absolute',
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        android: { elevation: 6 },
        web: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
      }),
    },
  });
}
