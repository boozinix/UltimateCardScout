import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
      <View style={styles.iconBlock}>
        <Text style={styles.icon}>✉️</Text>
      </View>
      <Text style={styles.headline}>Check your inbox</Text>
      <Text style={styles.subline}>
        We sent a magic link to{'\n'}
        <Text style={styles.email}>{email}</Text>
      </Text>
      <Text style={styles.hint}>Tap the link in the email to sign in. It expires in 10 minutes.</Text>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backLabel}>← Use a different email</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  iconBlock: { marginBottom: 32 },
  icon: { fontSize: 64 },
  headline: { fontFamily: fontSerif.bold, fontSize: 28, color: colors.text, textAlign: 'center', marginBottom: 12 },
  subline: { fontFamily: fontSans.regular, fontSize: 16, color: colors.muted, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  email: { fontFamily: fontSans.semiBold, color: colors.text },
  hint: { fontFamily: fontSans.regular, fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 40 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  backLabel: { fontFamily: fontSans.medium, fontSize: 14, color: colors.muted },
});
