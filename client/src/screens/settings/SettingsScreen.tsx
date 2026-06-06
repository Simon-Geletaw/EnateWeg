/**
 * Settings screen — functional language toggle and dark mode toggle.
 * This is the working reference for the i18n + theme system.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/colors';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { language, setLanguage, toggleDarkMode } = useAppStore();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Text style={[styles.title, { color: colors.text }]}>
          {t('settings.title')}
        </Text>

        {/* Language Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('settings.language')}
          </Text>

          <View style={styles.langRow}>
            <TouchableOpacity
              onPress={() => setLanguage('am')}
              style={[
                styles.langButton,
                {
                  backgroundColor: language === 'am' ? Colors.primary : colors.inputBg,
                  borderColor: language === 'am' ? Colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.langFlag}>🇪🇹</Text>
              <Text
                style={[
                  styles.langLabel,
                  { color: language === 'am' ? '#fff' : colors.text },
                ]}
              >
                አማርኛ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLanguage('en')}
              style={[
                styles.langButton,
                {
                  backgroundColor: language === 'en' ? Colors.primary : colors.inputBg,
                  borderColor: language === 'en' ? Colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={styles.langFlag}>🌍</Text>
              <Text
                style={[
                  styles.langLabel,
                  { color: language === 'en' ? '#fff' : colors.text },
                ]}
              >
                English
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dark Mode Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={{ fontSize: 24 }}>{isDark ? '🌙' : '☀️'}</Text>
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {t('settings.darkMode')}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleDarkMode}
              trackColor={{ false: colors.border, true: Colors.primaryLight }}
              thumbColor={isDark ? Colors.secondary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* App Info */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
              {t('settings.version')}
            </Text>
            <Text style={[styles.versionText, { color: colors.textMuted }]}>
              1.0.0 MVP
            </Text>
          </View>
        </View>

        {/* Branding Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerBrand, { color: Colors.primary }]}>
            🌿 YeEnat Weg
          </Text>
          <Text style={[styles.footerTagline, { color: colors.textMuted }]}>
            {t('common.tagline')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingTop: Spacing['2xl'],
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xl,
  },
  section: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.md,
  },
  langRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  langButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  langFlag: {
    fontSize: 20,
  },
  langLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  versionText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.regular,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing['3xl'],
    paddingTop: Spacing.xl,
  },
  footerBrand: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  footerTagline: {
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.xs,
  },
});
