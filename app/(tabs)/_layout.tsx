import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Design } from '@/constants/design';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarBottom = 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Design.dashboard.colors.onPrimary,
        tabBarInactiveTintColor: Design.dashboard.colors.onSurfaceVariant,
        tabBarActiveBackgroundColor: 'transparent',
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: tabBarBottom,
          height: 80 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingHorizontal: 2,
          backgroundColor: Design.colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Design.dashboard.colors.borderSoft,
          borderTopLeftRadius: Design.dashboard.radius.nav,
          borderTopRightRadius: Design.dashboard.radius.nav,
          shadowColor: Design.dashboard.colors.primary,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 24,
          elevation: 5,
        },
        tabBarItemStyle: { marginHorizontal: 3, marginVertical: 4 },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontFamily: Design.fonts.dashboardMedium, marginTop: 1, letterSpacing: 0.2 },
        tabBarIconStyle: { marginTop: 1 },
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Heute',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="dashboard" color={color} />,
        }}
      />
      <Tabs.Screen
        name="verlauf"
        options={{
          title: 'Verlauf',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="timeline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="medikamente"
        options={{
          title: 'Inventar',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="medical-services" color={color} />,
        }}
      />
      <Tabs.Screen
        name="termine"
        options={{
          title: 'Termine',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="calendar-today" color={color} />,
        }}
      />
      <Tabs.Screen
        name="familie"
        options={{
          title: 'Familie',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}
