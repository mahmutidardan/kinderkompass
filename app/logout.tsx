import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';
import { useAuth } from '@/lib/auth';

export default function LogoutScreen() {
  const { guest, signOut, user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function confirmSignOut() {
    setLoading(true);
    try {
      await signOut();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <AppCard style={styles.card}>
          <View style={styles.icon}><IconSymbol name="person.2.fill" size={30} color={Design.colors.primaryDark} /></View>
          <View style={styles.copy}><Text style={styles.title}>{guest ? 'Testmodus beenden?' : 'Wirklich abmelden?'}</Text><Text style={styles.subtitle}>{user?.email ?? 'Lokaler Testmodus'}</Text></View>
          <Text style={styles.description}>Deine lokal gespeicherten Kinderprofile und Einträge werden dabei nicht gelöscht. Sie bleiben von anderen Konten getrennt.</Text>
          <View style={styles.notice}><IconSymbol name="checkmark" size={17} color="#4F8373" /><Text style={styles.noticeText}>Abmelden löscht keine Gesundheitsdaten.</Text></View>
          {loading ? <ActivityIndicator color={Design.colors.primary} /> : (
            <View style={styles.actions}>
              <AppButton label="Angemeldet bleiben" variant="secondary" onPress={() => router.back()} />
              <AppButton label={guest ? 'Testmodus beenden' : 'Abmelden'} variant="danger" onPress={confirmSignOut} />
            </View>
          )}
        </AppCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Design.colors.background },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center', flex: 1, justifyContent: 'center', padding: 22 },
  card: { gap: 17, alignItems: 'stretch' },
  icon: { width: 62, height: 62, borderRadius: 22, backgroundColor: Design.colors.primarySoft, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  copy: { alignItems: 'center', gap: 3 },
  title: { color: Design.colors.ink, ...Design.type.title, fontFamily: Design.fonts.bold },
  subtitle: { color: Design.colors.primaryDark, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.semiBold },
  description: { color: Design.colors.inkSoft, fontSize: 13, lineHeight: 20, textAlign: 'center', fontFamily: Design.fonts.regular },
  notice: { borderRadius: 16, backgroundColor: Design.colors.sage, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  noticeText: { color: Design.colors.sageStrong, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  actions: { gap: 9 },
});
