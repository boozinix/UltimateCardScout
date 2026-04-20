import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { radius, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { getGradient } from '@/lib/theme';

type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

interface Props {
  cardName: string;
  issuer: string;
  gradientKey?: string;
  network?: CardNetwork;
  lastFour?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: { width: 64, height: 40 },
  md: { width: 128, height: 81 },
  lg: { width: 240, height: 151 },
};

const NETWORK_LABELS: Record<CardNetwork, string> = {
  visa: 'VISA',
  mastercard: 'MC',
  amex: 'AMEX',
  discover: 'DISC',
  unknown: '',
};

/** Detect network from card name / issuer */
function detectNetwork(cardName: string, issuer: string): CardNetwork {
  const name = `${cardName} ${issuer}`.toLowerCase();
  if (name.includes('amex') || name.includes('american express')) return 'amex';
  if (name.includes('discover')) return 'discover';
  if (name.includes('mastercard') || name.includes('world elite')) return 'mastercard';
  return 'visa';
}

/**
 * Credit card art with issuer gradient, network badge, and optional last four.
 * Standard card ratio: 1.586:1 (85.6mm × 53.98mm).
 */
export function CardArt({
  cardName,
  issuer,
  gradientKey,
  network: networkProp,
  lastFour,
  size = 'md',
}: Props) {
  const { colors } = useTheme();
  const dims = SIZE_MAP[size];
  const gradientColors = getGradient(gradientKey ?? 'default') as string[];
  const network = networkProp ?? detectNetwork(cardName, issuer);
  const networkLabel = NETWORK_LABELS[network];

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  return (
    <View
      style={[
        styles.card,
        {
          width: dims.width,
          height: dims.height,
          borderRadius: isSmall ? 4 : isLarge ? 12 : 8,
        },
      ]}
      accessibilityLabel={`${cardName} card`}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: isSmall ? 4 : isLarge ? 12 : 8 }]}
      />

      {/* Chip (medium + large only) */}
      {!isSmall && (
        <View style={[styles.chip, isLarge && styles.chipLg]}>
          <View style={[styles.chipInner, isLarge && styles.chipInnerLg]} />
        </View>
      )}

      {/* Issuer name */}
      <Text
        variant="caption"
        numberOfLines={1}
        style={[
          styles.issuerLabel,
          {
            fontSize: isSmall ? 6 : isLarge ? 13 : 9,
            top: isSmall ? 4 : isLarge ? 14 : 8,
            left: isSmall ? 6 : isLarge ? 16 : 10,
            right: isSmall ? 6 : isLarge ? 16 : 10,
          },
        ]}
      >
        {issuer?.toUpperCase() ?? ''}
      </Text>

      {/* Last four */}
      {lastFour && !isSmall && (
        <Text
          variant="mono"
          style={[
            styles.lastFour,
            {
              fontSize: isLarge ? 16 : 11,
              bottom: isLarge ? 32 : 18,
              left: isLarge ? 16 : 10,
            },
          ]}
        >
          •••• {lastFour}
        </Text>
      )}

      {/* Network badge */}
      {networkLabel && (
        <Text
          variant="caption"
          style={[
            styles.networkBadge,
            {
              fontSize: isSmall ? 5 : isLarge ? 10 : 7,
              bottom: isSmall ? 3 : isLarge ? 12 : 6,
              right: isSmall ? 4 : isLarge ? 14 : 8,
            },
          ]}
        >
          {networkLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
    }),
  },
  chip: {
    position: 'absolute',
    top: 22,
    left: 10,
    width: 18,
    height: 14,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLg: {
    top: 40,
    left: 16,
    width: 30,
    height: 22,
    borderRadius: 3,
  },
  chipInner: {
    width: 10,
    height: 8,
    borderRadius: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  chipInnerLg: {
    width: 16,
    height: 12,
    borderRadius: 2,
  },
  issuerLabel: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fontSans.bold,
    letterSpacing: 1,
  },
  lastFour: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2,
  },
  networkBadge: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fontSans.bold,
    letterSpacing: 0.5,
  },
});
