import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import {
  TrendingUp, FileText, Zap, PieChart,
  CalendarClock, CreditCard, Ticket, Lock,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSerif, fontSans } from '@/lib/theme';

// ─── Feature definitions ─────────────────────────────────────────────────────

const FEATURES = [
  {
    id: 'ledger',
    icon: FileText,
    title: 'Application Ledger',
    subtitle: 'Replace your spreadsheet. Full card history, every application ever made.',
    status: 'coming_soon' as const,
    pro: true,
  },
  {
    id: 'velocity',
    icon: Zap,
    title: 'Velocity Dashboard',
    subtitle: 'Chase 5/24, Amex rules, bonus eligibility — all auto-calculated.',
    status: 'coming_soon' as const,
    pro: true,
  },
  {
    id: 'portfolio',
    icon: PieChart,
    title: 'Points Portfolio',
    subtitle: 'Your total points value in dollars. Know what you\'re sitting on.',
    status: 'coming_soon' as const,
    pro: true,
  },
  {
    id: 'fee-advisor',
    icon: CalendarClock,
    title: 'Annual Fee Advisor',
    subtitle: '30-day alerts. Keep, call retention, or downgrade — with a script.',
    status: 'coming_soon' as const,
    pro: true,
  },
  {
    id: 'spend',
    icon: CreditCard,
    title: 'Spend Optimizer',
    subtitle: '"Which card right now?" — ranked by actual dollar value earned.',
    status: 'coming_soon' as const,
    pro: true,
  },
  {
    id: 'deals',
    icon: Ticket,
    title: 'Deal Passport',
    subtitle: 'Transfer bonuses and elevated offers, personalized to your cards.',
    status: 'coming_soon' as const,
    pro: true,
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function IntelligenceScreen() {
  const { colors, isDark } = useTheme();
  const s = makeStyles(colors);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRule} />
        <Text style={s.eyebrow}>CARDSCOUT</Text>
        <Text style={s.headline}>Intelligence</Text>
        <Text style={s.sub}>
          Your card operating system. Replace the spreadsheet.{'\n'}
          Know every number that matters.
        </Text>
      </View>

      {/* Coming soon banner */}
      <View style={s.banner}>
        <TrendingUp size={16} color={colors.accent} strokeWidth={2} />
        <Text style={s.bannerText}>
          These features are actively building. Check back soon.
        </Text>
      </View>

      {/* Feature cards */}
      <View style={s.grid}>
        {FEATURES.map(({ id, icon: Icon, title, subtitle, pro }) => (
          <View key={id} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.iconWrap}>
                <Icon size={18} color={colors.accent} strokeWidth={1.75} />
              </View>
              {pro && (
                <View style={s.proBadge}>
                  <Lock size={9} color={colors.gold} strokeWidth={2} />
                  <Text style={s.proText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={s.cardTitle}>{title}</Text>
            <Text style={s.cardSub}>{subtitle}</Text>
          </View>
        ))}
      </View>

      {/* Curator note */}
      <View style={s.note}>
        <Text style={s.noteText}>
          "Every dollar your cards earn is a dollar your portfolio grows.{'\n'}
          The spreadsheet era ends here."
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

    // Header
    header: { marginBottom: spacing.lg },
    headerRule: {
      width: 32, height: 3,
      backgroundColor: colors.gold,
      borderRadius: 2,
      marginBottom: 12,
    },
    eyebrow: {
      fontFamily: fontSans.semiBold,
      fontSize: 10,
      color: colors.gold,
      letterSpacing: 2,
      marginBottom: 6,
    },
    headline: {
      fontFamily: fontSerif.boldItalic,
      fontSize: 36,
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 10,
    },
    sub: {
      fontFamily: fontSans.regular,
      fontSize: 14,
      color: colors.muted,
      lineHeight: 21,
    },

    // Banner
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.accentBg,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: spacing.lg,
    },
    bannerText: {
      fontFamily: fontSans.medium,
      fontSize: 13,
      color: colors.accent,
      flex: 1,
    },

    // Feature grid
    grid: { gap: 12, marginBottom: spacing.xl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.card,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    iconWrap: {
      width: 36, height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.accentBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    proBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.goldBg,
      borderRadius: radius.full,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    proText: {
      fontFamily: fontSans.bold,
      fontSize: 9,
      color: colors.gold,
      letterSpacing: 1,
    },
    cardTitle: {
      fontFamily: fontSans.semiBold,
      fontSize: 15,
      color: colors.text,
      marginBottom: 4,
    },
    cardSub: {
      fontFamily: fontSans.regular,
      fontSize: 13,
      color: colors.muted,
      lineHeight: 19,
    },

    // Curator note
    note: {
      borderLeftWidth: 3,
      borderLeftColor: colors.gold,
      paddingLeft: 14,
      paddingVertical: 4,
    },
    noteText: {
      fontFamily: fontSerif.italic,
      fontSize: 14,
      color: colors.muted,
      lineHeight: 22,
    },
  });
}
