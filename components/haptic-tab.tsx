import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';

import { Design } from '@/constants/design';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { children, style, accessibilityState, ...rest } = props;
  const selected = accessibilityState?.selected || (props as BottomTabBarButtonProps & { 'aria-selected'?: boolean })['aria-selected'];
  return (
    <PlatformPressable
      {...rest}
      accessibilityState={accessibilityState}
      style={style}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}>
      <View pointerEvents="none" style={[styles.content, selected && styles.contentSelected]}>{children}</View>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  content: { minWidth: 64, maxWidth: 88, height: 58, borderRadius: Design.dashboard.radius.round, alignItems: 'center', justifyContent: 'center' },
  contentSelected: { backgroundColor: Design.dashboard.colors.primary },
});
