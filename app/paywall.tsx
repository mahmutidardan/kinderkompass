import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { Design } from '@/constants/design';
import { useAuth } from '@/lib/auth';
import { ANNUAL_SAVINGS_PERCENT, SUBSCRIPTION_PRICES, SubscriptionPlan, useSubscription } from '@/lib/subscription';

const BENEFITS = [
  'Unbegrenzte Kinderprofile und Einträge',
  'Fieber-, Medikamenten- und Terminverlauf',
  'Individuelle Erinnerungen und Nachtalarm',
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { localMode, signOut } = useAuth();
  const subscription = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(subscription.selectedPlan);
  const [feedback, setFeedback] = useState<string>();
  const previewMode = localMode === 'preview';

  function choosePlan(plan: SubscriptionPlan) {
    setSelectedPlan(plan);
    subscription.selectPlan(plan);
  }

  async function continueWithPlan() {
    setFeedback(undefined);
    if (subscription.trialEligible) {
      await subscription.startTrial(selectedPlan);
      router.replace('/');
      return;
    }
    if (subscription.trialActive) {
      subscription.selectPlan(selectedPlan);
      router.replace('/');
      return;
    }
    if (previewMode) {
      await subscription.activatePreviewSubscription(selectedPlan);
      router.replace('/');
      return;
    }
    setFeedback('Die Zahlung kann erst nach Einrichtung der App-Store- und Play-Store-Produkte abgeschlossen werden. Es wurde nichts berechnet.');
  }

  const actionLabel = subscription.trialEligible
    ? '7 Tage kostenlos testen'
    : subscription.trialActive
      ? 'Tarifauswahl speichern'
      : previewMode
        ? 'Tarif im Testmodus aktivieren'
        : 'Abonnement abschließen';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: Math.max(24, insets.bottom + 20) }]}>
        {subscription.hasAccess ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Tarifansicht schließen" onPress={() => router.replace('/')} style={styles.closeButton}>
            <MaterialIcons name="close" size={22} color={Design.colors.inkSoft} />
          </Pressable>
        ) : null}

        <LinearGradient colors={[Design.colors.primarySoft, Design.colors.background]} style={styles.hero}>
          <View style={styles.heroIcon}><MaterialIcons name="favorite" size={30} color={Design.colors.primary} /></View>
          <Text style={styles.eyebrow}>{subscription.trialExpired ? 'DEIN TESTZEITRAUM IST BEENDET' : '7 TAGE KOSTENLOS'}</Text>
          <Text style={styles.title}>Mehr Sicherheit im Familienalltag</Text>
          <Text style={styles.subtitle}>Teste alle Funktionen in Ruhe. Erst danach beginnt der von dir gewählte Tarif.</Text>
        </LinearGradient>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <View style={styles.check}><MaterialIcons name="check" size={17} color={Design.colors.primaryDark} /></View>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <View accessibilityRole="radiogroup" style={styles.planList}>
          <PlanCard
            selected={selectedPlan === 'annual'}
            title="12 Monate"
            price={SUBSCRIPTION_PRICES.annual.label}
            period={SUBSCRIPTION_PRICES.annual.period}
            detail="Entspricht nur 2,00 € pro Monat"
            badge={`${ANNUAL_SAVINGS_PERCENT} % sparen`}
            onPress={() => choosePlan('annual')}
          />
          <PlanCard
            selected={selectedPlan === 'monthly'}
            title="Monatlich"
            price={SUBSCRIPTION_PRICES.monthly.label}
            period={SUBSCRIPTION_PRICES.monthly.period}
            detail="Flexibel monatlich verlängerbar"
            onPress={() => choosePlan('monthly')}
          />
        </View>

        {subscription.trialActive ? (
          <View style={styles.statusCard}><MaterialIcons name="schedule" size={20} color={Design.colors.primaryDark} /><Text style={styles.statusText}>Dein Testzeitraum läuft noch {subscription.trialDaysRemaining} {subscription.trialDaysRemaining === 1 ? 'Tag' : 'Tage'}.</Text></View>
        ) : null}
        {previewMode && !subscription.trialEligible ? <Text style={styles.previewHint}>Testmodus: Es findet keine echte Zahlung statt.</Text> : null}
        {feedback ? <Text accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</Text> : null}

        <AppButton label={actionLabel} onPress={continueWithPlan} />
        <Text style={styles.legal}>Nach den 7 kostenlosen Tagen: 2,99 € pro Monat oder 24,00 € pro Jahr. Das Abo verlängert sich automatisch und kann in den Store-Einstellungen gekündigt werden.</Text>
        <Pressable accessibilityRole="button" onPress={() => setFeedback('Es wurde kein aktiver Store-Kauf gefunden.')} style={styles.restoreButton}>
          <Text style={styles.restoreText}>Käufe wiederherstellen</Text>
        </Pressable>
        {!subscription.hasAccess ? <Pressable accessibilityRole="button" onPress={signOut} style={styles.restoreButton}><Text style={styles.accountSwitchText}>Mit anderem Konto anmelden</Text></Pressable> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({ selected, title, price, period, detail, badge, onPress }: { selected: boolean; title: string; price: string; period: string; detail: string; badge?: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.planCard, selected && styles.planCardSelected, pressed && styles.pressed]}>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.planCopy}>
        <View style={styles.planTitleRow}><Text style={styles.planTitle}>{title}</Text>{badge ? <View style={styles.savingsBadge}><Text style={styles.savingsText}>{badge}</Text></View> : null}</View>
        <Text style={styles.planDetail}>{detail}</Text>
      </View>
      <View style={styles.priceCopy}><Text style={styles.price}>{price}</Text><Text style={styles.period}>{period}</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Design.colors.background },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, gap: 20 },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignSelf: 'flex-end', backgroundColor: Design.colors.surface, alignItems: 'center', justifyContent: 'center', ...Design.shadow.card },
  hero: { borderRadius: Design.radius.hero, paddingHorizontal: 24, paddingVertical: 28, alignItems: 'center', gap: 9 },
  heroIcon: { width: 58, height: 58, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.78)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  eyebrow: { color: Design.colors.primaryDark, fontSize: 11, lineHeight: 15, letterSpacing: 1.1, fontFamily: Design.fonts.bold, textAlign: 'center' },
  title: { color: Design.colors.ink, fontSize: 28, lineHeight: 34, letterSpacing: -0.8, fontFamily: Design.fonts.bold, textAlign: 'center' },
  subtitle: { maxWidth: 430, color: Design.colors.inkSoft, fontSize: 14, lineHeight: 21, fontFamily: Design.fonts.regular, textAlign: 'center' },
  benefits: { gap: 11, paddingHorizontal: 4 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  check: { width: 30, height: 30, borderRadius: 15, backgroundColor: Design.colors.sage, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, color: Design.colors.ink, fontSize: 14, lineHeight: 20, fontFamily: Design.fonts.semiBold },
  planList: { gap: 12 },
  planCard: { minHeight: 92, borderRadius: Design.radius.large, backgroundColor: Design.colors.surface, borderWidth: 1.5, borderColor: Design.colors.border, paddingHorizontal: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 12, ...Design.shadow.card },
  planCardSelected: { borderColor: Design.colors.primary, backgroundColor: Design.colors.primarySoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Design.colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: Design.colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Design.colors.primary },
  planCopy: { flex: 1, gap: 4 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  planTitle: { color: Design.colors.ink, fontSize: 16, lineHeight: 22, fontFamily: Design.fonts.bold },
  planDetail: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular },
  savingsBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: Design.colors.primary },
  savingsText: { color: '#FFFFFF', fontSize: 10, lineHeight: 13, fontFamily: Design.fonts.bold },
  priceCopy: { alignItems: 'flex-end', gap: 1 },
  price: { color: Design.colors.ink, fontSize: 18, lineHeight: 24, fontFamily: Design.fonts.bold },
  period: { color: Design.colors.inkSoft, fontSize: 10, lineHeight: 14, fontFamily: Design.fonts.regular },
  statusCard: { borderRadius: Design.radius.medium, padding: 14, backgroundColor: Design.colors.sage, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { flex: 1, color: Design.colors.primaryDark, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  previewHint: { color: Design.colors.primaryDark, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.semiBold, textAlign: 'center' },
  feedback: { color: Design.colors.danger, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.semiBold, textAlign: 'center' },
  legal: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 17, fontFamily: Design.fonts.regular, textAlign: 'center' },
  restoreButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  restoreText: { color: Design.colors.primaryDark, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  accountSwitchText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
