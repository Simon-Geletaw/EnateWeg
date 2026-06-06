import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/colors';
import api from '../../api/client';

function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim();
  const startsWithPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  return startsWithPlus ? `+${digitsOnly}` : digitsOnly;
}

export default function AuthScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const { setAuth, language } = useAppStore();

  const handleSendOtp = async () => {
    const normalizedPhone = normalizePhoneNumber(phone);
    if (normalizedPhone.length < 9) {
      alert('Please enter a valid phone number');
      return;
    }

    try {
      await api.post('/auth/otp/send', { phone_number: normalizedPhone });
      setPhone(normalizedPhone);
      setStep('otp');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const message = e.response?.data?.error?.message_en;
        alert(message || t('common.error'));
        return;
      }
      alert(t('common.error'));
    }
  };

  const handleVerifyOtp = async () => {
    const normalizedPhone = normalizePhoneNumber(phone);

    try {
      const res = await api.post('/auth/otp/verify', {
        phone_number: normalizedPhone,
        otp,
        full_name: name || undefined,
        preferred_lang: language
      });
      
      const { access_token, refresh_token, user } = res.data;
      setAuth(user, access_token, refresh_token);
      
      if (user.is_new) {
        navigation.replace('HealthProfileSetup');
      } else {
        navigation.replace('MainApp');
      }
    } catch (e) {
      alert(t('common.error'));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.logoCircle, { backgroundColor: Colors.primary }]}>
          <Text style={styles.logoEmoji}>🌿</Text>
        </View>

        {step === 'phone' ? (
          <>
            <Text style={[styles.title, { color: colors.text }]}>{t('auth.welcome')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('common.tagline')}</Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('auth.phoneLabel')}</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder={t('auth.phonePlaceholder')}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.md }]}>{t('auth.fullName')} (If new user)</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder={t('auth.fullNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <TouchableOpacity style={[styles.button, { backgroundColor: Colors.primary }]} onPress={handleSendOtp}>
              <Text style={styles.buttonText}>{t('auth.sendOtp')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.text }]}>{t('auth.otpTitle')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('auth.otpSubtitle')}</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, textAlign: 'center', fontSize: Typography.sizes['2xl'] }]}
                placeholder="123456"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />
            </View>

            <TouchableOpacity style={[styles.button, { backgroundColor: Colors.primary }]} onPress={handleVerifyOtp}>
              <Text style={styles.buttonText}>{t('auth.verify')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  logoCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing['2xl'] },
  logoEmoji: { fontSize: 32 },
  title: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.bold, textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, textAlign: 'center', marginBottom: Spacing['3xl'] },
  inputContainer: { width: '100%', marginBottom: Spacing.xl },
  label: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, marginBottom: Spacing.sm },
  inputBox: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, fontSize: Typography.sizes.base },
  button: { width: '100%', paddingVertical: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
});
