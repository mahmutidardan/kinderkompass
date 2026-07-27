import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { authConfigured, supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const GUEST_KEY = '@fieberwache/auth/guest';

export type AuthUser = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
};

type AuthContextValue = {
  ready: boolean;
  authenticated: boolean;
  guest: boolean;
  localMode?: 'guest' | 'preview';
  configured: boolean;
  user?: AuthUser;
  storageScope: string;
  signInWithGoogle: () => Promise<void>;
  signInWithTestAccount: (username: string, password: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapUser(session?: Session | null): AuthUser | undefined {
  const user = session?.user;
  if (!user) return undefined;
  return {
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Elternkonto',
    email: user.email,
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
  };
}

function getNativeAuthCode(url: string) {
  try {
    return new URL(url).searchParams.get('code');
  } catch {
    return undefined;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [localMode, setLocalMode] = useState<'guest' | 'preview'>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      AsyncStorage.getItem(GUEST_KEY),
      supabase?.auth.getSession() ?? Promise.resolve({ data: { session: null } }),
    ]).then(([storedGuest, sessionResult]) => {
      if (!active) return;
      setLocalMode(storedGuest === 'preview' ? 'preview' : storedGuest === 'guest' || storedGuest === 'true' ? 'guest' : undefined);
      setSession(sessionResult.data.session);
      setReady(true);
    }).catch(() => {
      if (active) setReady(true);
    });

    const subscription = supabase?.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        setLocalMode(undefined);
        AsyncStorage.removeItem(GUEST_KEY).catch(() => undefined);
      }
    }).data.subscription;

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    authenticated: Boolean(session || localMode),
    guest: Boolean(localMode),
    localMode,
    configured: authConfigured,
    user: mapUser(session),
    storageScope: session?.user.id ? `google-${session.user.id}` : localMode === 'preview' ? 'local-preview-admin' : 'local-guest',
    signInWithGoogle: async () => {
      if (!supabase) throw new Error('Google-Anmeldung ist noch nicht konfiguriert.');
      const redirectTo = Platform.OS === 'web'
        ? window.location.origin
        : Linking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
      });
      if (error) throw error;
      if (Platform.OS !== 'web' && data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success') {
          const code = getNativeAuthCode(result.url);
          if (!code) throw new Error('Die Google-Anmeldung konnte nicht abgeschlossen werden.');
          const exchange = await supabase.auth.exchangeCodeForSession(code);
          if (exchange.error) throw exchange.error;
        }
      }
    },
    signInWithTestAccount: async (username, password) => {
      const normalizedUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (!normalizedUsername || !password) throw new Error('Bitte Benutzername und Passwort eingeben.');
      if (!supabase) {
        if (normalizedUsername !== 'admin' || password !== 'admin2027') {
          throw new Error('Benutzername oder Passwort ist nicht korrekt.');
        }
        await AsyncStorage.setItem(GUEST_KEY, 'preview');
        setLocalMode('preview');
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: `${normalizedUsername}@preview.fieberwache.invalid`,
        password,
      });
      if (error) throw new Error('Benutzername oder Passwort ist nicht korrekt.');
    },
    continueAsGuest: async () => {
      await AsyncStorage.setItem(GUEST_KEY, 'guest');
      setLocalMode('guest');
    },
    signOut: async () => {
      if (session && supabase) await supabase.auth.signOut({ scope: 'local' });
      await AsyncStorage.removeItem(GUEST_KEY);
      setSession(null);
      setLocalMode(undefined);
    },
  }), [localMode, ready, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
