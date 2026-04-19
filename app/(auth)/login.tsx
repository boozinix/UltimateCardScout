import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Alert, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { capture, Events } from '@/lib/analytics';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
});

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert('Error', 'No identity token received from Apple.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) throw error;
      if (data.user) capture(Events.SIGNUP, { auth_method: 'apple' });
      router.replace('/(tabs)/discover' as any);
    } catch (err: unknown) {
      const code = (err as any)?.code;
      if (code === 'ERR_REQUEST_CANCELED') return; // user cancelled
      const msg = err instanceof Error ? err.message : 'Please try again.';
      Alert.alert('Apple Sign In failed', msg);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) {
        Alert.alert('Error', 'No ID token received from Google.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;
      if (data.user) capture(Events.SIGNUP, { auth_method: 'google' });
      router.replace('/(tabs)/discover' as any);
    } catch (err: unknown) {
      const code = (err as any)?.code;
      if (code === 'SIGN_IN_CANCELLED') return; // user cancelled
      const msg = err instanceof Error ? err.message : 'Please try again.';
      Alert.alert('Google Sign In failed', msg);
    }
  };

  const handleSendLink = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Check your email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const redirectTo =
        Platform.OS === 'web'
          ? process.env.EXPO_PUBLIC_APP_URL ?? 'http://localhost:8081'
          : Linking.createURL('/');

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) throw error;
      capture(Events.SIGNUP, { auth_method: 'magic_link' });
      router.push({ pathname: '/(auth)/check-email', params: { email: trimmed } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      Alert.alert('Something went wrong', msg);
    } finally {
      setLoading(false);
    }
  };

  const showApple = Platform.OS === 'ios';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandBlock}>
          <View style={styles.goldRule} />
          <Text style={styles.brandName}>CardScout</Text>
          <Text style={styles.brandTagline}>DISCOVER · TRACK · OPTIMIZE</Text>
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.headline}>
            Your cards carry{'\n'}privileges.{'\n'}
            <Text style={styles.headlineItalic}>We ensure you{'\n'}collect them.</Text>
          </Text>
        </View>

        <Text style={styles.subline}>
          Find the right card, track every benefit, never leave money on the table.
        </Text>

        {/* Social login buttons */}
        <View style={styles.socialSection}>
          {showApple && (
            <Pressable
              onPress={handleAppleSignIn}
              style={({ pressed }) => [styles.appleBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.appleBtnText}>CONTINUE WITH APPLE</Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleGoogleSignIn}
            style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.googleBtnText}>CONTINUE WITH GOOGLE</Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign in with email</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Magic link fallback */}
        <View style={styles.form}>
          <Text style={styles.inputLabel}>YOUR EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="name@email.com"
            placeholderTextColor={colors.border}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="go"
            onSubmitEditing={handleSendLink}
            editable={!loading}
          />
          <Pressable
            onPress={handleSendLink}
            disabled={loading}
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }, loading && { opacity: 0.5 }]}
          >
            <Text style={styles.submitLabel}>{loading ? 'SENDING...' : 'SEND MAGIC LINK'}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.replace('/(tabs)/discover' as any)} style={styles.guestBtn}>
          <Text style={styles.guestLabel}>Explore without an account →</Text>
        </Pressable>

        <Text style={styles.legal}>By continuing, you agree to our Terms of Service and Privacy Policy.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, paddingHorizontal: spacing.xl },
  brandBlock: { marginBottom: 48 },
  goldRule: { width: 40, height: 3, backgroundColor: colors.gold, borderRadius: 2, marginBottom: 16 },
  brandName: { fontFamily: fontSerif.bold, fontSize: 24, color: colors.text, letterSpacing: -0.5, marginBottom: 4 },
  brandTagline: { fontFamily: fontSans.medium, fontSize: 9, color: colors.muted, letterSpacing: 2 },
  heroSection: { marginBottom: 20 },
  headline: { fontFamily: fontSerif.bold, fontSize: 34, color: colors.text, letterSpacing: -0.8, lineHeight: 42 },
  headlineItalic: { fontFamily: fontSerif.boldItalic, color: colors.gold },
  subline: { fontFamily: fontSans.regular, fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: 32 },
  socialSection: { gap: 12, marginBottom: 24 },
  appleBtn: {
    height: 52, backgroundColor: '#000000', borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  appleBtnText: { fontFamily: fontSans.semiBold, fontSize: 12, color: '#FFFFFF', letterSpacing: 1.5 },
  googleBtn: {
    height: 52, backgroundColor: colors.surface, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  googleBtnText: { fontFamily: fontSans.semiBold, fontSize: 12, color: colors.text, letterSpacing: 1.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: fontSans.regular, fontSize: 12, color: colors.muted },
  form: { marginBottom: 40 },
  inputLabel: { fontFamily: fontSans.medium, fontSize: 10, color: colors.muted, letterSpacing: 1.2, marginBottom: 8 },
  input: {
    height: 56, backgroundColor: colors.surface, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18,
    fontSize: 16, fontFamily: fontSans.regular, color: colors.text, marginBottom: 16,
  },
  submitBtn: {
    height: 52, backgroundColor: colors.text, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  submitLabel: { fontFamily: fontSans.semiBold, fontSize: 12, color: '#FFFFFF', letterSpacing: 1.5 },
  legal: { fontFamily: fontSans.regular, fontSize: 11, color: colors.muted, textAlign: 'center', lineHeight: 16 },
  guestBtn: { alignItems: 'center', paddingVertical: 16, marginBottom: 16 },
  guestLabel: { fontFamily: fontSans.medium, fontSize: 13, color: colors.accent },
});
