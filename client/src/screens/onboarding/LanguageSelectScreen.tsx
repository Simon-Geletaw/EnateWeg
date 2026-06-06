/**
 * LanguageSelectScreen — The very first screen shown to new users.
 * Large, clear buttons for Amharic and English.
 * Follows the 3-tap max rule (one tap to select, done).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppStore } from '../../store/useAppStore';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/colors';

const { width } = Dimensions.get('window');

export default function LanguageSelectScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const setLanguage = useAppStore((s) => s.setLanguage);
  const [selected, setSelected] = useState<'am' | 'en' | null>(null);
  const scaleAm = React.useRef(new Animated.Value(1)).current;
  const scaleEn = React.useRef(new Animated.Value(1)).current;

  const handleSelect = async (lang: 'am' | 'en') => {
    const scale = lang === 'am' ? scaleAm : scaleEn;
    
    // Micro-animation: pulse the selected card
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    setSelected(lang);
    await setLanguage(lang);

    // Short delay for visual feedback before navigating
    setTimeout(() => {
      navigation.replace('Auth');
    }, 400);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* App Logo / Branding */}
      <View style={styles.header}>
        <View style={[styles.logoCircle, { backgroundColor: Colors.primary }]}>
          <Text style={styles.logoEmoji}>🌿</Text>
        </View>
        <Text style={[styles.appName, { color: Colors.primary }]}>
          YeEnat Weg
        </Text>
        <Text style={[styles.appNameAm, { color: Colors.secondary }]}>
          የእናት ወግ
        </Text>
        <View style={[styles.divider, { backgroundColor: Colors.secondary }]} />
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Choose your language • ቋንቋዎን ይምረጡ
        </Text>
      </View>

      {/* Language Cards */}
      <View style={styles.cardsContainer}>
        {/* Amharic */}
        <Animated.View style={{ transform: [{ scale: scaleAm }] }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSelect('am')}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: selected === 'am' ? Colors.primary : colors.border,
                borderWidth: selected === 'am' ? 3 : 1,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Text style={styles.flagEmoji}>🇪🇹</Text>
            <Text style={[styles.langTitle, { color: colors.text }]}>
              አማርኛ
            </Text>
            <Text style={[styles.langSubtitle, { color: colors.textSecondary }]}>
              Amharic
            </Text>
            {selected === 'am' && (
              <View style={[styles.checkBadge, { backgroundColor: Colors.primary }]}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* English */}
        <Animated.View style={{ transform: [{ scale: scaleEn }] }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSelect('en')}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: selected === 'en' ? Colors.primary : colors.border,
                borderWidth: selected === 'en' ? 3 : 1,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Text style={styles.flagEmoji}>🌍</Text>
            <Text style={[styles.langTitle, { color: colors.text }]}>
              English
            </Text>
            <Text style={[styles.langSubtitle, { color: colors.textSecondary }]}>
              እንግሊዝኛ
            </Text>
            {selected === 'en' && (
              <View style={[styles.checkBadge, { backgroundColor: Colors.primary }]}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          You can change this later in Settings
        </Text>
        <Text style={[styles.footerTextAm, { color: colors.textMuted }]}>
          ይህን በኋላ በቅንብሮች ውስጥ መቀየር ይችላሉ
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.extrabold,
    letterSpacing: 0.5,
  },
  appNameAm: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    marginTop: Spacing.xs,
  },
  divider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginVertical: Spacing.lg,
  },
  tagline: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing['3xl'],
  },
  card: {
    width: (width - Spacing.xl * 2 - Spacing.base) / 2,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  flagEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  langTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  langSubtitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
  },
  footerTextAm: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    marginTop: Spacing.xs,
  },
});
