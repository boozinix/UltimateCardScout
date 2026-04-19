import { useState, useMemo } from 'react';
import {
  ScrollView, View, Pressable, StyleSheet,
  Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import {
  ArrowLeft, Upload, FileText, AlertTriangle, CheckCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, radius, fontSans } from '@/lib/theme';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Surface } from '@/components/primitives/Surface';
import { Badge } from '@/components/primitives/Badge';
import { EmptyState } from '@/components/composed/EmptyState';
import { parseChurningCSV, type ColumnMap, type ParseResult } from '@/lib/csvParser';
import { useCreateApplication, useApplications, detectIssuer } from '@/hooks/useApplications';
import { useHousehold } from '@/hooks/useHousehold';

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'pick' | 'map' | 'preview' | 'importing' | 'done';

interface ColumnOption {
  key: keyof ColumnMap;
  label: string;
  required: boolean;
}

const COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'card_name', label: 'Card name', required: true },
  { key: 'applied_month', label: 'Date applied', required: true },
  { key: 'person', label: 'Person', required: false },
  { key: 'issuer', label: 'Issuer', required: false },
  { key: 'card_type', label: 'Card type (personal/biz)', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'bonus_amount', label: 'Bonus amount', required: false },
  { key: 'bonus_min_spend', label: 'Min spend', required: false },
  { key: 'annual_fee', label: 'Annual fee', required: false },
  { key: 'notes', label: 'Notes', required: false },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CsvImportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { data: members } = useHousehold();
  const { data: existingApps } = useApplications();
  const createApp = useCreateApplication();

  const [step, setStep] = useState<Step>('pick');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [imported, setImported] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Pick file
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      let csvText: string;

      if (Platform.OS === 'web') {
        const res = await fetch(file.uri);
        csvText = await res.text();
      } else {
        const FileSystem = await import('expo-file-system');
        csvText = await FileSystem.readAsStringAsync(file.uri);
      }

      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (!parsed.data?.length || !parsed.meta?.fields?.length) {
        Alert.alert('Empty file', 'The CSV file has no data rows.');
        return;
      }

      setHeaders(parsed.meta.fields);
      setRows(parsed.data);

      // Auto-map obvious columns
      const autoMap: Record<string, string> = {};
      for (const h of parsed.meta.fields) {
        const lower = h.toLowerCase().replace(/[^a-z]/g, '');
        if (lower.includes('card') && lower.includes('name')) autoMap.card_name = h;
        else if (lower.includes('date') || lower.includes('applied') || lower.includes('month')) autoMap.applied_month = h;
        else if (lower === 'person' || lower === 'member' || lower === 'who') autoMap.person = h;
        else if (lower === 'issuer' || lower === 'bank') autoMap.issuer = h;
        else if (lower === 'type' || lower.includes('cardtype')) autoMap.card_type = h;
        else if (lower === 'status') autoMap.status = h;
        else if (lower.includes('bonus') && !lower.includes('spend')) autoMap.bonus_amount = h;
        else if (lower.includes('spend') || lower.includes('minspend')) autoMap.bonus_min_spend = h;
        else if (lower.includes('fee')) autoMap.annual_fee = h;
        else if (lower === 'notes' || lower === 'note') autoMap.notes = h;
      }
      setColumnMap(autoMap);
      setStep('map');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not read file.');
    }
  };

  // Parse preview
  const handlePreview = () => {
    const map: ColumnMap = {
      card_name: columnMap.card_name ?? '',
      applied_month: columnMap.applied_month ?? '',
    };
    for (const opt of COLUMN_OPTIONS) {
      if (columnMap[opt.key]) {
        (map as any)[opt.key] = columnMap[opt.key];
      }
    }

    if (!map.card_name || !map.applied_month) {
      Alert.alert('Required columns', 'Map at least "Card name" and "Date applied".');
      return;
    }

    const memberNames = members?.map((m) => m.name) ?? [];
    const result = parseChurningCSV(rows, map, memberNames);
    setParseResult(result);
    setStep('preview');
  };

  // Import
  const handleImport = async () => {
    if (!parseResult) return;
    setStep('importing');
    let count = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Build set of existing app fingerprints for duplicate detection
    const existingKeys = new Set(
      (existingApps ?? []).map((a) =>
        `${a.card_name.toLowerCase()}|${a.applied_month}|${a.household_member_id ?? ''}`,
      ),
    );

    for (const p of parseResult.parsed) {
      try {
        const memberId = members?.find(
          (m) => m.name.toLowerCase() === p.household_member_name?.toLowerCase(),
        )?.id ?? members?.[0]?.id ?? null;

        // Skip if duplicate already exists in DB
        const fingerprint = `${p.card_name.toLowerCase()}|${p.applied_month}|${memberId ?? ''}`;
        if (existingKeys.has(fingerprint)) {
          skipped++;
          continue;
        }
        existingKeys.add(fingerprint); // prevent dupes within same import batch

        await createApp.mutateAsync({
          card_catalog_id: null,
          card_name: p.card_name,
          card_name_override: null,
          last_four: p.last_four,
          issuer: p.issuer,
          card_type: p.card_type,
          counts_toward_5_24: p.counts_toward_5_24,
          applied_month: p.applied_month,
          approved_at: p.status === 'active' ? null : null,
          denied_at: null,
          bonus_currency: p.bonus_currency,
          bonus_amount: p.bonus_amount,
          bonus_min_spend: p.bonus_min_spend,
          bonus_spend_months: p.bonus_spend_months,
          bonus_spend_deadline: null,
          bonus_spend_progress: 0,
          bonus_achieved: false,
          bonus_achieved_at: null,
          annual_fee: p.annual_fee,
          annual_fee_waived_year_one: false,
          annual_fee_next_due: null,
          credit_bureau: (p.credit_bureau as any) ?? null,
          status: p.status,
          closed_at: null,
          product_changed_to: null,
          product_changed_at: null,
          user_card_id: null,
          household_member_id: memberId,
          notes: p.notes,
        });
        count++;
      } catch (e: any) {
        errors.push(`${p.card_name}: ${e.message}`);
      }
    }

    if (skipped > 0) {
      errors.unshift(`${skipped} duplicate(s) skipped — already in your ledger.`);
    }
    setImported(count);
    setImportErrors(errors);
    setStep('done');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const s = makeStyles(colors);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text variant="heading3" style={{ flex: 1, textAlign: 'center' }}>
          Import CSV
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step: Pick file */}
      {step === 'pick' && (
        <EmptyState
          icon={Upload}
          title="Import your spreadsheet"
          description="Select a CSV file from your churning tracker. We'll map the columns and preview before importing."
          action={{ label: 'Choose CSV file', onPress: handlePickFile }}
        />
      )}

      {/* Step: Column mapping */}
      {step === 'map' && (
        <View style={{ gap: spacing.md }}>
          <Surface variant="inset" padding="md" radius="md">
            <Text variant="bodySmall" color="muted">
              Found {rows.length} rows and {headers.length} columns.
              Map your columns below.
            </Text>
          </Surface>

          {COLUMN_OPTIONS.map((opt) => (
            <View key={opt.key}>
              <Text variant="label" color="muted" style={{ marginBottom: 6, fontSize: 11 }}>
                {opt.label} {opt.required && '*'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <Pressable
                  onPress={() => {
                    const copy = { ...columnMap };
                    delete copy[opt.key];
                    setColumnMap(copy);
                  }}
                  style={[
                    s.mapChip,
                    !columnMap[opt.key] && s.mapChipSelected,
                    { backgroundColor: !columnMap[opt.key] ? colors.accentBg : colors.surface },
                  ]}
                >
                  <Text variant="caption" style={{ color: !columnMap[opt.key] ? colors.accent : colors.muted }}>
                    — skip —
                  </Text>
                </Pressable>
                {headers.map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => setColumnMap({ ...columnMap, [opt.key]: h })}
                    style={[
                      s.mapChip,
                      columnMap[opt.key] === h && s.mapChipSelected,
                      { backgroundColor: columnMap[opt.key] === h ? colors.accentBg : colors.surface },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{ color: columnMap[opt.key] === h ? colors.accent : colors.text }}
                    >
                      {h}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <Button label="Preview import" onPress={handlePreview} fullWidth size="lg" />
        </View>
      )}

      {/* Step: Preview */}
      {step === 'preview' && parseResult && (
        <View style={{ gap: spacing.md }}>
          {/* Summary */}
          <Surface variant="card" border padding="md" radius="md">
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="heading2" color="accent">{parseResult.parsed.length}</Text>
                <Text variant="caption" color="muted">Ready</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="heading2" color="danger">{parseResult.errors.length}</Text>
                <Text variant="caption" color="muted">Errors</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text variant="heading2" color="warning">{parseResult.warnings.length}</Text>
                <Text variant="caption" color="muted">Warnings</Text>
              </View>
            </View>
          </Surface>

          {/* Preview rows */}
          <Text variant="heading3">Preview (first 5)</Text>
          {parseResult.parsed.slice(0, 5).map((p, i) => (
            <Surface key={i} variant="card" border padding="sm" radius="md">
              <Text variant="bodySmall" style={{ fontWeight: '500' }}>{p.card_name}</Text>
              <Text variant="caption" color="muted">
                {p.issuer} · {p.applied_month} · {p.status}
                {p.household_member_name && ` · ${p.household_member_name}`}
              </Text>
            </Surface>
          ))}

          {/* Errors */}
          {parseResult.errors.length > 0 && (
            <View>
              <Text variant="heading3" color="danger" style={{ marginBottom: 8 }}>
                Errors (will be skipped)
              </Text>
              {parseResult.errors.map((e, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                  <AlertTriangle size={14} color={colors.urgent} strokeWidth={2} />
                  <Text variant="caption" color="danger">
                    Row {e.row}: {e.message}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Warnings */}
          {parseResult.warnings.length > 0 && (
            <View>
              <Text variant="heading3" color="warning" style={{ marginBottom: 8 }}>
                Warnings
              </Text>
              {parseResult.warnings.map((w, i) => (
                <Text key={i} variant="caption" color="warning" style={{ marginBottom: 2 }}>
                  {w}
                </Text>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              label="Back"
              variant="secondary"
              onPress={() => setStep('map')}
              style={{ flex: 1 }}
            />
            <Button
              label={`Import ${parseResult.parsed.length} applications`}
              onPress={handleImport}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}

      {/* Step: Importing */}
      {step === 'importing' && (
        <EmptyState
          icon={FileText}
          title="Importing..."
          description="Adding your applications. This may take a moment."
        />
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <View style={{ gap: spacing.md }}>
          <EmptyState
            icon={CheckCircle}
            title={`${imported} applications imported`}
            description={
              importErrors.length > 0
                ? `${importErrors.length} failed. See errors below.`
                : 'All applications added to your ledger.'
            }
            action={{
              label: 'View ledger',
              onPress: () => router.replace('/(tabs)/intelligence/ledger' as any),
            }}
          />

          {importErrors.length > 0 && (
            <View>
              <Text variant="heading3" color="danger" style={{ marginBottom: 8 }}>
                Import errors
              </Text>
              {importErrors.map((e, i) => (
                <Text key={i} variant="caption" color="danger" style={{ marginBottom: 2 }}>
                  {e}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
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
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: spacing.lg,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapChip: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapChipSelected: {
      borderColor: colors.accent,
    },
  });
}
