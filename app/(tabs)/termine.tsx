import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { EmptyChild } from '@/components/empty-child';
import { InfoButton } from '@/components/info-button';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppDateTimeInput } from '@/components/ui/app-date-time-input';
import { AppDialog } from '@/components/ui/app-dialog';
import { AppInput } from '@/components/ui/app-input';
import { AppSectionHeading } from '@/components/ui/app-section-heading';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';
import { cancelReminder, scheduleReminder } from '@/lib/notifications';
import { Appointment, useStore } from '@/lib/store';
import { getUCheckups, UCheckup } from '@/lib/u-checkups';
import { parseGermanDateTime } from '@/lib/date-time';

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatDateInput(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatWindow(start: Date, end: Date) {
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  const first = new Intl.DateTimeFormat('de-DE', options).format(start);
  const last = new Intl.DateTimeFormat('de-DE', options).format(end);
  return first === last ? first : `${first} – ${last}`;
}

function emptyDoctorForm(contact?: { name: string; phone: string; address: string }) {
  return { name: contact?.name ?? '', phone: contact?.phone ?? '', address: contact?.address ?? '' };
}

export default function TermineScreen() {
  const {
    activeChild,
    doctorContacts,
    appointments,
    saveDoctorContact,
    deleteDoctorContact,
    addAppointment,
    updateAppointment,
    deleteAppointment,
  } = useStore();
  const contact = doctorContacts.find((item) => item.childId === activeChild?.id);
  const childAppointments = useMemo(() => appointments
    .filter((item) => item.childId === activeChild?.id)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)), [activeChild?.id, appointments]);
  const upcomingAppointments = childAppointments.filter((item) => new Date(item.scheduledAt).getTime() >= Date.now());
  const pastAppointments = childAppointments.filter((item) => new Date(item.scheduledAt).getTime() < Date.now()).reverse();
  const uCheckups = useMemo(() => getUCheckups(activeChild?.birthDate), [activeChild?.birthDate]);
  const upcomingUCheckups = uCheckups.filter((item) => item.status !== 'overdue');
  const [doctorFormOpen, setDoctorFormOpen] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [doctorAddress, setDoctorAddress] = useState('');
  const [appointmentFormOpen, setAppointmentFormOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string>();
  const [appointmentTitle, setAppointmentTitle] = useState('Kinderarzttermin');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [appointmentReminder, setAppointmentReminder] = useState('60');
  const [appointmentNote, setAppointmentNote] = useState('');
  const [plannedUCheckup, setPlannedUCheckup] = useState<UCheckup>();
  const [pendingDeleteAppointmentId, setPendingDeleteAppointmentId] = useState<string>();
  const [pendingDeleteDoctor, setPendingDeleteDoctor] = useState(false);
  const [showAllUCheckups, setShowAllUCheckups] = useState(false);
  const [showPastAppointments, setShowPastAppointments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string>();

  useEffect(() => {
    const values = emptyDoctorForm(contact);
    setDoctorName(values.name);
    setDoctorPhone(values.phone);
    setDoctorAddress(values.address);
    setDoctorFormOpen(false);
    setAppointmentFormOpen(false);
    setEditingAppointmentId(undefined);
    setShowAllUCheckups(false);
  }, [activeChild?.id, contact]);

  function openDoctorForm() {
    const values = emptyDoctorForm(contact);
    setDoctorName(values.name);
    setDoctorPhone(values.phone);
    setDoctorAddress(values.address);
    setDoctorFormOpen(true);
  }

  function saveDoctor() {
    if (!activeChild) return;
    if (!doctorName.trim()) {
      setFormErrors({ doctorName: 'Bitte trage den Namen der Kinderarztpraxis ein.' });
      return;
    }
    saveDoctorContact(activeChild.id, { name: doctorName, phone: doctorPhone, address: doctorAddress });
    setDoctorFormOpen(false);
    setFormErrors({});
    setFeedback('Kinderarzt gespeichert.');
  }

  function openNewAppointment(title = 'Kinderarzttermin', suggestedDate?: Date) {
    const target = suggestedDate ? new Date(suggestedDate) : new Date(Date.now() + 60 * 60 * 1000);
    if (suggestedDate) target.setHours(10, 0, 0, 0);
    else target.setMinutes(0, 0, 0);
    setEditingAppointmentId(undefined);
    setAppointmentTitle(title);
    setAppointmentDate(formatDateInput(target));
    setAppointmentTime(`${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`);
    setAppointmentReminder('60');
    setAppointmentNote('');
    setPlannedUCheckup(undefined);
    setFormErrors({});
    setAppointmentFormOpen(true);
  }

  function openEditAppointment(item: Appointment) {
    const date = new Date(item.scheduledAt);
    setEditingAppointmentId(item.id);
    setAppointmentTitle(item.title);
    setAppointmentDate(formatDateInput(date));
    setAppointmentTime(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
    setAppointmentReminder(item.reminderMinutes === undefined ? '' : String(item.reminderMinutes));
    setAppointmentNote(item.note ?? '');
    setPlannedUCheckup(undefined);
    setFormErrors({});
    setAppointmentFormOpen(true);
  }

  function closeAppointmentForm() {
    setAppointmentFormOpen(false);
    setEditingAppointmentId(undefined);
    setPlannedUCheckup(undefined);
  }

  function planUCheckup(item: UCheckup) {
    openNewAppointment(`${item.label}-Untersuchung`, item.start);
    setPlannedUCheckup(item);
  }

  async function saveAppointment() {
    if (!activeChild || saving) return;
    const date = parseGermanDateTime(appointmentDate, appointmentTime);
    const reminderText = appointmentReminder.trim();
    const reminderMinutes = reminderText ? Number(reminderText) : undefined;
    const nextErrors: Record<string, string> = {};
    if (!appointmentTitle.trim()) nextErrors.appointmentTitle = 'Bitte gib einen Titel für den Termin ein.';
    if (!date) nextErrors.appointmentDate = 'Bitte wähle ein gültiges Datum und eine gültige Uhrzeit.';
    if (reminderText && (reminderMinutes === undefined || !Number.isInteger(reminderMinutes) || reminderMinutes < 0 || reminderMinutes > 10080)) {
      nextErrors.appointmentReminder = 'Bitte wähle eine Erinnerung zwischen dem Terminzeitpunkt und sieben Tagen vorher.';
    }
    if (Object.keys(nextErrors).length) {
      setFormErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      const existing = appointments.find((item) => item.id === editingAppointmentId);
      await cancelReminder(existing?.reminderNotificationId);
      let reminderNotificationId: string | undefined;
      if (reminderMinutes !== undefined) {
        const reminderAt = new Date(date!.getTime() - reminderMinutes * 60 * 1000);
        if (reminderAt.getTime() > Date.now()) {
          const scheduled = await scheduleReminder(reminderAt, 'Terminerinnerung von Fieberwache', 'Öffne die App, um Termin und vorbereitete Fragen anzusehen.');
          reminderNotificationId = scheduled.status === 'scheduled' ? scheduled.id : undefined;
          if (scheduled.status !== 'scheduled') setFeedback(Platform.OS === 'web' ? 'Termin gespeichert. Browser können keine zuverlässigen Gerätealarme auslösen.' : 'Termin gespeichert. Die Benachrichtigung ist nicht freigegeben.');
        }
      }
      const entry = {
        title: appointmentTitle.trim(),
        scheduledAt: date!.toISOString(),
        reminderMinutes,
        note: appointmentNote.trim() || undefined,
        reminderNotificationId,
      };
      if (editingAppointmentId) updateAppointment(editingAppointmentId, entry);
      else addAppointment(entry);
      setFeedback((current) => current ?? (editingAppointmentId ? 'Termin aktualisiert.' : 'Termin gespeichert.'));
      closeAppointmentForm();
    } finally {
      setSaving(false);
    }
  }

  function requestDeleteAppointment(id: string) {
    setPendingDeleteAppointmentId(id);
  }

  async function confirmDeleteAppointment(id: string) {
    const item = appointments.find((candidate) => candidate.id === id);
    await cancelReminder(item?.reminderNotificationId);
    deleteAppointment(id);
    setPendingDeleteAppointmentId(undefined);
    setFeedback('Termin und zugehörige Erinnerung gelöscht.');
  }

  function renderAppointment(item: Appointment) {
    const date = new Date(item.scheduledAt);
    const pendingDelete = pendingDeleteAppointmentId === item.id;
    const reminderLabel = item.reminderMinutes === undefined
      ? undefined
      : item.reminderMinutes === 0
        ? 'zum Termin'
        : item.reminderMinutes === 60
          ? '1 Stunde vorher'
          : item.reminderMinutes === 1440
            ? '1 Tag vorher'
            : item.reminderMinutes === 10080
              ? '1 Woche vorher'
              : `${item.reminderMinutes} Minuten vorher`;
    return (
      <AppCard key={item.id} compact style={styles.appointmentCard}>
        <View style={styles.dateBadge}><Text style={styles.dateDay}>{String(date.getDate()).padStart(2, '0')}</Text><Text style={styles.dateMonth}>{new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(date).replace('.', '')}</Text></View>
        <View style={styles.appointmentCopy}>
          <Text style={styles.appointmentTitle}>{item.title}</Text>
          <Text style={styles.appointmentMeta}>{formatDate(date)} · {formatTime(date)} Uhr</Text>
          {reminderLabel ? <Text style={styles.appointmentReminder}>{item.reminderNotificationId ? 'Geräteerinnerung' : 'Erinnerungswunsch ohne aktiven Gerätealarm'}: {reminderLabel}</Text> : null}
          {item.note ? <Text style={styles.appointmentNote}>Fragen: {item.note}</Text> : null}
          {pendingDelete ? (
            <View style={styles.deleteConfirm}><Text style={styles.deleteConfirmText}>„{item.title}“ und die zugehörige Erinnerung wirklich löschen?</Text><View style={styles.deleteConfirmActions}><Pressable accessibilityRole="button" onPress={() => setPendingDeleteAppointmentId(undefined)} style={styles.cancelDeleteButton}><Text style={styles.cancelDeleteText}>Abbrechen</Text></Pressable><Pressable accessibilityRole="button" onPress={() => confirmDeleteAppointment(item.id)} style={styles.confirmDeleteButton}><Text style={styles.confirmDeleteText}>Löschen</Text></Pressable></View></View>
          ) : (
            <View style={styles.appointmentActions}><Pressable accessibilityRole="button" accessibilityLabel={`${item.title} bearbeiten`} onPress={() => openEditAppointment(item)} style={styles.appointmentActionButton}><Text style={styles.editText}>Bearbeiten</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${item.title} löschen`} onPress={() => requestDeleteAppointment(item.id)} style={styles.appointmentActionButton}><Text style={styles.deleteText}>Löschen</Text></Pressable></View>
          )}
        </View>
      </AppCard>
    );
  }

  if (!activeChild) {
    return <AppShell eyebrow="Arzt & Kalender" title="Termine"><EmptyChild /></AppShell>;
  }

  return (
    <AppShell eyebrow={`Für ${activeChild.name}`} title="Arzt & Kalender">
      {feedback ? <View accessibilityLiveRegion="polite" style={styles.feedback}><IconSymbol name="checkmark" size={18} color={Design.colors.sageStrong} /><Text style={styles.feedbackText}>{feedback}</Text><Pressable accessibilityRole="button" accessibilityLabel="Hinweis schließen" onPress={() => setFeedback(undefined)} style={styles.feedbackClose}><IconSymbol name="xmark" size={17} color={Design.colors.inkSoft} /></Pressable></View> : null}
      <AppCard style={styles.doctorCard}>
        <View style={styles.cardTop}>
          <View style={styles.cardIcon}><IconSymbol name="cross.case.fill" size={22} color={Design.colors.primaryDark} /></View>
          <View style={styles.cardHeading}><Text style={styles.cardTitle}>Kinderarzt</Text><Text style={styles.cardCopy}>Kontaktdaten für schnelle Rückfragen</Text></View>
          <InfoButton title="Kinderarzt" text="Hier kannst du die feste Kinderarztpraxis dieses Kinderprofils speichern und direkt anrufen." />
          {contact ? <Pressable accessibilityRole="button" accessibilityLabel="Kinderarzt bearbeiten" onPress={openDoctorForm} style={styles.smallButton}><IconSymbol name="pencil" size={16} color={Design.colors.primaryDark} /></Pressable> : null}
        </View>
        {contact && !doctorFormOpen ? (
          <View style={styles.contactDetails}>
            <Text style={styles.contactName}>{contact.name}</Text>
            {contact.phone ? <Pressable onPress={() => Linking.openURL(`tel:${contact.phone.replace(/[^+\d]/g, '')}`)}><Text style={styles.contactLink}>{contact.phone}</Text></Pressable> : null}
            {contact.address ? <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`)}><Text style={styles.contactAddress}>{contact.address}</Text></Pressable> : null}
            {pendingDeleteDoctor ? <View style={styles.deleteDoctorConfirm}><Text style={styles.deleteConfirmText}>Kinderarzt „{contact.name}“ aus diesem Profil entfernen?</Text><View style={styles.deleteConfirmActions}><AppButton label="Abbrechen" variant="secondary" compact style={styles.confirmFlex} onPress={() => setPendingDeleteDoctor(false)} /><AppButton label="Entfernen" variant="danger" compact style={styles.confirmFlex} onPress={() => { deleteDoctorContact(activeChild.id); setPendingDeleteDoctor(false); setFeedback('Kinderarzt entfernt.'); }} /></View></View> : <View style={styles.contactActions}><Pressable accessibilityRole="button" accessibilityLabel="Kinderarzt anrufen" onPress={() => Linking.openURL(`tel:${contact.phone.replace(/[^+\d]/g, '')}`)} disabled={!contact.phone} style={[styles.outlineButton, !contact.phone && styles.disabledButton]}><Text style={styles.outlineButtonText}>Anrufen</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Kinderarzt entfernen" onPress={() => setPendingDeleteDoctor(true)} style={styles.deleteButton}><Text style={styles.deleteButtonText}>Entfernen</Text></Pressable></View>}
          </View>
        ) : (
          <View style={styles.doctorForm}>
            {!contact ? <Text style={styles.emptyCopy}>Noch keine Praxis hinterlegt. Speichere Name, Telefonnummer und Adresse einmalig für dieses Kinderprofil.</Text> : null}
            <AppInput error={formErrors.doctorName} label="Praxis" value={doctorName} onChangeText={setDoctorName} placeholder="Name der Praxis" />
            <AppInput label="Telefonnummer" value={doctorPhone} onChangeText={setDoctorPhone} placeholder="Telefonnummer" keyboardType="phone-pad" />
            <AppInput label="Adresse" value={doctorAddress} onChangeText={setDoctorAddress} placeholder="Straße, Hausnummer und Ort" />
            <View style={styles.formActions}><AppButton label="Kinderarzt speichern" onPress={saveDoctor} />{contact ? <AppButton label="Abbrechen" variant="ghost" onPress={() => setDoctorFormOpen(false)} /> : null}</View>
          </View>
        )}
      </AppCard>

      <AppCard tone="lavender" elevated={false} style={styles.uCard}>
        <View style={styles.uHeader}>
          <View style={styles.uIcon}><Text style={styles.uIconText}>U</Text></View>
          <View style={styles.cardHeading}><Text style={styles.cardTitle}>U-Untersuchungen</Text><Text style={styles.cardCopy}>Automatisch aus dem Geburtsdatum berechnet</Text></View>
          <InfoButton title="U-Untersuchungen" text="Die Zeiträume werden automatisch aus dem Geburtsdatum berechnet. Mit „Planen“ kannst du daraus direkt einen Arzttermin anlegen." />
        </View>
        {!activeChild.birthDate ? (
          <Text style={styles.emptyCopy}>Hinterlege zuerst das Geburtsdatum im Kinderprofil, damit die Zeiträume berechnet werden können.</Text>
        ) : upcomingUCheckups.length === 0 ? (
          <Text style={styles.emptyCopy}>Die regulären U1–U9-Zeiträume liegen bei diesem Alter bereits zurück.</Text>
        ) : (
          <View style={styles.uList}>
            {upcomingUCheckups.slice(0, showAllUCheckups ? undefined : 1).map((item) => (
              <View key={item.id} style={styles.uRow}>
                <View style={[styles.uBadge, item.status === 'due' && styles.uBadgeDue]}><Text style={styles.uBadgeText}>{item.label}</Text></View>
                <View style={styles.uCopy}><Text style={styles.uWindow}>{item.windowLabel}</Text><Text style={styles.uDate}>{formatWindow(item.start, item.end)}</Text>{item.status === 'due' ? <Text style={styles.uDueText}>Jetzt im passenden Zeitraum</Text> : null}</View>
                <Pressable accessibilityRole="button" accessibilityLabel={`${item.label} als Termin planen`} onPress={() => planUCheckup(item)} style={styles.uPlanButton}><Text style={styles.uPlanText}>Planen</Text></Pressable>
              </View>
            ))}
          </View>
        )}
        {upcomingUCheckups.length > 1 ? <Pressable onPress={() => setShowAllUCheckups((current) => !current)} style={styles.uToggle}><Text style={styles.uToggleText}>{showAllUCheckups ? 'Weniger anzeigen' : `${upcomingUCheckups.length - 1} weitere U-Termine anzeigen`}</Text><Text style={styles.uToggleChevron}>{showAllUCheckups ? '⌃' : '⌄'}</Text></Pressable> : null}
        <Text style={styles.uHint}>Die Übersicht ist eine Planungshilfe und ersetzt nicht das gelbe Untersuchungsheft oder die ärztliche Terminabsprache.</Text>
      </AppCard>

      <AppSectionHeading title="Arzttermine" subtitle="Termine und Fragen im Blick" infoTitle="Arzttermine" infoText="Speichere Datum, Uhrzeit, Vorab-Erinnerung und Fragen für den Termin. Die Einträge bleiben auf diesem Gerät." action={<AppButton label="Termin" compact onPress={() => openNewAppointment()} icon={<IconSymbol name="plus" size={17} color="#FFFFFF" />} />} />

      <AppDialog
        visible={appointmentFormOpen}
        title={plannedUCheckup ? `${plannedUCheckup.label} planen` : editingAppointmentId ? 'Termin bearbeiten' : 'Neuer Arzttermin'}
        subtitle={plannedUCheckup ? `Empfohlener Zeitraum für ${activeChild.name}` : editingAppointmentId ? 'Datum, Erinnerung oder Fragen anpassen' : `Arzttermin für ${activeChild.name} eintragen`}
        onClose={closeAppointmentForm}
        footer={<AppButton label={saving ? 'Wird gespeichert …' : editingAppointmentId ? 'Änderungen speichern' : 'Termin speichern'} onPress={saveAppointment} disabled={saving} />}>
          {plannedUCheckup ? (
            <View style={styles.plannedUContext}>
              <View style={[styles.uBadge, plannedUCheckup.status === 'due' && styles.uBadgeDue]}><Text style={styles.uBadgeText}>{plannedUCheckup.label}</Text></View>
              <View style={styles.plannedUCopy}>
                <Text style={styles.plannedUTitle}>{plannedUCheckup.windowLabel}</Text>
                <Text style={styles.plannedUDate}>{formatWindow(plannedUCheckup.start, plannedUCheckup.end)}</Text>
                <Text style={styles.plannedUHint}>Der genaue Termin wird mit der Kinderarztpraxis vereinbart.</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.dialogInfoRow}>
            <Text style={styles.dialogInfoText}>Terminangaben</Text>
            <InfoButton title="Termin eintragen" text="Wähle eine verständliche Vorab-Erinnerung oder trage einen eigenen Minutenwert ein. Fragen bleiben nur innerhalb der App sichtbar." />
          </View>
          <AppInput error={formErrors.appointmentTitle} label="Termin" value={appointmentTitle} onChangeText={setAppointmentTitle} placeholder="z. B. U9-Vorsorge" />
          <View style={styles.row}><AppDateTimeInput error={formErrors.appointmentDate} label="Datum" value={appointmentDate} onChange={setAppointmentDate} containerStyle={styles.dateInput} /><AppDateTimeInput label="Uhrzeit" mode="time" value={appointmentTime} onChange={setAppointmentTime} containerStyle={styles.timeInput} /></View>
          <Text style={styles.reminderLabel}>Vorab-Erinnerung (optional)</Text>
          <View accessibilityRole="radiogroup" style={styles.reminderPresets}>{[{ label: 'Keine', value: '' }, { label: '1 Std.', value: '60' }, { label: '1 Tag', value: '1440' }, { label: '1 Woche', value: '10080' }].map((preset) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: appointmentReminder === preset.value }} key={preset.value || 'none'} onPress={() => setAppointmentReminder(preset.value)} style={[styles.reminderPreset, appointmentReminder === preset.value && styles.reminderPresetActive]}><Text style={[styles.reminderPresetText, appointmentReminder === preset.value && styles.reminderPresetTextActive]}>{preset.label}</Text></Pressable>)}</View>
          {!['', '60', '1440', '10080'].includes(appointmentReminder) ? <AppInput error={formErrors.appointmentReminder} label="Eigener Abstand" value={appointmentReminder} onChangeText={setAppointmentReminder} placeholder="Minuten" keyboardType="number-pad" suffix="Minuten" /> : null}
          <Pressable accessibilityRole="button" onPress={() => setAppointmentReminder('30')} style={styles.customReminderButton}><Text style={styles.customReminderText}>Eigenen Zeitpunkt verwenden</Text></Pressable>
          {Platform.OS === 'web' && appointmentReminder ? <Text style={styles.webReminderHint}>Im Browser wird der Termin gespeichert, aber kein zuverlässiger Gerätealarm ausgelöst.</Text> : null}
          <AppInput label="Fragen für den Termin" optional value={appointmentNote} onChangeText={setAppointmentNote} placeholder="Was möchtest du ansprechen?" multiline helper="Die Erinnerung wird nur aktiviert, wenn der Termin noch in der Zukunft liegt." />
      </AppDialog>

      {childAppointments.length === 0 ? <AppCard style={styles.emptyAppointments}><View style={styles.emptyAppointmentsIcon}><IconSymbol name="calendar-check" size={25} color={Design.colors.primaryDark} /></View><Text style={styles.emptyTitle}>Noch keine Termine</Text><Text style={styles.emptyCopy}>Lege den nächsten Arzttermin an und notiere deine Fragen direkt dazu.</Text></AppCard> : null}
      {upcomingAppointments.length ? <View style={styles.appointmentSection}><Text style={styles.appointmentSectionTitle}>Bevorstehend</Text>{upcomingAppointments.map(renderAppointment)}</View> : null}
      {pastAppointments.length ? <View style={styles.appointmentSection}><Pressable accessibilityRole="button" accessibilityState={{ expanded: showPastAppointments }} onPress={() => setShowPastAppointments((current) => !current)} style={styles.pastToggle}><View><Text style={styles.appointmentSectionTitle}>Vergangene Termine</Text><Text style={styles.pastToggleMeta}>{pastAppointments.length} gespeichert</Text></View><Text style={styles.pastToggleText}>{showPastAppointments ? 'Ausblenden' : 'Anzeigen'}</Text></Pressable>{showPastAppointments ? pastAppointments.map(renderAppointment) : null}</View> : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  feedback: { borderRadius: Design.radius.medium, backgroundColor: Design.colors.sage, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedbackText: { flex: 1, color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  feedbackClose: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.65)' },
  doctorCard: { gap: 15 },
  uCard: { gap: 13 },
  uHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  uIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  uIconText: { color: Design.colors.primaryDark, fontSize: 21, fontFamily: Design.fonts.extraBold },
  infoLink: { color: Design.colors.primaryDark, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  uList: { gap: 8 },
  uRow: { backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 19, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  uBadge: { width: 46, height: 40, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  uBadgeDue: { backgroundColor: Design.colors.peach },
  uBadgeText: { color: Design.colors.primaryDark, fontSize: 12, fontFamily: Design.fonts.extraBold },
  uCopy: { flex: 1, gap: 1 },
  uWindow: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  uDate: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 16, fontFamily: Design.fonts.regular },
  uDueText: { color: Design.colors.danger, fontSize: 11, lineHeight: 16, fontFamily: Design.fonts.bold },
  uPlanButton: { minHeight: 48, borderRadius: 15, backgroundColor: Design.colors.primaryDark, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  uPlanText: { color: '#FFFFFF', fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  uToggle: { minHeight: 42, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.6)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uToggleText: { color: Design.colors.primaryDark, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  uToggleChevron: { color: Design.colors.primaryDark, fontSize: 16, lineHeight: 16, fontFamily: Design.fonts.bold },
  uHint: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  cardIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardHeading: { flex: 1, gap: 2 },
  cardTitle: { color: Design.colors.ink, ...Design.type.section, fontFamily: Design.fonts.bold },
  cardCopy: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  smallButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  contactDetails: { gap: 5 },
  contactName: { color: Design.colors.ink, fontSize: 15, fontFamily: Design.fonts.extraBold },
  contactLink: { color: Design.colors.primary, fontSize: 13, fontFamily: Design.fonts.bold },
  contactAddress: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  contactActions: { flexDirection: 'row', gap: 8, marginTop: 7 },
  deleteDoctorConfirm: { borderRadius: Design.radius.medium, backgroundColor: Design.colors.dangerSoft, padding: 12, gap: 10 },
  confirmFlex: { flex: 1 },
  outlineButton: { flex: 1, height: 43, borderRadius: 15, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  outlineButtonText: { color: Design.colors.primaryDark, fontSize: 12, fontFamily: Design.fonts.extraBold },
  deleteButton: { height: 43, borderRadius: 15, backgroundColor: Design.colors.accentSoft, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  deleteButtonText: { color: Design.colors.danger, fontSize: 12, fontFamily: Design.fonts.extraBold },
  disabledButton: { opacity: 0.4 },
  doctorForm: { gap: 9 },
  emptyCopy: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  input: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: Design.colors.border, backgroundColor: '#FFFFFF', paddingHorizontal: 15, color: Design.colors.ink, fontSize: 13, fontFamily: Design.fonts.semiBold },
  formActions: { gap: 8 },
  primaryButton: { minHeight: 48, borderRadius: 16, backgroundColor: Design.colors.primaryDark, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontFamily: Design.fonts.extraBold },
  cancelButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { color: Design.colors.inkSoft, fontSize: 12, fontFamily: Design.fonts.bold },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sectionHeadingCopy: { flex: 1 },
  sectionTitle: { color: Design.colors.ink, ...Design.type.title, fontFamily: Design.fonts.bold },
  sectionHint: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular, marginTop: 2 },
  addButton: { backgroundColor: Design.colors.primaryDark, borderRadius: 15, paddingHorizontal: 13, minHeight: 40, justifyContent: 'center' },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontFamily: Design.fonts.extraBold },
  plannedUContext: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Design.radius.medium, backgroundColor: Design.colors.primarySoft, padding: 13 },
  plannedUCopy: { flex: 1, gap: 2 },
  plannedUTitle: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  plannedUDate: { color: Design.colors.primaryDark, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  plannedUHint: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 16, fontFamily: Design.fonts.regular },
  dialogInfoRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dialogInfoText: { color: Design.colors.ink, fontSize: 14, lineHeight: 20, fontFamily: Design.fonts.extraBold },
  row: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1.35 },
  timeInput: { flex: 0.8 },
  reminderLabel: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  reminderPresets: { flexDirection: 'row', gap: 6 },
  reminderPreset: { flex: 1, minHeight: 44, borderRadius: 15, borderWidth: 1, borderColor: Design.colors.border, backgroundColor: Design.colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  reminderPresetActive: { backgroundColor: Design.colors.primarySoft, borderColor: Design.colors.primary },
  reminderPresetText: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 15, fontFamily: Design.fonts.semiBold, textAlign: 'center' },
  reminderPresetTextActive: { color: Design.colors.primaryDark, fontFamily: Design.fonts.bold },
  customReminderButton: { minHeight: 44, borderRadius: 15, borderWidth: 1, borderStyle: 'dashed', borderColor: Design.colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  customReminderText: { color: Design.colors.primaryDark, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  webReminderHint: { borderRadius: 15, backgroundColor: Design.colors.yellow, color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular, padding: 12 },
  multiline: { minHeight: 86, paddingTop: 14, textAlignVertical: 'top' },
  helper: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  emptyAppointments: { alignItems: 'center', gap: 6 },
  emptyAppointmentsIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  emptyTitle: { color: Design.colors.ink, fontSize: 15, fontFamily: Design.fonts.extraBold },
  appointmentSection: { gap: 10 },
  appointmentSectionTitle: { color: Design.colors.ink, ...Design.type.section, fontFamily: Design.fonts.bold },
  pastToggle: { minHeight: 58, borderRadius: Design.radius.medium, backgroundColor: Design.colors.backgroundMuted, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pastToggleMeta: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 16, fontFamily: Design.fonts.regular, marginTop: 1 },
  pastToggleText: { color: Design.colors.primaryDark, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  appointmentCard: { flexDirection: 'row', gap: 12 },
  pastCard: { opacity: 0.62 },
  dateBadge: { width: 49, height: 56, borderRadius: 16, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dateDay: { color: Design.colors.primaryDark, fontSize: 20, lineHeight: 22, fontFamily: Design.fonts.extraBold },
  dateMonth: { color: Design.colors.primary, fontSize: 11, lineHeight: 15, textTransform: 'uppercase', fontFamily: Design.fonts.bold },
  appointmentCopy: { flex: 1, gap: 3 },
  appointmentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  appointmentTitle: { color: Design.colors.ink, fontSize: 14, flex: 1, fontFamily: Design.fonts.extraBold },
  pastPill: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 15, fontFamily: Design.fonts.bold },
  appointmentMeta: { color: Design.colors.primary, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  appointmentReminder: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular },
  appointmentNote: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, marginTop: 4, fontFamily: Design.fonts.regular },
  appointmentActions: { flexDirection: 'row', gap: 14, marginTop: 5 },
  appointmentActionButton: { minHeight: 44, justifyContent: 'center' },
  editText: { color: Design.colors.primary, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  deleteText: { color: Design.colors.danger, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  deleteConfirm: { backgroundColor: Design.colors.accentSoft, borderRadius: 14, padding: 10, marginTop: 6, gap: 8 },
  deleteConfirmText: { color: Design.colors.danger, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  deleteConfirmActions: { flexDirection: 'row', gap: 8 },
  cancelDeleteButton: { flex: 1, minHeight: 42, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  cancelDeleteText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  confirmDeleteButton: { flex: 1, minHeight: 42, borderRadius: 14, backgroundColor: Design.colors.danger, alignItems: 'center', justifyContent: 'center' },
  confirmDeleteText: { color: '#FFFFFF', fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
});
