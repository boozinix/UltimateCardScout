import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '🔍',
    title: 'Find Your Card',
    subtitle: 'Answer 3 questions and get ranked recommendations from 110+ credit cards. Free, forever.',
  },
  {
    icon: '📅',
    title: 'Track Your Benefits',
    subtitle: 'Never miss a credit or perk. Smart reminders before every benefit expires.',
  },
  {
    icon: '📈',
    title: 'Maximize Your ROI',
    subtitle: 'See exactly how much value you extract versus what you pay. Know if every card earns its keep.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList>(null);

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      ref.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else {
      router.replace('/(tabs)/discover');
    }
  };

  const skip = () => router.replace('/(tabs)/discover');

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 32 }]}>
      <Pressable onPress={skip} style={styles.skipBtn}>
        <Text style={styles.skipLabel}>Skip</Text>
      </Pressable>

      <FlatList
        ref={ref}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.slideIcon}>{item.icon}</Text>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <Pressable onPress={goNext} style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}>
        <Text style={styles.nextLabel}>{index === SLIDES.length - 1 ? 'Get Started' : 'Next'}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/login')} style={styles.signInBtn}>
        <Text style={styles.signInLabel}>Already have an account? Sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  skipBtn: { alignSelf: 'flex-end', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  skipLabel: { fontFamily: fontSans.medium, fontSize: 14, color: colors.muted },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, flex: 1 },
  slideIcon: { fontSize: 72, marginBottom: 32 },
  slideTitle: { fontFamily: fontSerif.bold, fontSize: 32, color: colors.text, textAlign: 'center', marginBottom: 16, letterSpacing: -0.5 },
  slideSubtitle: { fontFamily: fontSans.regular, fontSize: 16, color: colors.muted, textAlign: 'center', lineHeight: 26 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.gold, width: 24 },
  nextBtn: {
    width: width - spacing.xl * 2, height: 52, backgroundColor: colors.text,
    borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  nextLabel: { fontFamily: fontSans.semiBold, fontSize: 15, color: '#FFFFFF', letterSpacing: 0.5 },
  signInBtn: { paddingVertical: 12 },
  signInLabel: { fontFamily: fontSans.regular, fontSize: 14, color: colors.muted },
});
