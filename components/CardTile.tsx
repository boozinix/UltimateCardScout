import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fontSerif, fontSans, getGradient } from '@/lib/theme';
import type { Card } from '@/lib/cardTypes';
import type { ScoreBreakdownItem } from '@/lib/scoring';
import { getMainFeaturesForTile, splitProsCons, parseAnnualFee, getCashbackDisplay } from '@/lib/cardDisplay';
import { getEstimatedBonusValueUsd } from '@/lib/pointValues';
import { impactLight, impactMedium } from '@/utils/haptics';
import { formatNumber, formatBonus } from '@/utils/formatters';

const ISSUER_ACCENT: Record<string, string> = {
  chase: '#0F2B5B',
  amex: '#2D2D2D',
  'american express': '#2D2D2D',
  'capital one': '#C8102E',
  citi: '#005BAC',
  'bank of america': '#E31837',
  'wells fargo': '#D71E28',
  discover: '#FF6600',
  barclays: '#00395D',
  'u.s. bank': '#0C2C56',
  'us bank': '#0C2C56',
};

function getIssuerAccent(issuer: string): string {
  return ISSUER_ACCENT[issuer.toLowerCase()] ?? colors.gold;
}

export interface CardTileProps {
  card: Card;
  rank?: number;
  scoreBreakdown?: ScoreBreakdownItem[];
  narrativeOneliner?: string;
  onPress?: () => void;
}

