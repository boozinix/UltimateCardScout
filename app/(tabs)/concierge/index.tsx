import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageSquare, Send, Settings, ChevronRight } from 'lucide-react-native';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { useFeatureGate } from '@/hooks/useSubscription';

type Message = { id: string; role: 'user' | 'assistant'; text: string };

const FREE_SUGGESTIONS = [
  'Which card is best for travel rewards?',
  'Compare Chase Sapphire vs Amex Gold',
  'What is the best no-annual-fee card?',
  'Explain transfer partners for Chase UR',
];

const PRO_SUGGESTIONS = [
  'Which of my cards should I use for dining?',
  'When does my Amex credit reset?',
  'Am I getting value from my annual fees?',
  'Help me plan my next signup bonus',
];

export default function ConciergeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isPro = useFeatureGate('dashboard');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: isPro
        ? 'Good afternoon. I have full visibility into your vault. Ask me anything about your cards, your benefits, or your next move.'
        : 'Let us find your perfect card. Ask me anything about credit cards, rewards, or strategy.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const suggestions = isPro ? PRO_SUGGESTIONS : FREE_SUGGESTIONS;

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    // Placeholder response — wire to supabase/functions/scrape-card or a chat edge function
    await new Promise(r => setTimeout(r, 900));
    const reply: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: isPro
        ? 'Your vault data is being analyzed. Connect your Supabase Edge Function to enable live responses.'
        : 'This is a placeholder response. Connect your Supabase Edge Function at `supabase/functions/scrape-card` to enable live AI responses.',
    };
    setMessages(prev => [...prev, reply]);
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MessageSquare size={18} color={colors.accent} strokeWidth={1.75} />
          <Text style={styles.headerTitle}>Concierge</Text>
          {isPro && <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>}
        </View>
        <Pressable onPress={() => router.push('/(tabs)/settings' as any)} style={styles.settingsBtn}>
          <Settings size={18} color={colors.muted} strokeWidth={1.75} />
        </Pressable>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.map(msg => (
          <View key={msg.id} style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
            <Text style={[styles.bubbleText, msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
              {msg.text}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={styles.bubbleAssistant}>
            <ActivityIndicator size="small" color={colors.muted} />
          </View>
        )}
      </ScrollView>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestions}
          contentContainerStyle={styles.suggestionsContent}
        >
          {suggestions.map((s, i) => (
            <Pressable key={i} style={styles.suggestionPill} onPress={() => send(s)}>
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Pro upsell for free users */}
      {!isPro && (
        <Pressable style={styles.proTeaser} onPress={() => router.push('/(tabs)/portfolio' as any)}>
          <Text style={styles.proTeaserText}>Upgrade to ask about your own cards and benefits</Text>
          <ChevronRight size={14} color={colors.accent} strokeWidth={2} />
        </Pressable>
      )}

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything about credit cards…"
          placeholderTextColor={colors.muted}
          returnKeyType="send"
          onSubmitEditing={() => send(input)}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={!input.trim() || loading}
        >
          <Send size={16} color={!input.trim() || loading ? colors.muted : '#fff'} strokeWidth={2} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screen, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontFamily: fontSans.semiBold, fontSize: 16, color: colors.text },
  proBadge: {
    backgroundColor: colors.accentBg, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.full,
  },
  proBadgeText: { fontFamily: fontSans.medium, fontSize: 9, color: colors.accent, letterSpacing: 0.5 },
  settingsBtn: { padding: 4 },
  messages: { flex: 1 },
  messagesContent: { padding: spacing.screen, gap: 10, paddingTop: 16 },
  bubble: {
    maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.lg,
  },
  bubbleUser: {
    alignSelf: 'flex-end', backgroundColor: colors.accent,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { fontFamily: fontSans.regular, color: '#fff' },
  bubbleTextAssistant: { fontFamily: fontSans.regular, color: colors.text },
  suggestions: { maxHeight: 44, flexGrow: 0 },
  suggestionsContent: { paddingHorizontal: spacing.screen, gap: 8, paddingVertical: 8 },
  suggestionPill: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
  },
  suggestionText: { fontFamily: fontSans.regular, fontSize: 12, color: colors.text, whiteSpace: 'nowrap' } as any,
  proTeaser: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: spacing.screen, marginBottom: 8,
    backgroundColor: colors.accentBg, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14,
  },
  proTeaserText: { fontFamily: fontSans.regular, fontSize: 12, color: colors.accent },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: spacing.screen, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: fontSans.regular, fontSize: 14, color: colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.border },
});
