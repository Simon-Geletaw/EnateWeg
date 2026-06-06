import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import api from '../../api/client';
import { useTheme } from '../../theme/ThemeProvider';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/colors';
import { useAppStore } from '../../store/useAppStore';

type ExerciseSuggestion = {
  name_en: string;
  category: string;
  duration_min: number;
  days: string[];
};

type LifestylePlan = {
  sleep_target_start?: string | null;
  sleep_target_end?: string | null;
  sleep_note_am?: string | null;
  sleep_note_en?: string | null;
  exercise_suggestions?: ExerciseSuggestion[] | string | null;
};

type CurrentPlanResponse = {
  plan_id: string;
  week_start: string;
  trigger_reason: string;
  lifestyle?: LifestylePlan | null;
};

function normalizeExercises(value: LifestylePlan['exercise_suggestions']): ExerciseSuggestion[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

export default function MealPlanScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppStore((s) => s.language);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [plan, setPlan] = useState<CurrentPlanResponse | null>(null);

  const fetchCurrentPlan = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.get('/meal-plans/current');
      setPlan(res.data as CurrentPlanResponse);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        const message = e.response?.data?.error?.message_en;

        if (status === 404) {
          setPlan(null);
          setErrorMessage('No active meal plan found yet.');
        } else {
          setErrorMessage(message || t('common.error'));
        }
      } else {
        setErrorMessage(t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      fetchCurrentPlan();
    }, [fetchCurrentPlan])
  );

  const lifestyle = plan?.lifestyle;
  const exercises = normalizeExercises(lifestyle?.exercise_suggestions || null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>{t('dashboard.viewPlan')}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backText, { color: Colors.primary }]}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={[styles.subtleText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
        ) : null}

        {!loading && errorMessage ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.errorText, { color: Colors.error }]}>{errorMessage}</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: Colors.primary }]}
              onPress={fetchCurrentPlan}
            >
              <Text style={[styles.secondaryButtonText, { color: Colors.primary }]}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && plan ? (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard.todaysPlan')}</Text>
              <Text style={[styles.line, { color: colors.textSecondary }]}>Plan ID: {plan.plan_id}</Text>
              <Text style={[styles.line, { color: colors.textSecondary }]}>Week Start: {new Date(plan.week_start).toDateString()}</Text>
              <Text style={[styles.line, { color: colors.textSecondary }]}>Trigger: {plan.trigger_reason}</Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('lifestyle.sleepSchedule')}</Text>
              <Text style={[styles.line, { color: colors.textSecondary }]}>
                {t('lifestyle.sleepFrom')} {lifestyle?.sleep_target_start || '--:--'} {t('lifestyle.sleepTo')} {lifestyle?.sleep_target_end || '--:--'}
              </Text>
              {(lifestyle?.sleep_note_en || lifestyle?.sleep_note_am) ? (
                <Text style={[styles.note, { color: colors.text }]}>
                  {language === 'am' ? lifestyle?.sleep_note_am || lifestyle?.sleep_note_en : lifestyle?.sleep_note_en || lifestyle?.sleep_note_am}
                </Text>
              ) : null}
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('lifestyle.exercise')}</Text>
              {exercises.length === 0 ? (
                <Text style={[styles.subtleText, { color: colors.textMuted }]}>No exercise suggestions yet.</Text>
              ) : (
                exercises.map((exercise, idx) => (
                  <View key={`${exercise.name_en}-${idx}`} style={styles.exerciseItem}>
                    <Text style={[styles.exerciseTitle, { color: colors.text }]}>{exercise.name_en}</Text>
                    <Text style={[styles.subtleText, { color: colors.textSecondary }]}>
                      {exercise.duration_min} min | {exercise.category}
                    </Text>
                    <Text style={[styles.subtleText, { color: colors.textMuted }]}>{exercise.days.join(', ')}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
  },
  backText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  line: {
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.xs,
  },
  note: {
    marginTop: Spacing.sm,
    fontSize: Typography.sizes.base,
    lineHeight: 22,
  },
  subtleText: {
    fontSize: Typography.sizes.base,
  },
  errorText: {
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.md,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  secondaryButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  exerciseItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#d1d5db',
  },
  exerciseTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
});
