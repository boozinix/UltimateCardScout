import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { impactLight } from '@/utils/haptics';

const TOOLS = [
  {
    id: 'browser',
    title: 'Card Browser',
    sub: 'Filter and compare all 110 cards',
    emoji: '🗂️',
    route: '/(tabs)/tools/browser',
  },
  {
    id: 'value-calc',
    title: 'Card Value Calculator',
    sub: 'Break-even your annual fee with benefits',
    emoji: '🧮',
    route: '/(tabs)/tools/value-calculator',
  },
  {
    id: 'ur-calc',
    title: 'Chase UR Calculator',
    sub: 'Portal vs transfer partner redemptions',
    emoji: '🏦',
    route: '/(tabs)/tools/ur-calculator',
  },
  {
    id: 'mr-calc',
    title: 'Amex MR Calculator',
    sub: 'Estimate your Membership Rewards value',
    emoji: '💳',
    route: '/(tabs)/tools/mr-calculator',
  },
  {
    id: 'portfolio-expander',
    title: 'Portfolio Expander',
    sub: "Tell us what you have — we'll find the gaps",
    emoji: '📈',
    route: '/(tabs)/tools/portfolio-expander',
  },
  {
    id: 'bonus-sequencer',
    title: 'Bonus Sequencer',
    sub: 'Optimize bonus order given your spend budget',
    emoji: '⚡',
    route: '/(tabs)/tools/bonus-sequencer',
  },
  {
    id: 'guides',
    title: 'Guides',
    sub: 'Strategy playbooks, bank rules, and more',
    emoji: '📚',
    route: '/(tabs)/tools/guides',
  },
];

export default function ToolsHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handlePress = async (route: string) => {
    await impactLight();
    router.push(route as never);
  };

  return (
    <ScrollView
      style={styles.bg}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
    >
      <Text style={styles.eyebrow}>CARDSCOUT</Text>
      <Text style={styles.heading}>Tools</Text>
      <Text style={styles.sub}>Research tools to maximize every card in your wallet.</Text>

      <View style={styles.grid}>
        {TOOLS.map((tool) => (
          <Pressable
            key={tool.id}
            style={styles.card}
            onPress={() => handlePress(tool.route)}
          >
            <Text style={styles.cardEmoji}>{tool.emoji}</Text>
            <Text style={styles.cardTitle}>{tool.title}</Text>
            <Text style={styles.cardSub} numberOfLines={2}>{tool.sub}</Text>
            <Text style={styles.cardArrow}>→</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl },
  eyebrow: {
    fontFamily: fontSans.semiBold,
    fontSize: 10,
    color: colors.gold,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  heading: {
    fontFamily: fontSerif.bold,
    fontSize: 32,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sub: {
    fontFamily: fontSans.regular,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  grid: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    position: 'relative',
  },
  cardEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontFamily: fontSans.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  cardSub: {
    fontFamily: fontSans.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginRight: 28,
  },
  cardArrow: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    fontSize: 18,
    color: colors.gold,
    fontWeight: '700',
  },
});
