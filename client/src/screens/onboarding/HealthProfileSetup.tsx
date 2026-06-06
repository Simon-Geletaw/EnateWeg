import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useTheme } from '../../theme/ThemeProvider';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/colors';
import api from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

export default function HealthProfileSetup({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const setOnboarded = useAppStore(s => s.setOnboarded);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    sex: 'female',
    birth_year: '1990',
    height_cm: '165',
    current_weight_kg: '70',
    activity_level: 'light',
    primary_goal: 'lose_weight',
    fasting_type: 'orthodox',
    conditions: [] as string[]
  });

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await api.put('/users/me/health-profile', {
        ...form,
        birth_year: parseInt(form.birth_year, 10),
        height_cm: parseInt(form.height_cm, 10),
        current_weight_kg: parseInt(form.current_weight_kg, 10),
        is_vegetarian: false,
        is_vegan: false,
        allergies: []
      });

      await api.post(
        '/meal-plans/generate',
        { trigger_reason: 'initial' },
        { timeout: 60000 }
      );

      setOnboarded(true);
      navigation.replace('MainApp');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        if (e.code === 'ECONNABORTED') {
          alert('Plan generation is taking longer than expected. Please try again.');
        } else {
          const message = e.response?.data?.error?.message_en;
          alert(message || t('common.error'));
        }
      } else {
        alert(t('common.error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{t('profile.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('profile.subtitle')}</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>{t('profile.birthYear')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={form.birth_year}
            onChangeText={(text) => setForm({...form, birth_year: text})}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>{t('profile.height')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={form.height_cm}
            onChangeText={(text) => setForm({...form, height_cm: text})}
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>{t('profile.currentWeight')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={form.current_weight_kg}
            onChangeText={(text) => setForm({...form, current_weight_kg: text})}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: isSubmitting ? colors.border : Colors.primary }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? t('common.loading') : t('profile.generatePlan')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl },
  title: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.bold, marginBottom: Spacing.xs },
  subtitle: { fontSize: Typography.sizes.base, marginBottom: Spacing.xl },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, marginBottom: Spacing.xs },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.sizes.base },
  button: { padding: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.xl },
  buttonText: { color: '#fff', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }
});
