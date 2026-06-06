import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/colors';
import api from '../../api/client';

export default function BloodSugarLogScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  
  const [value, setValue] = useState('');
  const [context, setContext] = useState<'fasting' | 'pre_meal' | 'post_meal' | 'random'>('fasting');

  const handleSubmit = async () => {
    try {
      const res = await api.post('/health-readings', {
        reading_type: 'blood_sugar',
        value_mg_dl: parseFloat(value),
        context
      });

      if (res.data.plan_updated) {
        alert(res.data.message_en); // Display warning that plan was updated
      } else {
        alert('Recorded successfully');
      }
      navigation.goBack();
    } catch (e) {
      alert(t('common.error'));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{t('bloodSugar.logReading')}</Text>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>{t('bloodSugar.value')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            placeholder="e.g. 110"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>{t('bloodSugar.context')}</Text>
          {['fasting', 'pre_meal', 'post_meal', 'random'].map(ctx => (
            <TouchableOpacity 
              key={ctx} 
              style={[
                styles.contextBtn, 
                { backgroundColor: context === ctx ? Colors.primary : colors.inputBg }
              ]}
              onPress={() => setContext(ctx as any)}
            >
              <Text style={{ color: context === ctx ? '#fff' : colors.text }}>
                {t(`bloodSugar.${ctx.replace('_', '')}` as any) || ctx}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.button, { backgroundColor: Colors.accent }]} onPress={handleSubmit}>
          <Text style={styles.buttonText}>{t('bloodSugar.submit')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, { backgroundColor: 'transparent' }]} onPress={() => navigation.goBack()}>
           <Text style={[styles.buttonText, {color: Colors.primary}]}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xl },
  title: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.bold, marginBottom: Spacing.xl },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, marginBottom: Spacing.sm },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.sizes.base },
  contextBtn: { padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.xs, alignItems: 'center' },
  button: { width: '100%', paddingVertical: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.md },
  buttonText: { color: '#fff', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
});
