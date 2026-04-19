import React, { useState } from 'react';
import { View, Modal, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Users, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSerif } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Surface } from '@/components/primitives/Surface';
import { DEFAULT_MEMBER_NAMES } from '@/lib/applicationTypes';
import { useCreateMember, useMarkHouseholdSetupComplete } from '@/hooks/useHousehold';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

type Step = 'choice' | 'names';

export function HouseholdSetupModal({ visible, onDismiss }: Props) {
  const { colors } = useTheme();
  const createMember = useCreateMember();
  const markComplete = useMarkHouseholdSetupComplete();

  const [step, setStep] = useState<Step>('choice');
  const [includePartner, setIncludePartner] = useState(false);
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [saving, setSaving] = useState(false);

  const handleJustMe = () => {
    setIncludePartner(false);
    setStep('names');
  };

  const handleMeAndPartner = () => {
    setIncludePartner(true);
    setStep('names');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const primaryName = name1.trim() || DEFAULT_MEMBER_NAMES[0];
      await createMember.mutateAsync({ name: primaryName, role: 'primary' });

      if (includePartner) {
        const partnerName = name2.trim() || DEFAULT_MEMBER_NAMES[1];
        await createMember.mutateAsync({ name: partnerName, role: 'partner' });
      }

      await markComplete.mutateAsync();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDismiss();
    } catch {
      // Hook errors bubble via React Query — just re-enable
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        }}
      >
        <Surface variant="card" padding="lg" radius="lg" border style={{ width: '100%', maxWidth: 400 }}>
          <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.accentBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Users size={22} color={colors.accent} strokeWidth={1.75} />
            </View>
            <Text variant="heading2" align="center">
              Who are we tracking?
            </Text>
            <Text variant="bodySmall" color="muted" align="center" style={{ marginTop: 6 }}>
              Your intelligence suite tracks applications per person.
            </Text>
          </View>

          {step === 'choice' && (
            <View style={{ gap: 10 }}>
              <Pressable
                onPress={handleJustMe}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <User size={20} color={colors.accent} strokeWidth={1.75} />
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '500' }}>Just me</Text>
                  <Text variant="caption" color="muted">Track your own applications</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={handleMeAndPartner}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <Users size={20} color={colors.accent} strokeWidth={1.75} />
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '500' }}>Me + partner</Text>
                  <Text variant="caption" color="muted">Track two people's cards</Text>
                </View>
              </Pressable>

              <Text variant="caption" color="muted" align="center" style={{ marginTop: 8 }}>
                Add more later in Settings.
              </Text>
            </View>
          )}

          {step === 'names' && (
            <View style={{ gap: 14 }}>
              <Input
                label="Your name"
                value={name1}
                onChangeText={setName1}
                placeholder={DEFAULT_MEMBER_NAMES[0]}
                autoFocus
              />

              {includePartner && (
                <Input
                  label="Partner's name"
                  value={name2}
                  onChangeText={setName2}
                  placeholder={DEFAULT_MEMBER_NAMES[1]}
                />
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <Button
                  label="Back"
                  variant="secondary"
                  onPress={() => setStep('choice')}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Get started"
                  onPress={handleSave}
                  loading={saving}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </Surface>
      </KeyboardAvoidingView>
    </Modal>
  );
}
