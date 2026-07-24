import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

import { Design } from '@/constants/design';

type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: ReactNode;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const backgrounds: Record<ButtonVariant, string> = {
  primary: Design.colors.primaryDark,
  secondary: Design.colors.surface,
  soft: Design.colors.primarySoft,
  danger: Design.colors.danger,
  ghost: 'transparent',
};

const foregrounds: Record<ButtonVariant, string> = {
  primary: '#FFFFFF',
  secondary: Design.colors.inkSoft,
  soft: Design.colors.primaryDark,
  danger: '#FFFFFF',
  ghost: Design.colors.primary,
};

export function AppButton({ label, onPress, variant = 'primary', icon, disabled, compact, style, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: backgrounds[variant] }, compact && styles.compact, disabled && styles.disabled, pressed && styles.pressed, style]}>
      {icon}
      <Text style={[styles.label, { color: foregrounds[variant] }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: Design.size.button, borderRadius: Design.radius.medium, paddingHorizontal: Design.spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Design.spacing.xs },
  compact: { minHeight: 46, borderRadius: Design.radius.medium, paddingHorizontal: Design.spacing.md },
  label: { fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold, letterSpacing: -0.1 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
