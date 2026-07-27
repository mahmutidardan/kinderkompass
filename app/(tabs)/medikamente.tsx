import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { InfoButton } from '@/components/info-button';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppInput } from '@/components/ui/app-input';
import { AppSectionHeading } from '@/components/ui/app-section-heading';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';
import { MedicationInventoryItem, useStore } from '@/lib/store';

type FormMode = 'closed' | 'add' | 'edit';

export default function MedikamenteScreen() {
  const {
    activeChild,
    medicationInventory,
    medications,
    addMedicationInventoryItem,
    updateMedicationInventoryItem,
    deleteMedicationInventoryItem,
  } = useStore();
  const [formMode, setFormMode] = useState<FormMode>('closed');
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [interval, setInterval] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string>();
  const pendingDeleteItem = medicationInventory.find((item) => item.id === pendingDeleteId);
  const todayMedicationEntries = medications
    .filter((item) => item.childId === activeChild?.id && new Date(item.recordedAt).toDateString() === new Date().toDateString())
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  function clearForm() {
    setName('');
    setAmount('');
    setInterval('');
    setEditingId(undefined);
    setFormMode('closed');
    setErrors({});
  }

  function beginAdd() {
    setName('');
    setAmount('');
    setInterval('');
    setEditingId(undefined);
    setPendingDeleteId(undefined);
    setFormMode('add');
  }

  function beginEdit(item: MedicationInventoryItem) {
    setName(item.name);
    setAmount(item.defaultAmount ?? '');
    setInterval(item.defaultIntervalHours ?? '');
    setEditingId(item.id);
    setPendingDeleteId(undefined);
    setFormMode('edit');
  }

  function save() {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) {
      nextErrors.name = 'Bitte trage den Namen so ein, wie er auf der Packung steht.';
    }
    if (interval.trim()) {
      const parsed = Number(interval.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed < 0.5 || parsed > 24) {
        nextErrors.interval = 'Bitte einen Erinnerungsabstand zwischen 0,5 und 24 Stunden eingeben.';
      }
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const entry = { name, defaultAmount: amount, defaultIntervalHours: interval };
    if (formMode === 'edit' && editingId) updateMedicationInventoryItem(editingId, entry);
    else addMedicationInventoryItem(entry);
    setFeedback(formMode === 'edit' ? 'Medikament aktualisiert.' : 'Medikament zum Inventar hinzugefügt.');
    clearForm();
  }

  function confirmDelete() {
    if (!pendingDeleteId) return;
    deleteMedicationInventoryItem(pendingDeleteId);
    setPendingDeleteId(undefined);
    if (editingId === pendingDeleteId) clearForm();
    setFeedback('Medikament aus dem Inventar entfernt. Bereits dokumentierte Gaben bleiben erhalten.');
  }

  return (
    <AppShell eyebrow="Deine Hausapotheke" title="Medikamente">
      {feedback ? <View accessibilityLiveRegion="polite" style={styles.feedback}><IconSymbol name="checkmark" size={18} color={Design.colors.sageStrong} /><Text style={styles.feedbackText}>{feedback}</Text><Pressable accessibilityRole="button" accessibilityLabel="Hinweis schließen" onPress={() => setFeedback(undefined)} style={styles.feedbackClose}><IconSymbol name="xmark" size={17} color={Design.colors.inkSoft} /></Pressable></View> : null}
      <LinearGradient colors={[Design.colors.dangerSoft, Design.colors.accentSoft]} style={styles.hero}>
        <View style={styles.heroIcon}><IconSymbol name="triangle-alert" size={24} color={Design.colors.danger} /></View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Wichtiger Hinweis</Text>
          <Text style={styles.heroText}>Prüfe Packung und ärztliche Anweisung bei jeder Gabe erneut. Die App dokumentiert deine Angaben und ersetzt keine medizinische Beratung.</Text>
        </View>
        <InfoButton title="Hausapotheke" text="Inventarwerte und Erinnerungsabstände stammen ausschließlich aus deinen Eingaben. Die App bewertet weder Dosierung noch Freigabe einer weiteren Gabe." />
      </LinearGradient>

      <View style={styles.primaryActionSection}>
        <Text style={styles.primaryActionTitle}>Hausapotheke</Text>
        <AppButton label="Medikament hinzufügen" onPress={beginAdd} icon={<IconSymbol name="plus" size={19} color="#FFFFFF" />} />
      </View>

      {medicationInventory.length > 0 ? (
        <>
          <AppSectionHeading title="Dein Inventar" count={medicationInventory.length} infoTitle="Dein Inventar" infoText="Die gespeicherten Angaben sind deine eigenen Vorgaben und keine medizinische Freigabe für eine weitere Gabe." />
          <View style={styles.inventoryList}>
            {medicationInventory.map((item, index) => (
              <View key={item.id} style={[styles.inventoryRow, index === medicationInventory.length - 1 && styles.lastRow]}>
                <View style={styles.inventoryTopline}>
                  <View style={styles.medIcon}><IconSymbol name="pills.fill" size={21} color={Design.colors.primaryDark} /></View>
                  <View style={styles.actions}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${item.name} bearbeiten`} onPress={() => beginEdit(item)} style={styles.actionButton}><IconSymbol name="pencil" size={16} color={Design.colors.primaryDark} /></Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${item.name} löschen`} onPress={() => { setPendingDeleteId(item.id); setFormMode('closed'); }} style={[styles.actionButton, styles.deleteAction]}><IconSymbol name="trash.fill" size={16} color={Design.colors.danger} /></Pressable>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name} als Gabe dokumentieren`}
                  disabled={!activeChild}
                  onPress={() => router.push(`/modal?kind=medication&inventoryId=${item.id}`)}
                  style={styles.inventoryMain}>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>Antippen, um eine Gabe zu dokumentieren</Text>
                    <View style={styles.dosagePanel}>
                      <Text style={styles.dosageLabel}>Deine Voreinstellung</Text>
                      <Text style={styles.dosageValue}>{[
                        item.defaultAmount,
                        item.defaultIntervalHours ? `Erinnerung nach ${item.defaultIntervalHours} Std.` : undefined,
                      ].filter(Boolean).join(' · ') || 'Keine Angaben hinterlegt'}</Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
          {!activeChild ? <Text style={styles.noChildHint}>Lege ein Kinderprofil an, um direkt aus dem Inventar eine Gabe zu dokumentieren.</Text> : null}
        </>
      ) : null}

      {pendingDeleteItem ? (
        <AppCard tone="danger" elevated={false} style={styles.deleteCard}>
          <View style={styles.deleteHeading}><View style={styles.warningIcon}><IconSymbol name="triangle-alert" size={20} color={Design.colors.danger} /></View><View style={styles.deleteCopy}><Text style={styles.deleteTitle}>{pendingDeleteItem.name} entfernen?</Text><Text style={styles.deleteText}>Das Präparat verschwindet aus dem Inventar. Bereits dokumentierte Gaben bleiben im Verlauf erhalten.</Text></View></View>
          <View style={styles.buttonRow}><AppButton label="Abbrechen" variant="secondary" onPress={() => setPendingDeleteId(undefined)} style={styles.flexButton} /><AppButton label="Entfernen" variant="danger" onPress={confirmDelete} style={styles.flexButton} /></View>
        </AppCard>
      ) : null}

      {formMode !== 'closed' && !pendingDeleteItem ? (
        <AppCard style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.formTitleCopy}><Text style={styles.formTitle}>{formMode === 'edit' ? 'Medikament bearbeiten' : 'Medikament hinzufügen'}</Text><Text style={styles.formSubtitle}>Alle Angaben werden von dir festgelegt.</Text></View>
            <InfoButton title="Medikament eintragen" text="Name, Mengenangabe und Erinnerungsintervall werden nur als deine persönliche Dokumentation gespeichert." />
            {medicationInventory.length > 0 ? <Pressable accessibilityLabel="Formular schließen" onPress={clearForm} style={styles.closeButton}><IconSymbol name="xmark" size={18} color={Design.colors.inkSoft} /></Pressable> : null}
          </View>
          <AppInput error={errors.name} label="Name laut Packung" value={name} onChangeText={setName} placeholder="z. B. eigener Produktname" autoFocus />
          <AppInput label="Übliche eigene Mengenangabe" optional value={amount} onChangeText={setAmount} placeholder="z. B. 5 ml" />
          <AppInput error={errors.interval} label="Standard-Erinnerung nach Stunden" optional value={interval} onChangeText={setInterval} placeholder="z. B. 6" keyboardType="decimal-pad" suffix="Stunden" helper="Dieser Wert ist nur deine Voreinstellung und keine medizinische Freigabe für eine weitere Gabe." />
          <AppButton label={formMode === 'edit' ? 'Änderungen speichern' : 'Zum Inventar hinzufügen'} onPress={save} disabled={!name.trim()} />
        </AppCard>
      ) : null}

      <AppSectionHeading title="Einnahmen heute" count={todayMedicationEntries.length} infoTitle="Einnahmen heute" infoText="Hier erscheinen die heute für das aktive Kinderprofil dokumentierten Medikamentengaben in zeitlicher Reihenfolge." />
      <View style={styles.todayTimeline}>
        {todayMedicationEntries.length ? todayMedicationEntries.map((item, index) => (
          <View key={item.id} style={styles.todayRow}>
            <View style={styles.todayRail}><View style={styles.todayDot}><IconSymbol name="checkmark" size={13} color="#FFFFFF" /></View>{index < todayMedicationEntries.length - 1 ? <View style={styles.todayLine} /> : null}</View>
            <View style={styles.todayCopy}><View style={styles.todayHeading}><Text style={styles.todayName}>{item.name}</Text><Text style={styles.todayTime}>{new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.recordedAt))} Uhr</Text></View><Text style={styles.todayAmount}>{item.amount || 'Menge nicht angegeben'}</Text></View>
          </View>
        )) : <Text style={styles.todayEmpty}>Heute wurde noch keine Gabe dokumentiert.</Text>}
      </View>

      <AppCard tone="sage" compact elevated={false} style={styles.safetyNote}><View style={styles.safetyIcon}><IconSymbol name="info" size={18} color={Design.colors.sageStrong} /></View><Text style={styles.safetyText}>Prüfe Packung und ärztliche Anweisung bei jeder Gabe erneut. Inventarwerte sind ausschließlich deine gespeicherten Eingaben.</Text></AppCard>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  feedback: { borderRadius: Design.radius.medium, backgroundColor: Design.colors.sage, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedbackText: { flex: 1, color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  feedbackClose: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.65)' },
  hero: { borderRadius: Design.radius.hero, padding: 22, gap: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: Design.colors.border },
  heroIcon: { width: 54, height: 54, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.68)', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { gap: 3 },
  heroTitle: { color: Design.colors.ink, fontSize: 19, lineHeight: 25, fontFamily: Design.fonts.bold },
  heroText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  primaryActionSection: { gap: 12 },
  primaryActionTitle: { color: Design.colors.ink, ...Design.type.title, fontFamily: Design.fonts.bold },
  inventoryList: { gap: 10 },
  inventoryRow: { padding: 17, gap: 13, backgroundColor: Design.colors.surface, borderRadius: Design.radius.large, borderWidth: 1, borderColor: Design.colors.border, ...Design.shadow.card },
  lastRow: {},
  inventoryTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inventoryMain: { alignSelf: 'stretch' },
  medIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1 },
  itemName: { color: Design.colors.ink, fontSize: 16, lineHeight: 22, fontFamily: Design.fonts.bold },
  itemMeta: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 5, marginLeft: 6 },
  actionButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  deleteAction: { backgroundColor: Design.colors.accentSoft },
  dosagePanel: { marginTop: 12, padding: 12, borderRadius: 17, backgroundColor: Design.colors.backgroundMuted, gap: 2 },
  dosageLabel: { color: Design.colors.primary, fontSize: 11, lineHeight: 15, fontFamily: Design.fonts.bold },
  dosageValue: { color: Design.colors.ink, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.medium },
  noChildHint: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular, marginTop: -10 },
  formCard: { gap: 12 },
  formHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  formTitleCopy: { flex: 1 },
  formTitle: { color: Design.colors.ink, ...Design.type.section, fontFamily: Design.fonts.bold },
  formSubtitle: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular, marginTop: 2 },
  closeButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: Design.colors.backgroundMuted, alignItems: 'center', justifyContent: 'center' },
  deleteCard: { gap: 16, borderWidth: 1, borderColor: '#F4D6CF' },
  deleteHeading: { flexDirection: 'row', gap: 12 },
  warningIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: Design.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  warningText: { color: Design.colors.danger, fontSize: 17, fontFamily: Design.fonts.extraBold },
  deleteCopy: { flex: 1, gap: 2 },
  deleteTitle: { color: Design.colors.ink, fontSize: 15, lineHeight: 20, fontFamily: Design.fonts.bold },
  deleteText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  buttonRow: { flexDirection: 'row', gap: 9 },
  flexButton: { flex: 1 },
  safetyNote: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  safetyIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  safetyIconText: { color: '#5C8C7E', fontSize: 14, fontFamily: Design.fonts.extraBold },
  safetyText: { flex: 1, color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  todayTimeline: { backgroundColor: Design.colors.surface, borderRadius: Design.radius.large, padding: 18, borderWidth: 1, borderColor: Design.colors.border, ...Design.shadow.card },
  todayRow: { minHeight: 62, flexDirection: 'row' },
  todayRail: { width: 34, alignItems: 'center' },
  todayDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: Design.colors.primary, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  todayLine: { position: 'absolute', top: 23, bottom: -1, width: 2, backgroundColor: Design.colors.borderStrong },
  todayCopy: { flex: 1, paddingBottom: 16, gap: 2 },
  todayHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  todayName: { flex: 1, color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  todayTime: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 16, fontFamily: Design.fonts.semiBold },
  todayAmount: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular },
  todayEmpty: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular, textAlign: 'center' },
});
