import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppInput } from '@/components/ui/app-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { configured, continueAsGuest, signInWithGoogle, signInWithTestAccount } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();

  async function handleGoogleLogin() {
    setLoading(true);
    setError(undefined);
    try {
      await signInWithGoogle();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Bitte versuche es später erneut.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTestLogin() {
    setTestLoading(true);
    setError(undefined);
    try {
      await signInWithTestAccount(username, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Bitte prüfe die Anmeldedaten.');
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.background}>
        <View pointerEvents="none" style={styles.lavenderGlow} />
        <View pointerEvents="none" style={styles.peachGlow} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}><IconSymbol name="cross.case.fill" size={31} color={Design.colors.primaryDark} /></View>
          <Text style={styles.brandName}>Fieberwache</Text>
          <Text style={styles.tagline}>Gesundheitstagebuch für deine Familie</Text>
        </View>

        <View style={styles.loginCard}>
          <View style={styles.cardCopy}>
            <Text style={styles.title}>Willkommen</Text>
            <Text style={styles.copy}>{configured ? 'Melde dich mit deinem Online-Konto an, um deine Daten geräteübergreifend zuzuordnen.' : 'Öffne die lokale Vorschau. Ein echtes Online-Konto wird verfügbar, sobald die Projektanbindung konfiguriert ist.'}</Text>
          </View>
          {error ? <View accessibilityLiveRegion="polite" style={styles.errorBanner}><Text style={styles.errorTitle}>Anmeldung nicht möglich</Text><Text style={styles.errorText}>{error}</Text></View> : null}
          <View style={styles.testAccess}>
            <Text style={styles.accessTitle}>Öffentlicher lokaler Testzugang</Text>
            <AppInput label="Benutzername" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="Benutzername" />
            <AppInput label="Passwort" value={password} onChangeText={setPassword} secureTextEntry placeholder="Passwort" />
            <AppButton label={testLoading ? 'Anmeldung läuft …' : 'Testversion öffnen'} onPress={handleTestLogin} disabled={testLoading || !username.trim() || !password} />
          </View>
          <View style={styles.divider}><View style={styles.line} /><Text style={styles.dividerText}>ODER MIT GOOGLE</Text><View style={styles.line} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Mit Google anmelden" disabled={loading || !configured} onPress={handleGoogleLogin} style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, (loading || !configured) && styles.disabled]}>
            {loading ? <ActivityIndicator color={Design.colors.ink} /> : <View style={styles.googleMark}><Text style={styles.googleLetter}>G</Text></View>}
            <Text style={styles.googleText}>{loading ? 'Google wird geöffnet …' : 'Mit Google anmelden'}</Text>
          </Pressable>
          {!configured ? <View style={styles.setupNote}><Text style={styles.setupTitle}>Google-Zugang noch nicht aktiv</Text><Text style={styles.setupText}>Es fehlen die Supabase-Projektadresse und der veröffentlichbare Schlüssel. Bis dahin sind Testkonto und Gastmodus lokale Sitzungen ohne Cloud-Synchronisierung.</Text></View> : null}
          <View style={styles.divider}><View style={styles.line} /><Text style={styles.dividerText}>LOKAL ENTWICKELN</Text><View style={styles.line} /></View>
          <AppButton label="App lokal testen" variant="soft" onPress={continueAsGuest} />
          <Text style={styles.localHint}>Testkonto und Gastmodus verwenden getrennte lokale Datenspeicher. Browserdaten können beim Löschen der Websitedaten verloren gehen.</Text>
        </View>

        <View style={styles.trustRow}>
          <View style={styles.trustItem}><View style={[styles.trustIcon, { backgroundColor: Design.colors.sage }]}><IconSymbol name="checkmark" size={17} color="#4F8373" /></View><Text style={styles.trustText}>Lokale Modi getrennt</Text></View>
          <View style={styles.trustItem}><View style={[styles.trustIcon, { backgroundColor: Design.colors.primarySoft }]}><IconSymbol name="cross.case.fill" size={17} color={Design.colors.primaryDark} /></View><Text style={styles.trustText}>Keine Diagnose</Text></View>
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Design.colors.background },
  background: { flex: 1, backgroundColor: Design.colors.background, overflow: 'hidden' },
  lavenderGlow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: Design.colors.lavender, opacity: 0.52, top: -125, right: -90 },
  peachGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: Design.colors.peach, opacity: 0.42, bottom: -115, left: -90 },
  scrollContent: { width: '100%', maxWidth: 480, alignSelf: 'center', flexGrow: 1, paddingHorizontal: 22, paddingTop: 34, paddingBottom: 30, justifyContent: 'center', gap: 26 },
  brand: { alignItems: 'center', gap: 6 },
  logo: { width: 72, height: 72, borderRadius: 27, backgroundColor: Design.colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 8, ...Design.shadow.floating },
  brandName: { color: Design.colors.ink, fontSize: 32, lineHeight: 39, fontFamily: Design.fonts.bold, letterSpacing: -1 },
  tagline: { color: Design.colors.inkSoft, fontSize: 13, lineHeight: 19, fontFamily: Design.fonts.medium },
  loginCard: { backgroundColor: Design.colors.surface, borderRadius: Design.radius.hero, padding: 22, gap: 18, borderWidth: 1, borderColor: 'rgba(72,61,77,0.045)', ...Design.shadow.card },
  cardCopy: { alignItems: 'center', gap: 5, marginBottom: 2 },
  errorBanner: { borderRadius: 18, backgroundColor: Design.colors.dangerSoft, padding: 14, gap: 3 },
  errorTitle: { color: Design.colors.danger, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  errorText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  title: { color: Design.colors.ink, fontSize: 24, lineHeight: 30, fontFamily: Design.fonts.bold, letterSpacing: -0.5 },
  copy: { color: Design.colors.inkSoft, fontSize: 13, lineHeight: 20, textAlign: 'center', fontFamily: Design.fonts.regular },
  testAccess: { gap: 13 },
  accessTitle: { color: Design.colors.ink, fontSize: 15, lineHeight: 20, fontFamily: Design.fonts.bold },
  googleButton: { minHeight: 56, borderRadius: Design.radius.medium, borderWidth: 1, borderColor: Design.colors.border, backgroundColor: Design.colors.surfaceRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 },
  googleMark: { width: 28, height: 28, borderRadius: 10, backgroundColor: Design.colors.backgroundMuted, alignItems: 'center', justifyContent: 'center' },
  googleLetter: { color: '#4285F4', fontSize: 17, fontFamily: Design.fonts.extraBold },
  googleText: { color: Design.colors.ink, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
  setupNote: { borderRadius: 18, backgroundColor: Design.colors.yellow, padding: 14, gap: 3 },
  setupTitle: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  setupText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Design.colors.border },
  dividerText: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 15, letterSpacing: 0.5, fontFamily: Design.fonts.bold },
  localHint: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, textAlign: 'center', fontFamily: Design.fonts.regular },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  trustIcon: { width: 34, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  trustText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.semiBold },
});
