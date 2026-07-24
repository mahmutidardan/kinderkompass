import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Design } from '@/constants/design';

type CardTone = 'surface' | 'lavender' | 'peach' | 'sage' | 'danger';

type Props = PropsWithChildren<{
  tone?: CardTone;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  elevated?: boolean;
}>;

const toneColors: Record<CardTone, string> = {
  surface: Design.colors.surface,
  lavender: Design.colors.primarySoft,
  peach: Design.colors.accentSoft,
  sage: Design.colors.sage,
  danger: Design.colors.dangerSoft,
};

export function AppCard({ children, tone = 'surface', style, compact = false, elevated = tone === 'surface' }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: toneColors[tone] }, compact && styles.compact, elevated && Design.shadow.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Design.radius.large, padding: Design.spacing.lg, borderWidth: 1, borderColor: 'rgba(72, 61, 77, 0.045)' },
  compact: { padding: Design.spacing.md },
});
