import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export type FamilyRole = 'owner' | 'guest';

export type SharedFamily = {
  id: string;
  name: string;
  ownerUserId: string;
  role: FamilyRole;
};

export type FamilyMember = {
  userId: string;
  email: string;
  displayName?: string;
  role: FamilyRole;
};

export type FamilyInvite = {
  id: string;
  familyId: string;
  familyName: string;
  email: string;
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string;
};

type InviteDelivery = 'email-sent' | 'existing-account';

type FamilySharingContextValue = {
  ready: boolean;
  enabled: boolean;
  error?: string;
  families: SharedFamily[];
  activeFamily?: SharedFamily;
  members: FamilyMember[];
  invites: FamilyInvite[];
  pendingInvites: FamilyInvite[];
  canManageFamily: boolean;
  setActiveFamily: (familyId: string) => Promise<void>;
  inviteMember: (email: string) => Promise<InviteDelivery>;
  revokeInvite: (inviteId: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const ACTIVE_FAMILY_KEY = '@fieberwache/active-family/v1';
const FamilySharingContext = createContext<FamilySharingContextValue | undefined>(undefined);

export function FamilySharingProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const enabled = Boolean(supabase && user?.id && user.email);
  const [ready, setReady] = useState(!enabled);
  const [error, setError] = useState<string>();
  const [families, setFamilies] = useState<SharedFamily[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string>();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [pendingInvites, setPendingInvites] = useState<FamilyInvite[]>([]);

  const loadFamilies = useCallback(async (preferredFamilyId?: string) => {
    if (!supabase || !user?.id || !user.email) {
      setFamilies([]);
      setMembers([]);
      setInvites([]);
      setPendingInvites([]);
      setActiveFamilyId(undefined);
      setReady(true);
      return;
    }

    setError(undefined);
    const ensure = await supabase.rpc('ensure_personal_family', { requested_name: `${user.name || 'Meine'} Familie` });
    if (ensure.error) throw ensure.error;

    const membershipResult = await supabase
      .from('family_members')
      .select('family_id, role, families!inner(id, name, owner_user_id)')
      .eq('user_id', user.id);
    if (membershipResult.error) throw membershipResult.error;

    const nextFamilies = (membershipResult.data ?? []).map((row) => {
      const family = row.families as unknown as { id: string; name: string; owner_user_id: string };
      return { id: family.id, name: family.name, ownerUserId: family.owner_user_id, role: row.role as FamilyRole };
    });
    const storedFamilyId = preferredFamilyId ?? await AsyncStorage.getItem(`${ACTIVE_FAMILY_KEY}/${user.id}`) ?? undefined;
    const nextActiveFamilyId = nextFamilies.some((family) => family.id === storedFamilyId) ? storedFamilyId : nextFamilies[0]?.id;
    setFamilies(nextFamilies);
    setActiveFamilyId(nextActiveFamilyId);
    if (nextActiveFamilyId) await AsyncStorage.setItem(`${ACTIVE_FAMILY_KEY}/${user.id}`, nextActiveFamilyId);

    const pendingResult = await supabase
      .from('family_invites')
      .select('id, family_id, email, status, expires_at, families!inner(name)')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());
    if (pendingResult.error) throw pendingResult.error;
    setPendingInvites((pendingResult.data ?? [])
      .filter((row) => row.email.toLowerCase() === user.email?.toLowerCase())
      .map((row) => ({ id: row.id, familyId: row.family_id, familyName: (row.families as unknown as { name: string }).name, email: row.email, status: row.status as FamilyInvite['status'], expiresAt: row.expires_at })));

    if (!nextActiveFamilyId) {
      setMembers([]);
      setInvites([]);
      return;
    }

    const [memberResult, inviteResult] = await Promise.all([
      supabase.from('family_members').select('user_id, email, display_name, role').eq('family_id', nextActiveFamilyId).order('joined_at'),
      supabase.from('family_invites').select('id, family_id, email, status, expires_at, families!inner(name)').eq('family_id', nextActiveFamilyId).eq('status', 'pending').order('created_at', { ascending: false }),
    ]);
    if (memberResult.error) throw memberResult.error;
    if (inviteResult.error) throw inviteResult.error;
    setMembers((memberResult.data ?? []).map((row) => ({ userId: row.user_id, email: row.email, displayName: row.display_name ?? undefined, role: row.role as FamilyRole })));
    setInvites((inviteResult.data ?? []).map((row) => ({ id: row.id, familyId: row.family_id, familyName: (row.families as unknown as { name: string }).name, email: row.email, status: row.status as FamilyInvite['status'], expiresAt: row.expires_at })));
  }, [user?.email, user?.id, user?.name]);

  useEffect(() => {
    let active = true;
    setReady(!enabled);
    loadFamilies()
      .catch(() => { if (active) setError('Der gemeinsame Familienbereich konnte nicht geladen werden.'); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [enabled, loadFamilies]);

  const activeFamily = families.find((family) => family.id === activeFamilyId);

  const value = useMemo<FamilySharingContextValue>(() => ({
    ready,
    enabled,
    error,
    families,
    activeFamily,
    members,
    invites,
    pendingInvites,
    canManageFamily: activeFamily?.role === 'owner',
    setActiveFamily: async (familyId) => {
      if (!families.some((family) => family.id === familyId)) return;
      setReady(false);
      try { await loadFamilies(familyId); } finally { setReady(true); }
    },
    inviteMember: async (email) => {
      if (!supabase || !activeFamily || activeFamily.role !== 'owner') throw new Error('Nur der Familienbesitzer kann Personen einladen.');
      const result = await supabase.functions.invoke('invite-family-member', { body: { familyId: activeFamily.id, email, redirectTo: Linking.createURL('familie') } });
      if (result.error || result.data?.error) throw new Error(result.data?.error ?? 'Die Einladung konnte nicht gesendet werden.');
      await loadFamilies(activeFamily.id);
      return result.data.delivery as InviteDelivery;
    },
    revokeInvite: async (inviteId) => {
      if (!supabase || !activeFamily || activeFamily.role !== 'owner') throw new Error('Keine Berechtigung.');
      const result = await supabase.from('family_invites').update({ status: 'revoked' }).eq('id', inviteId);
      if (result.error) throw result.error;
      await loadFamilies(activeFamily.id);
    },
    removeMember: async (userId) => {
      if (!supabase || !activeFamily || activeFamily.role !== 'owner') throw new Error('Keine Berechtigung.');
      const result = await supabase.from('family_members').delete().eq('family_id', activeFamily.id).eq('user_id', userId).eq('role', 'guest');
      if (result.error) throw result.error;
      await loadFamilies(activeFamily.id);
    },
    acceptInvite: async (inviteId) => {
      if (!supabase) throw new Error('Online-Konto nicht verfügbar.');
      const result = await supabase.rpc('accept_family_invite', { invite_id: inviteId });
      if (result.error) throw result.error;
      setReady(false);
      try { await loadFamilies(result.data as string); } finally { setReady(true); }
    },
    refresh: async () => loadFamilies(activeFamily?.id),
  }), [activeFamily, enabled, error, families, invites, loadFamilies, members, pendingInvites, ready]);

  return <FamilySharingContext.Provider value={value}>{children}</FamilySharingContext.Provider>;
}

export function useFamilySharing() {
  const value = useContext(FamilySharingContext);
  if (!value) throw new Error('useFamilySharing must be used inside FamilySharingProvider');
  return value;
}
