/**
 * DEV ONLY — floating layout toggle button.
 * Cycles: Auto → Mobile → Desktop → Auto
 * Invisible in production builds (__DEV__ === false).
 */
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { useBreakpointOverride, ForcedMode } from '@/contexts/BreakpointContext';

const CYCLE: ForcedMode[] = ['auto', 'mobile', 'desktop'];

const LABELS: Record<ForcedMode, string> = {
  auto:    '⊙ AUTO',
  mobile:  '📱 MOB',
  desktop: '🖥  DSK',
};

const BG: Record<ForcedMode, string> = {
  auto:    '#374151',
  mobile:  '#1B4FD8',
  desktop: '#166534',
};

export default function DevToggle() {
  if (!__DEV__) return null;

  const { forcedMode, setForcedMode } = useBreakpointOverride();

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(forcedMode) + 1) % CYCLE.length];
    setForcedMode(next);
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Pressable
        onPress={cycle}
        style={[styles.pill, { backgroundColor: BG[forcedMode] }]}
      >
        <Text style={styles.label}>{LABELS[forcedMode]}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    zIndex: 9999,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
