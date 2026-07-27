import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
} from '@expo-google-fonts/nunito-sans';
import { Literata_600SemiBold, Literata_700Bold } from '@expo-google-fonts/literata';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import 'react-native-reanimated';

import { Design } from '@/constants/design';
import { AuthProvider, useAuth } from '@/lib/auth';
import { StoreProvider, useStore } from '@/lib/store';
import { configureNotifications } from '@/lib/notifications';
import { SubscriptionProvider, useSubscription } from '@/lib/subscription';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    configureNotifications().catch(() => undefined);
  }, []);

  return (
    <AuthProvider>
      <ScopedApp />
    </AuthProvider>
  );
}

function ScopedApp() {
  const { ready, storageScope } = useAuth();
  if (!ready) return <LoadingState label="Zugang wird vorbereitet" />;
  return <SubscriptionProvider key={storageScope} storageScope={storageScope}><StoreProvider storageScope={storageScope}><AppNavigator /></StoreProvider></SubscriptionProvider>;
}

function AppNavigator() {
  const { hydrated } = useStore();
  const { authenticated } = useAuth();
  const subscription = useSubscription();
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    Literata_600SemiBold,
    Literata_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: Design.colors.background, primary: Design.colors.primary },
  };

  if (!hydrated || !fontsLoaded || !subscription.ready) {
    return <LoadingState label="Familientagebuch wird geladen" />;
  }

  return (
    <ThemeProvider value={theme}>
      <Stack>
        <Stack.Protected guard={!authenticated}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={authenticated}>
          <Stack.Screen name="paywall" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={authenticated && subscription.hasAccess}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="logout" options={{ presentation: 'modal', headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.loading}>
      <View style={styles.loadingCard}>
        <View style={styles.loadingMark}><ActivityIndicator color={Design.colors.primaryDark} /></View>
        <Text style={styles.loadingTitle}>Fieberwache</Text>
        <Text style={styles.loadingText}>{label} …</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Design.colors.background },
  loadingCard: { minWidth: 230, borderRadius: Design.radius.large, backgroundColor: Design.colors.surface, padding: 24, alignItems: 'center', gap: 7, ...Design.shadow.card },
  loadingMark: { width: 48, height: 48, borderRadius: 18, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  loadingTitle: { color: Design.colors.ink, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  loadingText: { color: Design.colors.inkSoft, fontSize: 13, lineHeight: 18 },
});
