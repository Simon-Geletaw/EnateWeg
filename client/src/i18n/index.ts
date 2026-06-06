/**
 * i18next configuration for YeEnat Weg.
 * Supports Amharic (am) and English (en).
 * Language is persisted via AsyncStorage and loaded on app start.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import am from './locales/am.json';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      en: { translation: en },
      am: { translation: am },
    },
    lng: 'en', // default — overridden by stored preference
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
