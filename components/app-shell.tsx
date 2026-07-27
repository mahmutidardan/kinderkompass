import { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Design } from '@/constants/design';
import { useStore } from '@/lib/store';
import { useConnectivity } from '@/lib/use-connectivity';

type Props = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}>;

export function AppShell({ eyebrow, title, action, children }: Props) {
  const { storageError, syncStatus } = useStore();
  const connected = useConnectivity();
  const insets = useSafeAreaInsets();
  const bottomInsetOffset = Math.max(0, insets.bottom - Design.navigation.tabBarEdgeGap);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Design.navigation.screenContentBottomPadding + bottomInsetOffset },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
          </View>
          {action}
        </View>
        <View style={styles.pageBody}>
          {storageError || syncStatus === 'error' ? (
            <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
              <Text style={styles.errorTitle}>{storageError ? 'Speicherung unterbrochen' : 'Synchronisierung pausiert'}</Text>
              <Text style={styles.errorText}>{storageError ?? 'Die Daten bleiben auf diesem Gerät und werden erneut synchronisiert, sobald der Kontozugang verfügbar ist.'}</Text>
            </View>
          ) : null}
          {connected === false ? (
            <View accessibilityLiveRegion="polite" style={styles.offlineBanner}>
              <Text style={styles.offlineTitle}>Offline-Modus</Text>
              <Text style={styles.offlineText}>Du kannst weiter dokumentieren. Online-Konten werden synchronisiert, sobald wieder eine Verbindung besteht.</Text>
            </View>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Design.colors.background },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingTop: 0 },
  header: { minHeight: 66, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, backgroundColor: 'rgba(250,246,240,0.96)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Design.colors.border },
  pageBody: { paddingHorizontal: 20, paddingTop: 20, gap: 24 },
  headerText: { flex: 1, gap: 4 },
  eyebrow: { color: Design.colors.primary, fontSize: 11, lineHeight: 15, fontFamily: Design.fonts.bold, letterSpacing: 0.25 },
  title: { color: Design.colors.ink, fontSize: 24, lineHeight: 29, letterSpacing: -0.55, fontFamily: Design.fonts.bold },
  errorBanner: { borderRadius: Design.radius.medium, backgroundColor: Design.colors.dangerSoft, padding: 14, gap: 3, borderWidth: 1, borderColor: '#E9C7C1' },
  errorTitle: { color: Design.colors.danger, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  errorText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  offlineBanner: { borderRadius: Design.radius.medium, backgroundColor: Design.colors.yellow, padding: 14, gap: 3 },
  offlineTitle: { color: Design.colors.gold, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  offlineText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
});
