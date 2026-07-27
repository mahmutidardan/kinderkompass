import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { readProtectedState, storageProtection, writeProtectedState } from '@/lib/secure-storage';
import { supabase } from '@/lib/supabase';

export type Child = {
  id: string;
  name: string;
  birthDate?: string;
  gender?: ChildGender;
  avatar?: ChildAvatar;
  photoUri?: string;
};

export type ChildGender = 'male' | 'female';

export type ChildAvatar = {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  outfit: string;
  outfitColor: string;
  accessory: string;
  backgroundColor: string;
  // Kept for a seamless migration of profiles created with the old emoji avatar.
  face?: string;
  color?: string;
};

export type TemperatureMethod = 'Ohr' | 'Stirn' | 'Mund' | 'Achsel' | 'Rektal';

export type TemperatureEntry = {
  id: string;
  childId: string;
  temperature: number;
  method: TemperatureMethod;
  recordedAt: string;
  note?: string;
};

export type MedicationEntry = {
  id: string;
  childId: string;
  medicationId?: string;
  name: string;
  amount: string;
  recordedAt: string;
  reminderAt?: string;
  reminderNotificationId?: string;
};

export type MedicationInventoryItem = {
  id: string;
  name: string;
  defaultAmount?: string;
  defaultIntervalHours?: string;
};

export type DoctorContact = {
  childId: string;
  name: string;
  phone: string;
  address: string;
};

export type Appointment = {
  id: string;
  childId: string;
  title: string;
  scheduledAt: string;
  reminderMinutes?: number;
  note?: string;
  reminderNotificationId?: string;
};

type AppState = {
  children: Child[];
  activeChildId?: string;
  temperatures: TemperatureEntry[];
  medications: MedicationEntry[];
  medicationInventory: MedicationInventoryItem[];
  doctorContacts: DoctorContact[];
  appointments: Appointment[];
  temperatureReminderHours?: number;
  temperatureReminderEnabled?: boolean;
  nightAlarmActiveUntil?: string;
  nightAlarmSummary?: string;
  nightAlarmTimes?: string[];
  nightNotificationIds?: string[];
  temperatureReminderAt?: string;
  temperatureNotificationId?: string;
};

type Store = AppState & {
  hydrated: boolean;
  storageError?: string;
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  storageProtection: 'encrypted-device' | 'browser-local';
  activeChild?: Child;
  nightAlarmActive: boolean;
  addChild: (name: string, birthDate?: string, gender?: ChildGender, avatar?: ChildAvatar, photoUri?: string) => void;
  updateChild: (id: string, name: string, birthDate?: string, gender?: ChildGender, avatar?: ChildAvatar, photoUri?: string) => void;
  deleteChild: (id: string) => void;
  setActiveChild: (id: string) => void;
  setTemperatureReminderHours: (hours?: number) => void;
  setTemperatureReminderEnabled: (enabled: boolean) => void;
  setTemperatureReminderSchedule: (reminderAt?: string, notificationId?: string) => void;
  setNightAlarm: (activeUntil?: string, summary?: string, times?: string[], notificationIds?: string[]) => void;
  saveDoctorContact: (childId: string, contact: Omit<DoctorContact, 'childId'>) => void;
  deleteDoctorContact: (childId: string) => void;
  addAppointment: (entry: Omit<Appointment, 'id' | 'childId'>) => void;
  updateAppointment: (id: string, entry: Omit<Appointment, 'id' | 'childId'>) => void;
  deleteAppointment: (id: string) => void;
  addTemperature: (entry: Omit<TemperatureEntry, 'id' | 'childId'>) => void;
  updateTemperature: (id: string, entry: Omit<TemperatureEntry, 'id' | 'childId'>) => void;
  deleteTemperature: (id: string) => void;
  addMedication: (entry: Omit<MedicationEntry, 'id' | 'childId'>) => void;
  updateMedication: (id: string, entry: Omit<MedicationEntry, 'id' | 'childId'>) => void;
  deleteMedication: (id: string) => void;
  clearMedicationReminder: (id: string) => void;
  clearAppointmentReminder: (id: string) => void;
  addMedicationInventoryItem: (entry: Omit<MedicationInventoryItem, 'id'>) => void;
  updateMedicationInventoryItem: (id: string, entry: Omit<MedicationInventoryItem, 'id'>) => void;
  deleteMedicationInventoryItem: (id: string) => void;
};

