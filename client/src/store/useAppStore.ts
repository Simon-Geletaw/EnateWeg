/**
 * Global app store using Zustand.
 * Manages: auth state, theme preference, language preference.
 * Persisted to AsyncStorage for language & theme settings.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

// ─── Types ─────────────────────────────────────────────────

interface User {
  id: string;
  full_name: string;
  phone_number: string;
  preferred_lang: 'am' | 'en';
  is_new: boolean;
}

interface AppState {
  // ─── Auth ──────────────────────────────────────────────
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;      // has completed health profile

  // ─── Preferences ──────────────────────────────────────
  language: 'am' | 'en';
  isDarkMode: boolean;
  hasChosenLanguage: boolean; // first-time language selection

  // ─── Actions ──────────────────────────────────────────
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setOnboarded: (value: boolean) => void;
  setLanguage: (lang: 'am' | 'en') => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  setDarkMode: (value: boolean) => Promise<void>;
  loadPersistedState: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // ─── Initial State ─────────────────────────────────────
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isOnboarded: false,

  language: 'en',
  isDarkMode: false,
  hasChosenLanguage: false,

  // ─── Auth Actions ──────────────────────────────────────

  setAuth: (user, accessToken, refreshToken) => {
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
    // Persist tokens
    AsyncStorage.setItem('accessToken', accessToken);
    AsyncStorage.setItem('refreshToken', refreshToken);
    AsyncStorage.setItem('user', JSON.stringify(user));
  },

  clearAuth: () => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isOnboarded: false,
    });
    AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
  },

  setOnboarded: (value) => {
    set({ isOnboarded: value });
    AsyncStorage.setItem('isOnboarded', JSON.stringify(value));
  },

  // ─── Preference Actions ────────────────────────────────

  setLanguage: async (lang) => {
    i18n.changeLanguage(lang);
    set({ language: lang, hasChosenLanguage: true });
    await AsyncStorage.setItem('language', lang);
    await AsyncStorage.setItem('hasChosenLanguage', 'true');
  },

  toggleDarkMode: async () => {
    const newValue = !get().isDarkMode;
    set({ isDarkMode: newValue });
    await AsyncStorage.setItem('isDarkMode', JSON.stringify(newValue));
  },

  setDarkMode: async (value) => {
    set({ isDarkMode: value });
    await AsyncStorage.setItem('isDarkMode', JSON.stringify(value));
  },

  // ─── Hydrate from AsyncStorage ─────────────────────────

  loadPersistedState: async () => {
    try {
      const [
        language,
        hasChosenLanguage,
        isDarkMode,
        accessToken,
        refreshToken,
        userJson,
        isOnboarded,
      ] = await AsyncStorage.multiGet([
        'language',
        'hasChosenLanguage',
        'isDarkMode',
        'accessToken',
        'refreshToken',
        'user',
        'isOnboarded',
      ]);

      const lang = (language[1] as 'am' | 'en') || 'en';
      i18n.changeLanguage(lang);

      set({
        language: lang,
        hasChosenLanguage: hasChosenLanguage[1] === 'true',
        isDarkMode: isDarkMode[1] === 'true',
        accessToken: accessToken[1] || null,
        refreshToken: refreshToken[1] || null,
        user: userJson[1] ? JSON.parse(userJson[1]) : null,
        isAuthenticated: !!accessToken[1],
        isOnboarded: isOnboarded[1] === 'true',
      });
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  },
}));
