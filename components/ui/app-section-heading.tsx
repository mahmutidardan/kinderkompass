import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InfoButton } from '@/components/info-button';
import { Design } from '@/constants/design';

type Props = {
  title: string;
  subtitle?: string;
  infoTitle?: string;
  infoText?: string;
  action?: ReactNode;
  count?: number;
};

export function AppSectionHeading({ title, subtitle, infoTitle, infoText, action, count }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {count !== undefined ? <View style={styles.count}><Text style={styles.countText}>{count}</Text></View> : null}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.actions}>
        {action}
        {infoTitle && infoText ? <InfoButton title={infoTitle} text={infoText} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Design.spacing.sm },
  copy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Design.spacing.xs },
  title: { color: Design.colors.ink, ...Design.type.section, fontFamily: Design.fonts.bold },
  subtitle: { color: Design.colors.inkSoft, ...Design.type.caption, fontFamily: Design.fonts.regular, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Design.spacing.xs },
  count: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  countText: { color: Design.colors.primaryDark, fontSize: 12, fontFamily: Design.fonts.bold },
});
