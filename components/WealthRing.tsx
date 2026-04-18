import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fontSerif, fontSans } from '@/lib/theme';

export type RingSegment = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  total: number;
  segments: RingSegment[];
  size?: number;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function WealthRing({ total, segments, size = 160 }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [total]);

  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  if (total === 0 || segments.length === 0) {
    return (
      <View style={[styles.container, { width: size, height: size + 40 }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx} cy={cy} r={radius}
            stroke={colors.border} strokeWidth={strokeWidth}
            fill="none"
          />
        </Svg>
        <Text style={styles.emptyLabel}>$0</Text>
      </View>
    );
  }

  let startAngle = -90;
  const arcs = segments.map(seg => {
    const fraction = seg.value / total;
    const sweep = fraction * 360;
    const arc = { ...seg, startAngle, sweep, fraction };
    startAngle += sweep;
    return arc;
  });

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size}>
        {arcs.map((arc, i) => {
          const dashArray = `${arc.fraction * circumference} ${circumference}`;
          const rotation = arc.startAngle;
          return (
            <Circle
              key={i}
              cx={cx} cy={cy} r={radius}
              stroke={arc.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={dashArray}
              strokeDashoffset={0}
              strokeLinecap="butt"
              transform={`rotate(${rotation} ${cx} ${cy})`}
            />
          );
        })}
      </Svg>

      {/* Center label */}
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={styles.totalValue}>${total.toLocaleString()}</Text>
        <Text style={styles.totalLabel}>annual value</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {segments.map((seg, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendLabel}>{seg.label}</Text>
            <Text style={styles.legendValue}>${seg.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  container: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
  },
  emptyLabel: { position: 'absolute', fontFamily: fontSerif.bold, fontSize: 18, color: colors.muted },
  totalValue: { fontFamily: fontSerif.bold, fontSize: 22, color: colors.text, letterSpacing: -0.5 },
  totalLabel: { fontFamily: fontSans.regular, fontSize: 10, color: colors.muted, letterSpacing: 0.5, marginTop: 2 },
  legend: { marginTop: 16, gap: 8, width: '100%' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontFamily: fontSans.regular, fontSize: 12, color: colors.text },
  legendValue: { fontFamily: fontSans.medium, fontSize: 12, color: colors.gold },
});
