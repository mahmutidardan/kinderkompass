import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarBottom = 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Design.colors.primary,
        tabBarInactiveTintColor: Design.colors.inkFaint,
        tabBarActiveBackgroundColor: Design.colors.primarySoft,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: tabBarBottom,
          height: Design.navigation.tabBarHeight + insets.bottom,
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 7),
          paddingHorizontal: 7,
          backgroundColor: Design.colors.surfaceRaised,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Design.colors.border,
          borderRadius: 0,
          shadowColor: Design.colors.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 18,
          elevation: 5,
        },
        tabBarItemStyle: { borderRadius: 16, marginHorizontal: 0 },
        tabBarLabelStyle: { fontSize: 10, lineHeight: 14, fontFamily: Design.fonts.bold, marginTop: 1, letterSpacing: -0.35 },
        tabBarIconStyle: { marginTop: 1 },
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Heute',
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="verlauf"
        options={{
          title: 'Verlauf',
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="chart.xyaxis.line" color={color} />,
        }}
      />
      <Tabs.Screen
        name="medikamente"
        options={{
          title: 'Inventar',
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="cross.case.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="termine"
        options={{
          title: 'Termine',
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="familie"
        options={{
          title: 'Familie',
          tabBarIcon: ({ color }) => <IconSymbol size={23} name="person.2.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
