import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, fontSerif, fontSans } from '@/lib/theme';
import { wizardQuestions, type WizardOption } from '@/lib/quiz';
import { impactLight, impactMedium } from '@/utils/haptics';
import type { Answers } from '@/lib/scoring';
import { capture, Events } from '@/lib/analytics';

export default function QuizScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);

  useEffect(() => { capture(Events.QUIZ_START, { entry_point: 'discover' }); }, []);
  const [answers, setAnswers] = useState<Answers>({});
  // For ranked question: track order of taps
  const [rankedOrder, setRankedOrder] = useState<string[]>([]);

  const question = wizardQuestions[step];
  const total = wizardQuestions.length;
  const isRanked = question.type === 'ranked';
  const isLast = step === total - 1;

  const canAdvance = isRanked
    ? rankedOrder.length === question.options.length
    : answers[question.id] !== undefined;

  const handleRankedTap = async (value: string) => {
    await impactLight();
    setRankedOrder((prev) => {
      if (prev.includes(value)) {
        // Deselect — remove from list
        return prev.filter((v) => v !== value);
      }
      return [...prev, value];
    });
  };

  const handleSingleSelect = async (value: string) => {
    await impactLight();
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    // Auto-advance on single select after brief delay
    setTimeout(() => {
      advanceStep({ ...answers, [question.id]: value });
    }, 220);
  };

  const advanceStep = (currentAnswers: Answers) => {
    if (step < total - 1) {
      setStep((s) => s + 1);
      setRankedOrder([]);
    } else {
      goToResults(currentAnswers);
    }
  };

  const handleNext = async () => {
    await impactMedium();
    const newAnswers: Answers = { ...answers };
    if (isRanked) {
      newAnswers[question.id === 'primary_goal' ? 'primary_goal_ranked' : question.id] = rankedOrder;
    }
    setAnswers(newAnswers);
    advanceStep(newAnswers);
  };

  const goToResults = (finalAnswers: Answers) => {
    capture(Events.QUIZ_COMPLETE, { num_answers: Object.keys(finalAnswers).length });
    const encoded = encodeURIComponent(JSON.stringify(finalAnswers));
    router.push(`/(tabs)/discover/results?answers=${encoded}`);
  };

  const getRankNum = (value: string) => {
    const idx = rankedOrder.indexOf(value);
    return idx >= 0 ? idx + 1 : null;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => (step > 0 ? setStep((s) => s - 1) : router.back())} hitSlop={12}>
          <Text style={styles.backBtn}>← Back</Text>
        </Pressable>
        <Text style={styles.progress}>{step + 1} of {total}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / total) * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Question */}
        <Text style={styles.questionNum}>Question {step + 1}</Text>
        <Text style={styles.questionText}>{question.question}</Text>
        {question.helper ? (
          <Text style={styles.helperText}>{question.helper}</Text>
        ) : null}
        {isRanked && (
          <Text style={styles.rankHint}>
            Tap in order of priority (1st most important → 4th)
          </Text>
        )}

        {/* Options */}
        <View style={styles.options}>
          {question.options.map((opt: WizardOption) => {
            if (isRanked) {
              const rank = getRankNum(opt.value);
              const selected = rank !== null;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => handleRankedTap(opt.value)}
                >
                  <View style={[styles.rankCircle, selected && styles.rankCircleSelected]}>
                    {selected ? (
                      <Text style={styles.rankCircleText}>{rank}</Text>
                    ) : (
                      <Text style={styles.rankCircleEmpty}>·</Text>
                    )}
                  </View>
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            }

            const selected = answers[question.id] === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => handleSingleSelect(opt.value)}
              >
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Next button (only shown for ranked question) */}
        {isRanked && (
          <Pressable
            style={[styles.nextBtn, !canAdvance && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canAdvance}
          >
            <Text style={styles.nextBtnText}>
              {isLast ? 'See My Results →' : 'Next →'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    fontFamily: fontSans.medium,
    fontSize: 15,
    color: colors.gold,
  },
  progress: {
    fontFamily: fontSans.medium,
    fontSize: 13,
    color: colors.muted,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: spacing.screen,
    borderRadius: 2,
    marginBottom: spacing.lg,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  questionNum: {
    fontFamily: fontSans.semiBold,
    fontSize: 10,
    color: colors.gold,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  questionText: {
    fontFamily: fontSerif.bold,
    fontSize: 24,
    color: colors.text,
    lineHeight: 32,
    marginBottom: spacing.sm,
  },
  helperText: {
    fontFamily: fontSans.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  rankHint: {
    fontFamily: fontSans.regular,
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  options: {
    gap: 10,
    marginBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.gold,
    backgroundColor: colors.goldBg,
  },
  optionLabel: {
    fontFamily: fontSans.medium,
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  optionLabelSelected: {
    color: colors.gold,
    fontFamily: fontSans.bold,
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sidebar,
  },
  rankCircleSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  rankCircleText: {
    fontFamily: fontSans.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  rankCircleEmpty: {
    fontSize: 16,
    color: colors.muted,
    lineHeight: 20,
  },
  nextBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: colors.border,
  },
  nextBtnText: {
    fontFamily: fontSans.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
