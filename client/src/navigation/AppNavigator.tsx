/**
 * Navigation configuration for YeEnat Weg.
 * Handles the flow: Language Select → Auth → Main App (Dashboard, Settings).
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../theme/ThemeProvider';
import { Colors, Typography } from '../theme/colors';

// Screens
import LanguageSelectScreen from '../screens/onboarding/LanguageSelectScreen';
import HealthProfileSetup from '../screens/onboarding/HealthProfileSetup';
import AuthScreen from '../screens/auth/AuthScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import MealPlanScreen from '../screens/mealplan/MealPlanScreen';

// ─── Stack & Tab Navigators ─────────────────────────────

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Tab Icon Component ─────────────────────────────────

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <Text style={{ fontSize: focused ? 24 : 20 }}>{emoji}</Text>
    </View>
  );
}

// ─── Main Tab Navigator ─────────────────────────────────

function MainTabs() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: Typography.sizes.xs,
          fontWeight: Typography.weights.semibold,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('dashboard.title'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings.title'),
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ─────────────────────────────────────

import BloodSugarLogScreen from '../screens/logs/BloodSugarLogScreen';

// ... (other code)

export default function AppNavigator() {
  const { colors } = useTheme();
  const hasChosenLanguage = useAppStore((s) => s.hasChosenLanguage);

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: Colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: Colors.accent,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}
    >
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
        initialRouteName={hasChosenLanguage ? 'Auth' : 'LanguageSelect'}
      >
        <RootStack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
        <RootStack.Screen name="Auth" component={AuthScreen} />
        <RootStack.Screen name="HealthProfileSetup" component={HealthProfileSetup} />
        <RootStack.Screen name="MainApp" component={MainTabs} />
        <RootStack.Screen name="BloodSugarLog" component={BloodSugarLogScreen} />
        <RootStack.Screen name="MealPlan" component={MealPlanScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconFocused: {
    transform: [{ scale: 1.1 }],
  },
});
