/**
 * YeEnat Weg — App Entry Point
 * Initializes i18n, loads persisted state, and renders the app with
 * ThemeProvider and NavigationContainer.
 */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Initialize i18n before any component renders
import './src/i18n';

import { ThemeProvider } from './src/theme/ThemeProvider';
import { useAppStore } from './src/store/useAppStore';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme/colors';

function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const loadPersistedState = useAppStore((s) => s.loadPersistedState);
  const isDarkMode = useAppStore((s) => s.isDarkMode);

  useEffect(() => {
    async function prepare() {
      try {
        await loadPersistedState();
      } catch (e) {
        console.warn('Failed to load persisted state:', e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
});
