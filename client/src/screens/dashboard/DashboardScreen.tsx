import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/colors';
import api from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

export default function DashboardScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useAppStore(s => s.user);
  
  const [logSummary, setLogSummary] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logRes = await api.get(`/logs/daily/${today}`);
      setLogSummary(logRes.data);

      try {
        const planRes = await api.get('/meal-plans/current');
        setCurrentPlan(planRes.data);
      } catch (e) {
         // no plan found
      }
    } catch (e) {
      console.log('Error fetching dashboard data');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          {t('dashboard.greeting', { name: user?.full_name?.split(' ')[0] || 'User' })}
        </Text>

        {/* Calorie Ring Summary Placeholder */}
        {logSummary && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard.calories')}</Text>
            <View style={styles.macroRow}>
              <View style={styles.macroStat}>
                <Text style={[styles.macroValue, { color: Colors.calorieGreen }]}>{logSummary.consumed?.kcal || 0}</Text>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{t('dashboard.consumed')}</Text>
              </View>
              <View style={styles.macroStat}>
                <Text style={[styles.macroValue, { color: colors.text }]}>{logSummary.targets?.kcal || 0}</Text>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{t('dashboard.target')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity 
           style={[styles.button, { backgroundColor: Colors.accent }]}
           onPress={() => navigation.navigate('BloodSugarLog')}
        >
          <Text style={styles.buttonText}>{t('bloodSugar.logReading')}</Text>
        </TouchableOpacity>

        {/* Meal Plan */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.xl }]}>{t('dashboard.todaysPlan')}</Text>
        {currentPlan ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{color: colors.text}}>Plan ID: {currentPlan.plan_id}</Text>
            <Text style={{color: colors.textSecondary}}>Week Start: {currentPlan.week_start}</Text>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.primary }]}
              onPress={() => navigation.navigate('MealPlan')}
            >
              <Text style={styles.buttonText}>{t('dashboard.viewPlan')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={{color: colors.textMuted}}>No active plan found. Please set up your health profile.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl },
  greeting: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.bold, marginBottom: Spacing.xl },
  card: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, marginBottom: Spacing.md },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  macroStat: { alignItems: 'center' },
  macroValue: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  macroLabel: { fontSize: Typography.sizes.sm },
  button: { width: '100%', paddingVertical: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.md },
  buttonText: { color: '#fff', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
});