export function CardTile({ card, rank, scoreBreakdown, narrativeOneliner, onPress }: CardTileProps) {
  const [expanded, setExpanded] = useState(false);
  const [showScoreDetail, setShowScoreDetail] = useState(false);

  const accent = getIssuerAccent(card.issuer);
  const fee = parseAnnualFee(card.annual_fee);
  const bonusValue = getEstimatedBonusValueUsd(card);
  const bonusDisplay = formatBonus(card.signup_bonus, card.signup_bonus_type);
  const cashback = getCashbackDisplay(card);
  const mainFeatures = getMainFeaturesForTile(card);
  const pros = splitProsCons(card.pros);
  const cons = splitProsCons(card.cons);
  const applicationLink = (card.application_link || '').trim();
  const isBusiness = (card.card_type || '').toLowerCase() === 'business';

  const gradientKey = card.gradient_key;
  const gradientColors = getGradient(gradientKey || '');

  const handleApply = async () => {
    await impactMedium();
    if (applicationLink) {
      await Linking.openURL(applicationLink);
    }
  };

  const handleExpand = async () => {
    await impactLight();
    setExpanded((p) => !p);
  };

  return (
    <View style={styles.wrapper}>
      {/* Rank badge */}
      {rank !== undefined && (
        <View style={[styles.rankBadge, { backgroundColor: rank === 1 ? colors.gold : colors.muted }]}>
          <Text style={styles.rankText}>#{rank}</Text>
        </View>
      )}

      {/* Issuer accent strip */}
      <View style={[styles.accentStrip, { backgroundColor: accent }]} />

      {/* Header with gradient */}
      <LinearGradient
        colors={[...gradientColors] as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: accent + 'CC' }]}>
              <Text style={styles.badgeText}>{card.issuer}</Text>
            </View>
            {isBusiness && (
              <View style={[styles.badge, { backgroundColor: colors.goldBg + 'CC' }]}>
                <Text style={[styles.badgeText, { color: colors.gold }]}>Business</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.cardName} numberOfLines={2}>{card.card_name}</Text>
        {narrativeOneliner ? (
          <Text style={styles.narrative}>{narrativeOneliner.replace(/^Best for you:\s*/i, '')}</Text>
        ) : null}
      </LinearGradient>

      {/* Body */}
      <View style={styles.body}>
        {/* Bonus */}
        {bonusDisplay ? (
          <View style={styles.bonusRow}>
            <View>
              <Text style={styles.bonusLabel}>Welcome Bonus</Text>
              <Text style={styles.bonusValue}>{bonusDisplay}</Text>
            </View>
            {bonusValue > 0 && (
              <View style={styles.bonusValueChip}>
                <Text style={styles.bonusValueText}>≈ ${formatNumber(bonusValue)}</Text>
              </View>
            )}
          </View>
        ) : cashback ? (
          <View style={styles.bonusRow}>
            <View>
              <Text style={styles.bonusLabel}>Cash Back</Text>
              <Text style={styles.bonusValue}>{cashback}</Text>
            </View>
          </View>
        ) : null}

        {/* Fee row */}
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Annual fee</Text>
          <Text style={[styles.feeValue, fee === 0 && styles.feeValueFree]}>
            {fee === 0 ? 'No fee' : `$${fee}/yr`}
          </Text>
        </View>

        {/* Key features */}
        {mainFeatures.length > 0 && (
          <View style={styles.featuresSection}>
            <Text style={styles.featuresLabel}>KEY FEATURES</Text>
            {mainFeatures.slice(0, 4).map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={styles.detailsBtn}
          onPress={handleExpand}
          hitSlop={8}
        >
          <Text style={styles.detailsBtnText}>
            {expanded ? 'Hide details ▲' : 'See details ▼'}
          </Text>
        </Pressable>

        {applicationLink ? (
          <Pressable style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyBtnText}>Apply Now →</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Expanded */}
      {expanded && (
        <View style={styles.expanded}>
          {pros.length > 0 && (
            <View style={styles.expandedSection}>
              <Text style={styles.expandedLabel}>STRENGTHS</Text>
              {pros.slice(0, 3).map((p, i) => (
                <View key={i} style={styles.expandedRow}>
                  <Text style={[styles.expandedBullet, { color: colors.success }]}>✓</Text>
                  <Text style={styles.expandedText}>{p}</Text>
                </View>
              ))}
            </View>
          )}

          {cons.length > 0 && (
            <View style={styles.expandedSection}>
              <Text style={styles.expandedLabel}>WATCH-OUTS</Text>
              {cons.slice(0, 2).map((c, i) => (
                <View key={i} style={styles.expandedRow}>
                  <Text style={styles.expandedBullet}>—</Text>
                  <Text style={styles.expandedText}>{c}</Text>
                </View>
              ))}
            </View>
          )}

          {scoreBreakdown && scoreBreakdown.length > 0 && (
            <View style={styles.expandedSection}>
              <Pressable onPress={() => setShowScoreDetail((p) => !p)} hitSlop={8}>
                <Text style={styles.scoreToggle}>
                  {showScoreDetail ? '▲ Hide score details' : '▼ Why this card ranked here'}
                </Text>
              </Pressable>
              {showScoreDetail && (
                <View style={styles.scoreBreakdown}>
                  {scoreBreakdown.map((item) => (
                    <View key={item.label} style={styles.scoreRow}>
                      <Text style={[styles.scoreLabel, { color: item.good ? colors.gold : colors.muted }]}>
                        {item.good ? '✓' : '–'} {item.label}
                      </Text>
                      <Text style={styles.scoreValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  rankBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  rankText: {
    fontFamily: fontSans.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  accentStrip: {
    height: 3,
  },
  header: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTop: {
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: {
    fontFamily: fontSans.semiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  cardName: {
    fontFamily: fontSerif.bold,
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: spacing.xs,
    lineHeight: 24,
  },
  narrative: {
    fontFamily: fontSans.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
  },
  body: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  bonusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.sidebar,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bonusLabel: {
    fontFamily: fontSans.medium,
    fontSize: 11,
    color: colors.muted,
    marginBottom: 2,
  },
  bonusValue: {
    fontFamily: fontSans.bold,
    fontSize: 15,
    color: colors.text,
  },
  bonusValueChip: {
    backgroundColor: colors.goldBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  bonusValueText: {
    fontFamily: fontSans.semiBold,
    fontSize: 12,
    color: colors.gold,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.sidebar,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feeLabel: {
    fontFamily: fontSans.medium,
    fontSize: 13,
    color: colors.muted,
  },
  feeValue: {
    fontFamily: fontSans.bold,
    fontSize: 13,
    color: colors.text,
  },
  feeValueFree: {
    color: colors.success,
  },
  featuresSection: {
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  featuresLabel: {
    fontFamily: fontSans.semiBold,
    fontSize: 10,
    color: colors.gold,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    gap: 8,
  },
  featureCheck: {
    fontFamily: fontSans.bold,
    fontSize: 12,
    color: colors.gold,
    lineHeight: 18,
    flexShrink: 0,
  },
  featureText: {
    fontFamily: fontSans.regular,
    fontSize: 12,
    color: colors.muted,
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.sm,
    flexDirection: 'column',
    gap: 8,
  },
  detailsBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsBtnText: {
    fontFamily: fontSans.medium,
    fontSize: 13,
    color: colors.muted,
  },
  applyBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: fontSans.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  expanded: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.sidebar,
    padding: spacing.md,
  },
  expandedSection: {
    marginBottom: spacing.sm,
  },
  expandedLabel: {
    fontFamily: fontSans.semiBold,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginBottom: 4,
  },
  expandedBullet: {
    fontFamily: fontSans.medium,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    flexShrink: 0,
  },
  expandedText: {
    fontFamily: fontSans.regular,
    fontSize: 12,
    color: colors.muted,
    flex: 1,
    lineHeight: 18,
  },
  scoreToggle: {
    fontFamily: fontSans.medium,
    fontSize: 12,
    color: colors.muted,
    paddingVertical: 4,
  },
  scoreBreakdown: {
    marginTop: 6,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  scoreLabel: {
    fontFamily: fontSans.semiBold,
    fontSize: 11,
    minWidth: 90,
    flexShrink: 0,
  },
  scoreValue: {
    fontFamily: fontSans.regular,
    fontSize: 12,
    color: colors.muted,
    flex: 1,
  },
});
