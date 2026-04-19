import { useState, useMemo, useEffect } from 'react';
import {
  ScrollView, View, FlatList, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Check, ChevronDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSans, fontSerif } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { Surface } from '@/components/primitives/Surface';
import { FilterChip } from '@/components/composed/FilterChip';
import { useCards } from '@/hooks/useCards';
import { useHousehold } from '@/hooks/useHousehold';
import { useCreateApplication, detectIssuer } from '@/hooks/useApplications';
import type { Card } from '@/lib/cardTypes';
import type {
  Issuer, RewardsCurrency, ApplicationStatus, CreditBureau,
} from '@/lib/applicationTypes';
import { ISSUER_LABELS, BUREAU_LABELS, CURRENCY_LABELS } from '@/lib/applicationTypes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = Array.from({ length: 10 }, (_, i) => String(2026 - i));

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'active', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'denied', label: 'Denied' },
  { value: 'closed', label: 'Closed' },
];

const CARD_TYPE_OPTIONS = [
  { value: 'personal' as const, label: 'Personal' },
  { value: 'business' as const, label: 'Business' },
];

const BUREAU_OPTIONS: { value: CreditBureau; label: string }[] = [
  { value: 'equifax', label: 'Equifax' },
  { value: 'transunion', label: 'TransUnion' },
  { value: 'experian', label: 'Experian' },
  { value: 'equifax_transunion', label: 'EQ + TU' },
  { value: 'unknown', label: 'Unknown' },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AddApplicationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { data: cards } = useCards();
  const { data: members } = useHousehold();
  const createApp = useCreateApplication();

  // Card search
  const [search, setSearch] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showSearch, setShowSearch] = useState(true);

  // Form fields
  const [cardNameOverride, setCardNameOverride] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);

  // Auto-select first member when data loads
  useEffect(() => {
    if (members?.length && !memberId) {
      setMemberId(members[0].id);
    }
  }, [members]);
  const [monthIdx, setMonthIdx] = useState(new Date().getMonth());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [status, setStatus] = useState<ApplicationStatus>('active');
  const [bureau, setBureau] = useState<CreditBureau>('unknown');
  const [cardType, setCardType] = useState<'personal' | 'business'>('personal');
  const [annualFee, setAnnualFee] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusCurrency, setBonusCurrency] = useState<RewardsCurrency | null>(null);
  const [bonusMinSpend, setBonusMinSpend] = useState('');
  const [bonusMonths, setBonusMonths] = useState('3');
  const [notes, setNotes] = useState('');

  // Filter catalog
  const filtered = useMemo(() => {
    if (!search.trim() || !cards) return [];
    const q = search.toLowerCase();
    return cards.filter(
      (c) =>
        c.card_name?.toLowerCase().includes(q) ||
        c.issuer?.toLowerCase().includes(q),
    ).slice(0, 10);
  }, [search, cards]);

  // Strip non-digit chars for numeric prefill (handles "$95", "60,000 pts", etc.)
  const toDigits = (val: string | undefined): string => {
    if (!val) return '';
    const digits = val.replace(/[^0-9]/g, '');
    return digits || '';
  };

  // Prefill from catalog selection
  const handleSelectCard = (card: Card) => {
    setSelectedCard(card);
    setShowSearch(false);
    setSearch(card.card_name ?? '');
    // Prefill fields from catalog — strip non-digit chars for clean numeric values
    if (card.annual_fee) setAnnualFee(toDigits(card.annual_fee));
    if (card.signup_bonus) setBonusAmount(toDigits(card.signup_bonus));
    if (card.minimum_spend_amount) setBonusMinSpend(toDigits(card.minimum_spend_amount));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    const cardName = selectedCard?.card_name ?? cardNameOverride.trim();
    if (!cardName) {
      Alert.alert('Card name required', 'Search the catalog or enter a card name.');
      return;
    }

    const appliedMonth = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

    try {
      await createApp.mutateAsync({
        card_catalog_id: selectedCard?.id ?? null,
        card_name: cardName,
        card_name_override: cardNameOverride.trim() || null,
        last_four: null,
        issuer: selectedCard ? detectIssuer(selectedCard.card_name ?? selectedCard.issuer ?? '') : detectIssuer(cardNameOverride),
        card_type: cardType,
        counts_toward_5_24: cardType === 'personal',
        applied_month: appliedMonth,
        approved_at: status === 'active' ? new Date().toISOString().split('T')[0] : null,
        denied_at: status === 'denied' ? new Date().toISOString().split('T')[0] : null,
        bonus_currency: bonusCurrency,
        bonus_amount: bonusAmount ? parseInt(bonusAmount, 10) : null,
        bonus_min_spend: bonusMinSpend ? parseInt(bonusMinSpend, 10) : null,
        bonus_spend_months: bonusMonths ? parseInt(bonusMonths, 10) : null,
        bonus_spend_deadline: null,
        bonus_spend_progress: 0,
        bonus_achieved: false,
        bonus_achieved_at: null,
        annual_fee: annualFee ? parseInt(annualFee, 10) : 0,
        annual_fee_waived_year_one: false,
        annual_fee_next_due: null,
        credit_bureau: bureau,
        status,
        closed_at: null,
        product_changed_to: null,
        product_changed_at: null,
        user_card_id: null,
        household_member_id: memberId,
        notes: notes.trim() || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save application.');
    }
  };

  const s = makeStyles(colors);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 12, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text variant="body" color="accent">Cancel</Text>
          </Pressable>
          <Text variant="heading3" style={{ flex: 1, textAlign: 'center' }}>
            Add Application
          </Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Card search */}
        <View style={s.section}>
          <Text variant="label" color="muted" style={{ marginBottom: 8, fontSize: 11 }}>
            CARD
          </Text>

          {showSearch ? (
            <>
              <Input
                variant="search"
                placeholder="Search cards by name or issuer..."
                value={search}
                onChangeText={(t) => { setSearch(t); setShowSearch(true); }}
                onClear={() => setSearch('')}
                autoFocus
              />

              {filtered.length > 0 && (
                <Surface variant="card" border padding="none" radius="md" style={{ marginTop: 4 }}>
                  {filtered.map((card, i) => (
                    <Pressable
                      key={card.id}
                      onPress={() => handleSelectCard(card)}
                      style={[
                        s.searchRow,
                        i < filtered.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySmall" style={{ fontWeight: '500' }}>{card.card_name}</Text>
                        <Text variant="caption" color="muted">{card.issuer}</Text>
                      </View>
                      {card.annual_fee ? (
                        <Text variant="caption" color="muted">${card.annual_fee}/yr</Text>
                      ) : null}
                    </Pressable>
                  ))}
                </Surface>
              )}

              {search.trim().length > 2 && filtered.length === 0 && (
                <Text variant="caption" color="muted" style={{ marginTop: 8 }}>
                  Not in catalog — enter the name manually below.
                </Text>
              )}
            </>
          ) : (
            <Pressable onPress={() => setShowSearch(true)} style={s.selectedCard}>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '500' }}>
                  {selectedCard?.card_name}
                </Text>
                <Text variant="caption" color="muted">{selectedCard?.issuer}</Text>
              </View>
              <Check size={16} color={colors.success} strokeWidth={2} />
            </Pressable>
          )}

          {/* Override name if not in catalog */}
          {!selectedCard && (
            <Input
              label="Card name (if not in catalog)"
              value={cardNameOverride}
              onChangeText={setCardNameOverride}
              placeholder="e.g. Amex Platinum Business"
              containerStyle={{ marginTop: 12 }}
            />
          )}
        </View>

        {/* Household member */}
        {members && members.length > 0 && (
          <View style={s.section}>
            <Text variant="label" color="muted" style={{ marginBottom: 8, fontSize: 11 }}>
              PERSON
            </Text>
            <View style={s.chipRow}>
              {members.map((m) => (
                <FilterChip
                  key={m.id}
                  label={m.name}
                  selected={memberId === m.id}
                  onPress={() => setMemberId(m.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Applied month */}
        <View style={s.section}>
          <Text variant="label" color="muted" style={{ marginBottom: 8, fontSize: 11 }}>
            APPLIED MONTH
          </Text>
          <View style={s.chipRow}>
            {MONTHS.map((m, i) => (
              <FilterChip
                key={m}
                label={m}
                selected={monthIdx === i}
                onPress={() => setMonthIdx(i)}
              />
            ))}
          </View>
          <View style={[s.chipRow, { marginTop: 8 }]}>
            {YEARS.map((y) => (
              <FilterChip
                key={y}
                label={y}
                selected={year === y}
                onPress={() => setYear(y)}
              />
            ))}
          </View>
        </View>

        {/* Status */}
        <View style={s.section}>
          <Text variant="label" color="muted" style={{ marginBottom: 8, fontSize: 11 }}>
            STATUS
          </Text>
          <View style={s.chipRow}>
            {STATUS_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                selected={status === opt.value}
                onPress={() => setStatus(opt.value)}
              />
            ))}
          </View>
        </View>

        {/* Card type */}
        <View style={s.section}>
          <Text variant="label" color="muted" style={{ marginBottom: 8, fontSize: 11 }}>
            CARD TYPE
          </Text>
          <View style={s.chipRow}>
            {CARD_TYPE_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                selected={cardType === opt.value}
                onPress={() => setCardType(opt.value)}
              />
            ))}
          </View>
        </View>

        {/* Credit bureau */}
        <View style={s.section}>
          <Text variant="label" color="muted" style={{ marginBottom: 8, fontSize: 11 }}>
            CREDIT BUREAU
          </Text>
          <View style={s.chipRow}>
            {BUREAU_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                selected={bureau === opt.value}
                onPress={() => setBureau(opt.value)}
              />
            ))}
          </View>
        </View>

        {/* Annual fee */}
        <View style={s.section}>
          <Input
            label="Annual fee"
            variant="number"
            prefix="$"
            value={annualFee}
            onChangeText={setAnnualFee}
            placeholder="0"
          />
        </View>

        {/* Bonus section — only if approved */}
        {(status === 'active' || status === 'pending') && (
          <View style={s.section}>
            <Text variant="label" color="muted" style={{ marginBottom: 8, fontSize: 11 }}>
              SIGNUP BONUS
            </Text>
            <View style={{ gap: 12 }}>
              <Input
                label="Bonus amount (points/miles/$)"
                variant="number"
                value={bonusAmount}
                onChangeText={setBonusAmount}
                placeholder="e.g. 75000"
              />
              <Input
                label="Minimum spend"
                variant="number"
                prefix="$"
                value={bonusMinSpend}
                onChangeText={setBonusMinSpend}
                placeholder="e.g. 4000"
              />
              <Input
                label="Months to complete"
                variant="number"
                value={bonusMonths}
                onChangeText={setBonusMonths}
                placeholder="3"
              />
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={s.section}>
          <Input
            variant="multiline"
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="SUS flags, retention notes, anything..."
          />
        </View>

        {/* Save */}
        <View style={s.section}>
          <Button
            label="Save Application"
            onPress={handleSave}
            loading={createApp.isPending}
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: spacing.screen,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    section: {
      marginBottom: spacing.lg,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      minHeight: 44,
    },
    selectedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.success,
      backgroundColor: colors.successBg,
    },
  });
}
