import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

export type SubscriptionPlan = 'monthly' | 'annual';

type SubscriptionState = {
  trialStartedAt?: string;
  selectedPlan: SubscriptionPlan;
  previewSubscriptionActive?: boolean;
};

type SubscriptionContextValue = SubscriptionState & {
  ready: boolean;
  hasAccess: boolean;
  trialEligible: boolean;
  trialActive: boolean;
  trialExpired: boolean;
  trialEndsAt?: string;
  trialDaysRemaining: number;
  billingConfigured: boolean;
  selectPlan: (plan: SubscriptionPlan) => void;
  startTrial: (plan: SubscriptionPlan) => Promise<void>;
  activatePreviewSubscription: (plan: SubscriptionPlan) => Promise<void>;
};

const TRIAL_DAYS = 7;
const STORAGE_KEY = '@fieberwache/subscription/v1';
const initialState: SubscriptionState = { selectedPlan: 'annual' };
const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export const SUBSCRIPTION_PRICES = {
  monthly: { amount: 2.99, label: '2,99 €', period: 'pro Monat' },
  annual: { amount: 24, label: '24,00 €', period: 'pro Jahr' },
} as const;

export const ANNUAL_SAVINGS_PERCENT = Math.round(
  ((SUBSCRIPTION_PRICES.monthly.amount * 12 - SUBSCRIPTION_PRICES.annual.amount)
    / (SUBSCRIPTION_PRICES.monthly.amount * 12)) * 100,
);

export function SubscriptionProvider({ children, storageScope }: PropsWithChildren<{ storageScope: string }>) {
  const scopedStorageKey = `${STORAGE_KEY}/${storageScope}`;
  const [state, setState] = useState<SubscriptionState>(initialState);
  const [ready, setReady] = useState(false);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(scopedStorageKey)
      .then((stored) => {
        if (!active || !stored) return;
        const parsed = JSON.parse(stored) as Partial<SubscriptionState>;
        setState({
          selectedPlan: parsed.selectedPlan === 'monthly' ? 'monthly' : 'annual',
          trialStartedAt: parsed.trialStartedAt,
          previewSubscriptionActive: parsed.previewSubscriptionActive,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, [scopedStorageKey]);

  useEffect(() => {
    if (!ready) return undefined;
    AsyncStorage.setItem(scopedStorageKey, JSON.stringify(state)).catch(() => undefined);
    return undefined;
  }, [ready, scopedStorageKey, state]);

  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const value = useMemo<SubscriptionContextValue>(() => {
    const trialStartedAt = state.trialStartedAt ? new Date(state.trialStartedAt).getTime() : undefined;
    const trialEndsAtTime = trialStartedAt ? trialStartedAt + TRIAL_DAYS * 24 * 60 * 60 * 1000 : undefined;
    const trialActive = Boolean(trialEndsAtTime && trialEndsAtTime > clock);
    const trialExpired = Boolean(trialEndsAtTime && trialEndsAtTime <= clock && !state.previewSubscriptionActive);
    return {
      ...state,
      ready,
      hasAccess: Boolean(state.previewSubscriptionActive || trialActive),
      trialEligible: !state.trialStartedAt,
      trialActive,
      trialExpired,
      trialEndsAt: trialEndsAtTime ? new Date(trialEndsAtTime).toISOString() : undefined,
      trialDaysRemaining: trialEndsAtTime ? Math.max(0, Math.ceil((trialEndsAtTime - clock) / (24 * 60 * 60 * 1000))) : 0,
      // Real purchases stay disabled until App Store / Play Store products and credentials exist.
      billingConfigured: false,
      selectPlan: (selectedPlan) => setState((current) => ({ ...current, selectedPlan })),
      startTrial: async (selectedPlan) => {
        if (state.trialStartedAt) return;
        setState((current) => ({ ...current, selectedPlan, trialStartedAt: new Date().toISOString() }));
      },
      activatePreviewSubscription: async (selectedPlan) => {
        setState((current) => ({ ...current, selectedPlan, previewSubscriptionActive: true }));
      },
    };
  }, [clock, ready, state]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const value = useContext(SubscriptionContext);
  if (!value) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return value;
}
