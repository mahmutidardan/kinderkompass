import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, Design.navigation.tabBarEdgeGap);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Design.colors.primary,
        tabBarInactiveTintColor: Design.colors.inkFaint,
        tabBarActiveBackgroundColor: Design.colors.primarySoft,
        tabBarStyle: {
          position: 'absolute',
          left: Math.max(12, insets.left + 12),
          right: Math.max(12, insets.right + 12),
          bottom: tabBarBottom,
          height: Design.navigation.tabBarHeight,
          paddingTop: 7,
          paddingBottom: 7,
          paddingHorizontal: 3,
          backgroundColor: Design.colors.surfaceRaised,
          borderTopWidth: 0,
          borderRadius: 27,
          shadowColor: Design.colors.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 22,
          elevation: 7,
        },
        tabBarItemStyle: { borderRadius: 18, marginHorizontal: 0 },
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
