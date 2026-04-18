import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';

type GuideSection = {
  title: string;
  guides: { id: string; title: string; sub: string }[];
};

const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: 'Strategy',
    guides: [
      { id: 'chase-524', title: 'Chase 5/24 Rule Explained', sub: 'How it works and how to navigate it' },
      { id: 'chase-first', title: 'Chase-First Strategy', sub: 'Why to prioritize Chase before other issuers' },
      { id: 'amex-popup', title: 'Amex Pop-Up Denial', sub: 'What it is and how to avoid it' },
      { id: 'churning-101', title: 'Card Churning 101', sub: 'Responsible strategies for maximizing bonuses' },
    ],
  },
  {
    title: 'Issuer Rules',
    guides: [
      { id: 'chase-rules', title: 'Chase Application Rules', sub: '5/24, 2/30, one Sapphire policy' },
      { id: 'amex-rules', title: 'Amex Application Rules', sub: '2/90, once-in-a-lifetime bonuses, pop-ups' },
      { id: 'citi-rules', title: 'Citi Application Rules', sub: '1/8, 2/65 rules explained' },
      { id: 'capital-one-rules', title: 'Capital One Rules', sub: '2-card limit, velocity rules' },
      { id: 'barclays-rules', title: 'Barclays Rules', sub: '6/24 and relationship rules' },
    ],
  },
  {
    title: 'Points & Miles',
    guides: [
      { id: 'ur-guide', title: 'Chase Ultimate Rewards Guide', sub: 'Best ways to earn and redeem UR' },
      { id: 'mr-guide', title: 'Amex Membership Rewards Guide', sub: 'MR transfer partners and sweet spots' },
      { id: 'hyatt-guide', title: 'World of Hyatt Guide', sub: 'Best Hyatt redemptions and earning strategies' },
      { id: 'transfer-partners', title: 'Transfer Partner Comparison', sub: 'Which programs give best value' },
    ],
  },
  {
    title: 'Best Cards For...',
    guides: [
      { id: 'best-travel', title: 'Best Travel Cards', sub: 'Top picks for frequent flyers' },
      { id: 'best-cashback', title: 'Best Cashback Cards', sub: 'Highest rates for every category' },
      { id: 'best-no-fee', title: 'Best No-Annual-Fee Cards', sub: 'Premium rewards with $0 fee' },
      { id: 'best-groceries', title: 'Best Cards for Groceries', sub: 'Maximize every supermarket trip' },
      { id: 'best-dining', title: 'Best Cards for Dining', sub: 'Top restaurant rewards' },
      { id: 'best-gas', title: 'Best Cards for Gas', sub: 'Fuel up with maximum rewards' },
      { id: 'best-business', title: 'Best Business Cards', sub: 'Top picks for business owners' },
    ],
  },
];

export default function GuidesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backBtn}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Guides</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>Strategy Playbooks</Text>
        <Text style={styles.sub}>
          Everything you need to maximize your credit card rewards.
        </Text>

        {GUIDE_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            {section.guides.map((guide) => (
              <Pressable
                key={guide.id}
                style={styles.guideRow}
                onPress={() => {
                  // TODO: navigate to individual guide pages (Phase 5)
                }}
              >
                <View style={styles.guideInfo}>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                  <Text style={styles.guideSub}>{guide.sub}</Text>
                </View>
                <Text style={styles.guideArrow}>→</Text>
              </Pressable>
            ))}
          </View>
        ))}

        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>
            📚 50+ in-depth guides coming — each covering the full strategy, timing, and pro tips.
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
  headline: { fontFamily: fontSerif.bold, fontSize: 28, color: colors.text, marginBottom: 4 },
  sub: { fontFamily: fontSans.regular, fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontFamily: fontSans.semiBold,
    fontSize: 10,
    color: colors.gold,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: 8,
  },
  guideInfo: { flex: 1 },
  guideTitle: { fontFamily: fontSans.semiBold, fontSize: 14, color: colors.text },
  guideSub: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  guideArrow: {
    fontSize: 16,
    color: colors.gold,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  comingSoon: {
    backgroundColor: colors.sidebar,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comingSoonText: {
    fontFamily: fontSans.regular,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
});
