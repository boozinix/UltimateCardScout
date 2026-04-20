import { useState, useMemo, useCallback } from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  FileText, Zap, PieChart, CalendarClock,
  CreditCard, Ticket, Lock, Plus,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Badge } from '@/components/primitives/Badge';
import { Surface } from '@/components/primitives/Surface';
import { ListItem } from '@/components/composed/ListItem';
import { StatCard } from '@/components/composed/StatCard';
import { EmptyState } from '@/components/composed/EmptyState';
import { SpendProgress } from '@/components/composed/SpendProgress';
import { HouseholdSetupModal } from '@/components/composed/HouseholdSetupModal';
import { useApplications } from '@/hooks/useApplications';
import { useHouseholdSetupComplete } from '@/hooks/useHousehold';
import { useSubscription } from '@/hooks/useSubscription';
import { usePortfolioTotal } from '@/hooks/usePointsBalances';

// ─── Feature nav items ──────────────────────────────────────────────────────

const FEATURES = [
  {
    id: 'ledger',
    route: '/(tabs)/intelligence/ledger',
    icon: FileText,
    title: 'Application Ledger',
    subtitle: 'Your full card history — every application ever made.',
    pro: false,
  },
  {
    id: 'velocity',
    route: '/(tabs)/intelligence/velocity',
    icon: Zap,
    title: 'Velocity Dashboard',
    subtitle: 'Chase 5/24, issuer rules, bonus eligibility.',
    pro: true,
  },
  {
    id: 'portfolio',
    route: '/(tabs)/intelligence/portfolio',
    icon: PieChart,
    title: 'Points Portfolio',
    subtitle: 'Your total points value in dollars.',
    pro: true,
  },
  {
    id: 'fee-advisor',
    route: '/(tabs)/intelligence/fee-advisor',
    icon: CalendarClock,
    title: 'Annual Fee Advisor',
    subtitle: '30-day alerts with retention scripts.',
    pro: true,
  },
  {
    id: 'spend',
    route: '/(tabs)/intelligence/spend',
    icon: CreditCard,
    title: 'Spend Optimizer',
    subtitle: 'Which card right now — ranked by value.',
    pro: true,
  },
  {
    id: 'deals',
    route: '/(tabs)/intelligence/deals',
    icon: Ticket,
    title: 'Deal Passport',
    subtitle: 'Transfer bonuses and elevated offers.',
    pro: true,
  },
] as const;

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function IntelligenceHubScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isPro } = useSubscription();
  const { data: apps, isLoading } = useApplications();
  const { data: setupComplete } = useHouseholdSetupComplete();

  const [dismissed, setDismissed] = useState(false);
  const [isFocused, setIsFocused] = useState(true);

  // Hide the modal whenever the user navigates away from this tab
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  // Show household modal on first visit if not complete
  const shouldShowSetup = setupComplete === false && !dismissed && isFocused;

  const { data: portfolio } = usePortfolioTotal();

  const hasApps = (apps?.length ?? 0) > 0;
  const activeApps = apps?.filter((a) => a.status === 'active') ?? [];
  const pendingBonuses = apps?.filter(
    (a) => a.status === 'active' && !a.bonus_achieved && a.bonus_amount,
  ) ?? [];

  // Top 3 most urgent bonuses (closest deadline first)
  const urgentBonuses = useMemo(() => {
    return [...pendingBonuses]
      .filter((a) => a.bonus_min_spend && a.bonus_min_spend > 0)
      .sort((a, b) => {
        const da = a.bonus_spend_deadline ?? '9999-12-31';
        const db = b.bonus_spend_deadline ?? '9999-12-31';
        return da.localeCompare(db);
      })
      .slice(0, 3);
  }, [pendingBonuses]);

  const portfolioValue = portfolio?.total_dollar_value ?? 0;

  const s = makeStyles(colors);

  return (
    <>
      <ScrollView
        style={s.screen}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerRule} />
          <Text
            variant="label"
            style={{ color: colors.gold, fontSize: 10, letterSpacing: 2, marginBottom: 6 }}
          >
            CARDSCOUT
          </Text>
          <Text
            variant="heading1"
            style={{ fontFamily: fontSerif.boldItalic, fontSize: 36, letterSpacing: -0.5, marginBottom: 10 }}
          >
            Intelligence
          </Text>
          <Text variant="bodySmall" color="muted" style={{ lineHeight: 21 }}>
            Your card operating system. Replace the spreadsheet.{'\n'}
            Know every number that matters.
          </Text>
        </View>

        {/* Summary stats — only if user has data */}
        {hasApps && (
          <View style={s.statsRow}>
            <StatCard
              value={String(activeApps.length)}
              label="Active cards"
              style={{ flex: 1 }}
            />
            <StatCard
              value={String(pendingBonuses.length)}
              label="Pending bonuses"
              emphasis={pendingBonuses.length > 0}
              style={{ flex: 1 }}
            />
            {portfolioValue > 0 && (
              <StatCard
                value={`$${Math.round(portfolioValue).toLocaleString()}`}
                label="Portfolio"
                style={{ flex: 1 }}
              />
            )}
          </View>
        )}

        {/* Empty state if no data */}
        {!hasApps && !isLoading && (
          <EmptyState
            icon={FileText}
            title="Your intelligence suite awaits."
            description="Add your first application to unlock velocity tracking, bonus progress, and portfolio insights."
            action={{
              label: 'Add first application',
              onPress: () => router.push('/(tabs)/intelligence/add' as any),
            }}
            style={{ marginBottom: spacing.xl }}
          />
        )}

        {/* Active bonuses — top 3 most urgent */}
        {urgentBonuses.length > 0 && (
          <View style={s.section}>
            <Text variant="heading3" style={{ marginBottom: 12 }}>Active Bonuses</Text>
            <View style={{ gap: 4 }}>
              {urgentBonuses.map((app) => (
                <Pressable
                  key={app.id}
                  onPress={() => router.push(`/(tabs)/intelligence/${app.id}` as any)}
                >
                  <SpendProgress
                    application={app}
                    onUpdateSpend={() => {}}
                    onMarkComplete={() => {}}
                    compact
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Feature navigation */}
        <View style={s.section}>
          <Text variant="heading3" style={{ marginBottom: 12 }}>Features</Text>
          <View style={{ gap: 8 }}>
            {FEATURES.map(({ id, route, icon, title, subtitle, pro }) => (
              <ListItem
                key={id}
                title={title}
                subtitle={subtitle}
                leftIcon={icon}
                rightElement={
                  pro && !isPro ? (
                    <Badge label="PRO" variant="pro" size="sm" />
                  ) : undefined
                }
                onPress={() => router.push(route as any)}
              />
            ))}
          </View>
        </View>

        {/* Curator note */}
        <View style={s.note}>
          <Text
            variant="bodySmall"
            style={{ fontFamily: fontSerif.italic, color: colors.muted, lineHeight: 22 }}
          >
            "Every dollar your cards earn is a dollar your portfolio grows.{'\n'}
            The spreadsheet era ends here."
          </Text>
        </View>
      </ScrollView>

      {/* Household setup modal — first visit */}
      <HouseholdSetupModal
        visible={shouldShowSetup}
        onDismiss={() => setDismissed(true)}
      />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: spacing.screen,
      paddingTop: 56,
      paddingBottom: 40,
    },
    header: { marginBottom: spacing.lg },
    headerRule: {
      width: 32,
      height: 3,
      backgroundColor: colors.gold,
      borderRadius: 2,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: spacing.lg,
    },
    section: {
      marginBottom: spacing.xl,
    },
    note: {
      borderLeftWidth: 3,
      borderLeftColor: colors.gold,
      paddingLeft: 14,
      paddingVertical: 4,
    },
  });
}