const STORAGE_KEY = '@fieberwache/state/v1';
const initialState: AppState = {
  children: [],
  temperatures: [],
  medications: [],
  medicationInventory: [],
  doctorContacts: [],
  appointments: [],
};

const StoreContext = createContext<Store | undefined>(undefined);

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeState(parsed: Partial<AppState>): AppState {
  return {
    ...initialState,
    ...parsed,
    children: parsed.children ?? [],
    temperatures: parsed.temperatures ?? [],
    medications: parsed.medications ?? [],
    medicationInventory: parsed.medicationInventory ?? [],
    doctorContacts: parsed.doctorContacts ?? [],
    appointments: parsed.appointments ?? [],
    temperatureReminderEnabled: parsed.temperatureReminderEnabled ?? Boolean(parsed.temperatureReminderHours),
    nightAlarmTimes: parsed.nightAlarmTimes ?? [],
    nightNotificationIds: parsed.nightNotificationIds ?? [],
  };
}

export function StoreProvider({ children, storageScope = 'local-guest', legacyStorageScope, cloudFamilyId, cloudUserId }: PropsWithChildren<{ storageScope?: string; legacyStorageScope?: string; cloudFamilyId?: string; cloudUserId?: string }>) {
  const storageKey = `${STORAGE_KEY}/${storageScope}`;
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string>();
  const [syncStatus, setSyncStatus] = useState<Store['syncStatus']>('local');
  const [clock, setClock] = useState(() => Date.now());
  const lastSyncedState = useRef<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const localState = readProtectedState(storageKey, storageScope)
      .then(async (stored) => stored
        ?? (legacyStorageScope ? readProtectedState(`${STORAGE_KEY}/${legacyStorageScope}`, legacyStorageScope) : null)
        ?? (storageScope === 'local-guest' ? AsyncStorage.getItem(STORAGE_KEY) : null));
    const cloudState = cloudFamilyId && supabase
      ? supabase.from('family_states').select('state').eq('family_id', cloudFamilyId).maybeSingle()
      : cloudUserId && supabase
        ? supabase.from('user_states').select('state').eq('user_id', cloudUserId).maybeSingle()
      : Promise.resolve(undefined);
    Promise.all([localState, cloudState])
      .then(([stored, cloudResult]) => {
        if (!active) return;
        const cloudValue = cloudResult && 'data' in cloudResult ? cloudResult.data?.state : undefined;
        const source = cloudValue ? JSON.stringify(cloudValue) : stored;
        if (!source) return;
        const parsed = JSON.parse(source) as Partial<AppState>;
        lastSyncedState.current = cloudValue ? JSON.stringify(normalizeState(parsed)) : undefined;
        setState(normalizeState(parsed));
        if (cloudValue) setSyncStatus('synced');
      })
      .catch(() => {
        if (active) setStorageError('Gespeicherte Daten konnten nicht geladen werden. Neue Eingaben bleiben vorerst nur in dieser Sitzung.');
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [cloudFamilyId, cloudUserId, legacyStorageScope, storageKey, storageScope]);

  useEffect(() => {
    if (!hydrated) return undefined;
    const timeout = setTimeout(async () => {
      const serializedState = JSON.stringify(state);
      try {
        await writeProtectedState(storageKey, storageScope, serializedState);
        setStorageError(undefined);
      } catch {
        setStorageError('Änderungen konnten nicht dauerhaft auf diesem Gerät gespeichert werden.');
      }
      if (cloudFamilyId && cloudUserId && supabase && serializedState !== lastSyncedState.current) {
        setSyncStatus('syncing');
        const { error } = await supabase.rpc('update_family_state', { target_family_id: cloudFamilyId, next_state: state });
        if (!error) lastSyncedState.current = serializedState;
        setSyncStatus(error ? 'error' : 'synced');
      } else if (cloudUserId && supabase && !cloudFamilyId) {
        setSyncStatus('syncing');
        const { error } = await supabase.from('user_states').upsert({ user_id: cloudUserId, state, updated_at: new Date().toISOString() });
        setSyncStatus(error ? 'error' : 'synced');
      } else {
        setSyncStatus('local');
      }
    }, 450);
    return () => clearTimeout(timeout);
  }, [cloudFamilyId, cloudUserId, hydrated, state, storageKey, storageScope]);

  useEffect(() => {
    if (!cloudFamilyId || !supabase) return undefined;
    const realtimeClient = supabase;
    const channel = realtimeClient
      .channel(`family-state-${cloudFamilyId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'family_states', filter: `family_id=eq.${cloudFamilyId}` }, (payload) => {
        const remoteState = (payload.new as { state?: Partial<AppState> }).state;
        if (!remoteState) return;
        const normalized = normalizeState(remoteState);
        const serialized = JSON.stringify(normalized);
        if (serialized === lastSyncedState.current) return;
        lastSyncedState.current = serialized;
        setState(normalized);
        setSyncStatus('synced');
      })
      .subscribe();
    return () => { realtimeClient.removeChannel(channel); };
  }, [cloudFamilyId]);

  useEffect(() => {
    if (!state.nightAlarmActiveUntil) return undefined;
    const expiresIn = Math.max(0, new Date(state.nightAlarmActiveUntil).getTime() - Date.now()) + 50;
    const timeout = setTimeout(() => setClock(Date.now()), expiresIn);
    return () => clearTimeout(timeout);
  }, [state.nightAlarmActiveUntil]);

  const value = useMemo<Store>(() => {
    const activeChild = state.children.find((child) => child.id === state.activeChildId) ?? state.children[0];

    return {
      ...state,
      activeChildId: activeChild?.id,
      activeChild,
      nightAlarmActive: Boolean(state.nightAlarmActiveUntil && new Date(state.nightAlarmActiveUntil).getTime() > clock),
      hydrated,
      storageError,
      syncStatus,
      storageProtection,
      addChild: (name, birthDate, gender, avatar, photoUri) => {
        const child: Child = { id: newId('child'), name: name.trim(), birthDate: birthDate?.trim() || undefined, gender, avatar, photoUri: photoUri?.trim() || undefined };
        setState((current) => ({
          ...current,
          children: [...current.children, child],
          activeChildId: current.activeChildId ?? child.id,
        }));
      },
      updateChild: (id, name, birthDate, gender, avatar, photoUri) => {
        setState((current) => ({
          ...current,
          children: current.children.map((child) => child.id === id
            ? { ...child, name: name.trim(), birthDate: birthDate?.trim() || undefined, gender: gender ?? child.gender, avatar: avatar ?? child.avatar, photoUri: photoUri?.trim() || undefined }
            : child),
        }));
      },
      deleteChild: (id) => {
        setState((current) => {
          const remainingChildren = current.children.filter((child) => child.id !== id);
          const nextActiveChildId = current.activeChildId === id
            ? remainingChildren[0]?.id
            : current.activeChildId;
          return {
            ...current,
            children: remainingChildren,
            activeChildId: nextActiveChildId,
            temperatures: current.temperatures.filter((entry) => entry.childId !== id),
            medications: current.medications.filter((entry) => entry.childId !== id),
            doctorContacts: current.doctorContacts.filter((entry) => entry.childId !== id),
            appointments: current.appointments.filter((entry) => entry.childId !== id),
            ...(current.activeChildId === id ? {
              temperatureReminderAt: undefined,
              temperatureNotificationId: undefined,
              nightAlarmActiveUntil: undefined,
              nightAlarmSummary: undefined,
              nightAlarmTimes: [],
              nightNotificationIds: [],
            } : {}),
          };
        });
      },
      setActiveChild: (id) => setState((current) => ({ ...current, activeChildId: id })),
      setTemperatureReminderHours: (hours) => setState((current) => ({ ...current, temperatureReminderHours: hours })),
      setTemperatureReminderEnabled: (enabled) => setState((current) => ({ ...current, temperatureReminderEnabled: enabled })),
      setTemperatureReminderSchedule: (reminderAt, notificationId) => setState((current) => ({
        ...current,
        temperatureReminderAt: reminderAt,
        temperatureNotificationId: notificationId,
      })),
      setNightAlarm: (activeUntil, summary, times, notificationIds) => setState((current) => ({
        ...current,
        nightAlarmActiveUntil: activeUntil,
        nightAlarmSummary: summary,
        nightAlarmTimes: times,
        nightNotificationIds: notificationIds,
      })),
      saveDoctorContact: (childId, contact) => setState((current) => ({
        ...current,
        doctorContacts: [
          ...current.doctorContacts.filter((item) => item.childId !== childId),
          { ...contact, childId, name: contact.name.trim(), phone: contact.phone.trim(), address: contact.address.trim() },
        ],
      })),
      deleteDoctorContact: (childId) => setState((current) => ({
        ...current,
        doctorContacts: current.doctorContacts.filter((item) => item.childId !== childId),
      })),
      addAppointment: (entry) => {
        if (!activeChild) return;
        setState((current) => ({
          ...current,
          appointments: [...current.appointments, { ...entry, id: newId('appointment'), childId: activeChild.id }],
        }));
      },
      updateAppointment: (id, entry) => setState((current) => ({
        ...current,
        appointments: current.appointments.map((item) => item.id === id ? { ...item, ...entry } : item),
      })),
      deleteAppointment: (id) => setState((current) => ({
        ...current,
        appointments: current.appointments.filter((item) => item.id !== id),
      })),
      addTemperature: (entry) => {
        if (!activeChild) return;
        setState((current) => ({
          ...current,
          temperatures: [...current.temperatures, { ...entry, id: newId('temp'), childId: activeChild.id }],
        }));
      },
      updateTemperature: (id, entry) => setState((current) => ({
        ...current,
        temperatures: current.temperatures.map((item) => item.id === id ? { ...item, ...entry } : item),
      })),
      deleteTemperature: (id) => setState((current) => ({
        ...current,
        temperatures: current.temperatures.filter((item) => item.id !== id),
      })),
      addMedication: (entry) => {
        if (!activeChild) return;
        setState((current) => ({
          ...current,
          medications: [...current.medications, { ...entry, id: newId('med'), childId: activeChild.id }],
        }));
      },
      updateMedication: (id, entry) => setState((current) => ({
        ...current,
        medications: current.medications.map((item) => item.id === id ? { ...item, ...entry } : item),
      })),
      deleteMedication: (id) => setState((current) => ({
        ...current,
        medications: current.medications.filter((item) => item.id !== id),
      })),
      clearMedicationReminder: (id) => setState((current) => ({
        ...current,
        medications: current.medications.map((item) => item.id === id
          ? { ...item, reminderAt: undefined, reminderNotificationId: undefined }
          : item),
      })),
      clearAppointmentReminder: (id) => setState((current) => ({
        ...current,
        appointments: current.appointments.map((item) => item.id === id
          ? { ...item, reminderMinutes: undefined, reminderNotificationId: undefined }
          : item),
      })),
      addMedicationInventoryItem: (entry) => {
        setState((current) => ({
          ...current,
          medicationInventory: [...current.medicationInventory, {
            ...entry,
            id: newId('inventory'),
            name: entry.name.trim(),
            defaultAmount: entry.defaultAmount?.trim() || undefined,
            defaultIntervalHours: entry.defaultIntervalHours?.trim() || undefined,
          }],
        }));
      },
      updateMedicationInventoryItem: (id, entry) => {
        setState((current) => ({
          ...current,
          medicationInventory: current.medicationInventory.map((item) => item.id === id ? {
            ...item,
            name: entry.name.trim(),
            defaultAmount: entry.defaultAmount?.trim() || undefined,
            defaultIntervalHours: entry.defaultIntervalHours?.trim() || undefined,
          } : item),
        }));
      },
      deleteMedicationInventoryItem: (id) => {
        setState((current) => ({
          ...current,
          medicationInventory: current.medicationInventory.filter((item) => item.id !== id),
        }));
      },
    };
  }, [clock, hydrated, state, storageError, syncStatus]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
