import { useEffect, useState } from 'react';
import { router, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppShell } from '@/components/app-shell';
import { AvatarBuilder } from '@/components/avatar-builder';
import { AVATAR_BACKGROUNDS, ChildAvatar as ProfileAvatar, DEFAULT_CHILD_AVATAR, getDefaultChildAvatar, normalizeChildAvatar } from '@/components/child-avatar';
import { InfoButton } from '@/components/info-button';
import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppDateTimeInput } from '@/components/ui/app-date-time-input';
import { AppInput } from '@/components/ui/app-input';
import { AppSectionHeading } from '@/components/ui/app-section-heading';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';
import { useAuth } from '@/lib/auth';
import { Child, ChildGender, useStore } from '@/lib/store';
import { isValidBirthDate } from '@/lib/date-time';
import { cancelReminders } from '@/lib/notifications';
import { useSubscription } from '@/lib/subscription';

export default function FamilieScreen() {
  const { configured, guest, localMode, user } = useAuth();
  const store = useStore();
  const subscription = useSubscription();
  const { children, activeChildId, addChild, updateChild, deleteChild, setActiveChild, storageProtection, syncStatus } = store;
  const [showForm, setShowForm] = useState(children.length === 0);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<ChildGender>();
  const [avatar, setAvatar] = useState({ ...DEFAULT_CHILD_AVATAR });
  const [photoUri, setPhotoUri] = useState<string>();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string>();
  const [editName, setEditName] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editGender, setEditGender] = useState<ChildGender>();
  const [editAvatar, setEditAvatar] = useState({ ...DEFAULT_CHILD_AVATAR });
  const [editPhotoUri, setEditPhotoUri] = useState<string>();
  const [editAvatarOpen, setEditAvatarOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [profileFeedback, setProfileFeedback] = useState<string>();
  const [pendingDeleteId, setPendingDeleteId] = useState<string>();
  const pendingDeleteChild = children.find((child) => child.id === pendingDeleteId);

  useEffect(() => {
    if (children.length === 0) setShowForm(true);
  }, [children.length]);

  function submit() {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Bitte trage einen Vornamen oder Spitznamen ein.';
    if (!isValidBirthDate(birthDate)) nextErrors.birthDate = 'Bitte wähle ein gültiges Geburtsdatum, das nicht in der Zukunft liegt.';
    if (!gender) nextErrors.gender = 'Bitte wähle männlich oder weiblich aus.';
    if (Object.keys(nextErrors).length) {
      setFormErrors(nextErrors);
      return;
    }
    addChild(name, birthDate, gender, avatar, photoUri);
    setName('');
    setBirthDate('');
    setGender(undefined);
    setAvatar({ ...DEFAULT_CHILD_AVATAR });
    setPhotoUri(undefined);
    setAvatarOpen(false);
    setShowForm(false);
    setFormErrors({});
    setProfileFeedback('Kinderprofil gespeichert.');
  }

  function beginEdit(child: Child) {
    setEditingChildId(child.id);
    setEditName(child.name);
    setEditBirthDate(child.birthDate ?? '');
    setEditGender(child.gender);
    setEditAvatar(normalizeChildAvatar(child.avatar));
    setEditPhotoUri(child.photoUri);
    setEditAvatarOpen(false);
    setPendingDeleteId(undefined);
    setShowForm(false);
  }

  function submitEdit() {
    if (!editingChildId) return;
    const nextErrors: Record<string, string> = {};
    if (!editName.trim()) nextErrors.editName = 'Bitte trage einen Vornamen oder Spitznamen ein.';
    if (!isValidBirthDate(editBirthDate)) nextErrors.editBirthDate = 'Bitte wähle ein gültiges Geburtsdatum, das nicht in der Zukunft liegt.';
    if (!editGender) nextErrors.editGender = 'Bitte wähle männlich oder weiblich aus.';
    if (Object.keys(nextErrors).length) {
      setFormErrors(nextErrors);
      return;
    }
    updateChild(editingChildId, editName, editBirthDate, editGender, editAvatar, editPhotoUri);
    setEditingChildId(undefined);
    setEditAvatarOpen(false);
    setFormErrors({});
    setProfileFeedback('Profiländerungen gespeichert.');
  }

  async function chooseProfilePhoto(editing: boolean) {
    setFormErrors((current) => ({ ...current, photo: '' }));
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFormErrors((current) => ({ ...current, photo: 'Bitte erlaube den Fotozugriff in den Geräteeinstellungen.' }));
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const uri = asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri;
    if (editing) {
      setEditPhotoUri(uri);
      setEditAvatarOpen(false);
    } else {
      setPhotoUri(uri);
      setAvatarOpen(false);
    }
  }

  function selectGender(value: ChildGender, editing: boolean) {
    if (editing) {
      setEditGender(value);
      if (!editPhotoUri) setEditAvatar(getDefaultChildAvatar(value));
    } else {
      setGender(value);
      if (!photoUri) setAvatar(getDefaultChildAvatar(value));
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const notificationIds = [
      ...store.medications.filter((item) => item.childId === pendingDeleteId).map((item) => item.reminderNotificationId),
      ...store.appointments.filter((item) => item.childId === pendingDeleteId).map((item) => item.reminderNotificationId),
      ...(pendingDeleteId === activeChildId ? [store.temperatureNotificationId, ...(store.nightNotificationIds ?? [])] : []),
    ].filter((id): id is string => Boolean(id));
    await cancelReminders(notificationIds);
    deleteChild(pendingDeleteId);
    if (editingChildId === pendingDeleteId) setEditingChildId(undefined);
    setPendingDeleteId(undefined);
    setProfileFeedback('Kinderprofil und zugehörige Einträge gelöscht.');
  }

  return (
    <AppShell eyebrow="Profile & Einstellungen" title="Deine Familie">
      {profileFeedback ? <View accessibilityLiveRegion="polite" style={styles.successBanner}><IconSymbol name="checkmark" size={18} color={Design.colors.sageStrong} /><Text style={styles.successText}>{profileFeedback}</Text><Pressable accessibilityRole="button" accessibilityLabel="Hinweis schließen" onPress={() => setProfileFeedback(undefined)} style={styles.successClose}><IconSymbol name="xmark" size={17} color={Design.colors.inkSoft} /></Pressable></View> : null}
      {children.length > 0 ? (
        <View style={styles.childrenCard}>
          {children.map((child, index) => {
            const selected = child.id === activeChildId;
            return (
              <View key={child.id} style={[styles.childRow, index === children.length - 1 && styles.lastRow]}>
                <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={`${child.name} als aktives Kinderprofil auswählen`} onPress={() => setActiveChild(child.id)} style={styles.childMain}>
                  <View style={[styles.avatarWrap, selected && styles.avatarSelected]}><ProfileAvatar child={child} avatar={child.avatar ?? { ...DEFAULT_CHILD_AVATAR, backgroundColor: AVATAR_BACKGROUNDS[index % AVATAR_BACKGROUNDS.length] }} size={49} /></View>
                  <View style={styles.childCopy}>
                    <View style={styles.nameRow}><Text style={styles.childName}>{child.name}</Text>{selected ? <View style={styles.activePill}><Text style={styles.activePillText}>AKTIV</Text></View> : null}</View>
                    <Text style={styles.childMeta}>{[child.gender === 'male' ? 'Männlich' : child.gender === 'female' ? 'Weiblich' : undefined, child.birthDate ? `Geboren am ${child.birthDate}` : 'Geburtsdatum nicht hinterlegt'].filter(Boolean).join(' · ')}</Text>
                  </View>
                </Pressable>
                <View style={styles.profileActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${child.name} bearbeiten`} onPress={() => beginEdit(child)} style={styles.iconButton}>
                    <IconSymbol name="pencil" size={17} color={Design.colors.primaryDark} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${child.name} löschen`} onPress={() => { setPendingDeleteId(child.id); setEditingChildId(undefined); setShowForm(false); }} style={[styles.iconButton, styles.deleteIconButton]}>
                    <IconSymbol name="trash.fill" size={17} color={Design.colors.danger} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {editingChildId ? (
        <AppCard style={styles.formCard}>
          <View style={styles.formHeadingRow}>
            <View style={styles.formHeadingCopy}><View><Text style={styles.cardTitle}>Profil bearbeiten</Text><Text style={styles.cardCopy}>Änderungen gelten nur auf diesem Gerät.</Text></View><InfoButton title="Profil bearbeiten" text="Name und Geburtsdatum werden nur für dieses lokale Kinderprofil verwendet." /></View>
            <Pressable accessibilityLabel="Bearbeitung schließen" onPress={() => setEditingChildId(undefined)} style={styles.closeButton}><IconSymbol name="xmark" size={18} color={Design.colors.inkSoft} /></Pressable>
          </View>
          <AppInput error={formErrors.editName} label="Name" value={editName} onChangeText={setEditName} placeholder="Name" autoFocus />
          <AppDateTimeInput error={formErrors.editBirthDate} label="Geburtsdatum" value={editBirthDate} onChange={setEditBirthDate} maximumDate={new Date()} />
          <GenderSelector value={editGender} error={formErrors.editGender} onChange={(value) => selectGender(value, true)} />
          <ProfilePictureControls
            id={editingChildId}
            name={editName || 'Kind'}
            avatar={editAvatar}
            photoUri={editPhotoUri}
            avatarOpen={editAvatarOpen}
            onPickPhoto={() => chooseProfilePhoto(true)}
            onToggleAvatar={() => { setEditPhotoUri(undefined); setEditAvatarOpen((current) => !current); }}
            onRemovePhoto={() => setEditPhotoUri(undefined)}
          />
          {formErrors.photo ? <Text accessibilityLiveRegion="polite" style={styles.inlineError}>{formErrors.photo}</Text> : null}
          {editAvatarOpen ? <AvatarBuilder value={editAvatar} onChange={setEditAvatar} /> : null}
          <AppButton label="Änderungen speichern" onPress={submitEdit} disabled={!editName.trim()} />
        </AppCard>
      ) : null}

      {pendingDeleteChild ? (
        <AppCard tone="danger" elevated={false} style={styles.deleteCard}>
          <View style={styles.deleteHeader}><View style={styles.deleteWarning}><IconSymbol name="triangle-alert" size={20} color={Design.colors.danger} /></View><View style={styles.deleteCopy}><Text style={styles.deleteTitle}>{pendingDeleteChild.name} löschen?</Text><Text style={styles.deleteText}>Das Profil und alle zugehörigen Messungen und Medikamenteneinträge werden dauerhaft von diesem Gerät entfernt.</Text></View></View>
          <View style={styles.deleteButtons}><AppButton label="Abbrechen" variant="secondary" onPress={() => setPendingDeleteId(undefined)} style={styles.flexButton} /><AppButton label="Profil löschen" variant="danger" onPress={confirmDelete} style={styles.flexButton} /></View>
        </AppCard>
      ) : null}

      {showForm && !editingChildId && !pendingDeleteChild ? (
        <AppCard style={styles.formCard}>
          <View style={styles.formIcon}><IconSymbol name="heart" size={25} color={Design.colors.primary} /></View>
          <View style={styles.formHeadingCopy}><Text style={styles.cardTitle}>Wer darf mit rein?</Text><InfoButton title="Kinderprofil" text="Lege hier ein Profil pro Kind an. Das Geburtsdatum wird außerdem für die Temperatur- und U-Untersuchungsorientierung genutzt." /></View>
          <Text style={styles.cardCopy}>Ein Vorname oder Spitzname reicht für den Anfang.</Text>
          <AppInput error={formErrors.name} label="Name" value={name} onChangeText={setName} placeholder="z. B. Mila" autoFocus />
          <AppDateTimeInput error={formErrors.birthDate} label="Geburtsdatum" value={birthDate} onChange={setBirthDate} maximumDate={new Date()} />
          <GenderSelector value={gender} error={formErrors.gender} onChange={(value) => selectGender(value, false)} />
          <ProfilePictureControls
            id="preview"
            name={name || 'Kind'}
            avatar={avatar}
            photoUri={photoUri}
            avatarOpen={avatarOpen}
            onPickPhoto={() => chooseProfilePhoto(false)}
            onToggleAvatar={() => { setPhotoUri(undefined); setAvatarOpen((current) => !current); }}
            onRemovePhoto={() => setPhotoUri(undefined)}
          />
          {formErrors.photo ? <Text accessibilityLiveRegion="polite" style={styles.inlineError}>{formErrors.photo}</Text> : null}
          {avatarOpen ? <AvatarBuilder value={avatar} onChange={setAvatar} /> : null}
          <AppButton label="Profil speichern" onPress={submit} disabled={!name.trim()} />
          {children.length > 0 ? <Pressable onPress={() => setShowForm(false)}><Text style={styles.cancel}>Abbrechen</Text></Pressable> : null}
        </AppCard>
      ) : !editingChildId && !pendingDeleteChild ? (
        <AppButton label="Weiteres Kinderprofil" variant="soft" onPress={() => setShowForm(true)} icon={<IconSymbol name="plus" size={19} color={Design.colors.primaryDark} />} />
      ) : null}

      <AppSectionHeading title="Fieberwache Plus" subtitle="Testzeitraum und Tarif" infoTitle="Fieberwache Plus" infoText="Du kannst alle Funktionen sieben Tage kostenlos testen. Danach benötigst du einen Monats- oder Jahrestarif." />
      <AppCard tone="sage" elevated={false} compact style={styles.subscriptionCard}>
        <View style={styles.subscriptionIcon}><IconSymbol name="sparkles" size={21} color={Design.colors.primaryDark} /></View>
        <View style={styles.subscriptionCopy}>
          <Text style={styles.subscriptionTitle}>{subscription.previewSubscriptionActive ? 'Test-Abo aktiv' : subscription.trialActive ? 'Kostenloser Test aktiv' : 'Tarif auswählen'}</Text>
          <Text style={styles.subscriptionMeta}>{subscription.previewSubscriptionActive ? (subscription.selectedPlan === 'annual' ? '12-Monats-Tarif · Testmodus' : 'Monatstarif · Testmodus') : subscription.trialActive ? `Noch ${subscription.trialDaysRemaining} ${subscription.trialDaysRemaining === 1 ? 'Tag' : 'Tage'} kostenlos` : '7 Tage kostenlos testen'}</Text>
        </View>
        <AppButton label="Tarife" variant="secondary" compact onPress={() => router.push('/paywall' as Href)} />
      </AppCard>

      <AppSectionHeading title="Konto & Sicherheit" subtitle="Zugang, Geräteschutz und Synchronisierung" infoTitle="Konto & Sicherheit" infoText="Auf iPhone und Android werden lokale App-Daten verschlüsselt. Im Browser liegen sie nur im jeweiligen Browserprofil. Mit konfiguriertem Online-Konto können sie zusätzlich synchronisiert werden." />
      <AppCard tone={guest ? 'sage' : 'lavender'} elevated={false} compact style={styles.accountCard}>
        <View style={styles.accountIcon}><IconSymbol name="person.2.fill" size={21} color={Design.colors.primaryDark} /></View>
        <View style={styles.accountCopy}><Text style={styles.accountName}>{user?.name ?? (localMode === 'preview' ? 'Öffentliches Testkonto' : 'Lokaler Testmodus')}</Text><Text style={styles.accountMeta}>{user?.email ?? (storageProtection === 'encrypted-device' ? 'Verschlüsselt auf diesem Gerät' : 'Nur in diesem Browserprofil')}</Text><Text style={styles.syncMeta}>{user ? syncStatus === 'synced' ? 'Synchronisiert' : syncStatus === 'syncing' ? 'Synchronisierung läuft …' : syncStatus === 'error' ? 'Synchronisierung pausiert' : 'Lokal gespeichert' : configured ? 'Ohne Cloud-Synchronisierung' : 'Online-Zugang noch nicht konfiguriert'}</Text></View>
        <AppButton label="Abmelden" variant="secondary" compact onPress={() => router.push('/logout' as Href)} />
      </AppCard>

      <AppSectionHeading title="Gut zu wissen" infoTitle="Gut zu wissen" infoText="Hier findest du wichtige Hinweise zu Dokumentation, Sicherheit und Datenschutz der App." />
      <AppCard style={styles.safetyCard}>
        <View style={styles.safetyRow}>
          <View style={[styles.infoIcon, { backgroundColor: Design.colors.primarySoft }]}><IconSymbol name="sparkles" size={19} color={Design.colors.primaryDark} /></View>
          <View style={styles.safetyCopyWrap}><Text style={styles.safetyTitle}>Dokumentation, keine Diagnose</Text><Text style={styles.safetyCopy}>Fieberwache bewertet weder Dosierung noch Einnahmeabstand.</Text></View>
        </View>
        <View style={styles.divider} />
        <View style={styles.safetyRow}>
          <View style={[styles.infoIcon, { backgroundColor: Design.colors.accentSoft }]}><IconSymbol name="triangle-alert" size={19} color={Design.colors.danger} /></View>
          <View style={styles.safetyCopyWrap}><Text style={styles.safetyTitle}>Bei akuter Gefahr</Text><Text style={styles.safetyCopy}>Rettungsdienst 112 kontaktieren. Bei Unsicherheit ärztlichen Rat einholen.</Text></View>
        </View>
        <Pressable style={styles.sourceButton} onPress={() => Linking.openURL('https://www.kindergesundheit-info.de/themen/krankes-kind/krankheitszeichen/fieber/')}>
          <Text style={styles.sourceLink}>Offizielle Hinweise öffnen</Text><Text style={styles.sourceArrow}>↗</Text>
        </Pressable>
      </AppCard>

      <AppCard tone="sage" compact elevated={false} style={styles.privacyCard}>
        <View style={styles.lockIcon}><IconSymbol name="shield-check" size={21} color={Design.colors.sageStrong} /></View>
        <View style={styles.privacyCopyWrap}><Text style={styles.privacyTitle}>{storageProtection === 'encrypted-device' ? 'Lokal verschlüsselt' : 'Browserlokal gespeichert'}</Text><Text style={styles.privacyCopy}>{storageProtection === 'encrypted-device' ? 'Der lokale Datensatz wird mit einem gerätegebundenen Schlüssel verschlüsselt.' : 'Browserdaten sind nicht geräteverschlüsselt und können beim Löschen der Websitedaten verloren gehen.'}</Text></View>
      </AppCard>
    </AppShell>
  );
}

function GenderSelector({ value, error, onChange }: { value?: ChildGender; error?: string; onChange: (value: ChildGender) => void }) {
  return (
    <View style={styles.genderField}>
      <Text style={styles.fieldLabel}>Geschlecht</Text>
      <View accessibilityRole="radiogroup" style={styles.genderOptions}>
        {([['male', 'Männlich'], ['female', 'Weiblich']] as const).map(([genderValue, label]) => {
          const selected = value === genderValue;
          return (
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} key={genderValue} onPress={() => onChange(genderValue)} style={({ pressed }) => [styles.genderOption, selected && styles.genderOptionSelected, pressed && styles.genderOptionPressed]}>
              <View style={[styles.genderRadio, selected && styles.genderRadioSelected]}>{selected ? <View style={styles.genderRadioDot} /> : null}</View>
              <Text style={[styles.genderText, selected && styles.genderTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.inlineError}>{error}</Text> : null}
    </View>
  );
}

function ProfilePictureControls({ id, name, avatar, photoUri, avatarOpen, onPickPhoto, onToggleAvatar, onRemovePhoto }: { id: string; name: string; avatar: typeof DEFAULT_CHILD_AVATAR; photoUri?: string; avatarOpen: boolean; onPickPhoto: () => void; onToggleAvatar: () => void; onRemovePhoto: () => void }) {
  return (
    <View style={styles.avatarDisclosure}>
      <View style={styles.avatarSummary}>
        <ProfileAvatar child={{ id, name, photoUri }} avatar={avatar} size={72} />
        <View style={styles.avatarSummaryCopy}>
          <Text style={styles.avatarSummaryTitle}>{photoUri ? 'Eigenes Profilfoto' : 'Standard-Avatar'}</Text>
          <Text style={styles.avatarSummaryText}>{photoUri ? 'Das ausgewählte Bild wird für dieses Kinderprofil verwendet.' : 'Wird passend zur Geschlechtsauswahl erstellt und kann angepasst werden.'}</Text>
        </View>
      </View>
      <View style={styles.avatarActions}>
        <AppButton label={photoUri ? 'Foto ändern' : 'Eigenes Foto'} variant="secondary" compact onPress={onPickPhoto} style={styles.avatarAction} />
        <AppButton label={avatarOpen ? 'Avatar schließen' : 'Avatar gestalten'} variant="soft" compact onPress={onToggleAvatar} style={styles.avatarAction} />
      </View>
      {photoUri ? <Pressable accessibilityRole="button" onPress={onRemovePhoto} style={styles.removePhotoButton}><Text style={styles.removePhotoText}>Foto entfernen und Avatar verwenden</Text></Pressable> : null}
      <Text style={styles.photoPrivacy}>Das Foto wird als Teil des Kinderprofils gespeichert. Hinterlege nur ein Bild, das du dafür verwenden möchtest.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  successBanner: { borderRadius: Design.radius.medium, backgroundColor: Design.colors.sage, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  successText: { flex: 1, color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  successClose: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.62)' },
  childrenCard: { gap: 10 },
  childRow: { flexDirection: 'row', alignItems: 'center', minHeight: 92, paddingHorizontal: 13, backgroundColor: Design.colors.surface, borderRadius: Design.radius.large, borderWidth: 1, borderColor: Design.colors.border, ...Design.shadow.card },
  lastRow: {},
  childMain: { flex: 1, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  avatarWrap: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarSelected: { borderWidth: 2, borderColor: '#FFFFFF', shadowColor: Design.colors.shadow, shadowOpacity: 0.18, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
  childCopy: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  childName: { color: Design.colors.ink, fontSize: 16, lineHeight: 22, fontFamily: Design.fonts.bold },
  childMeta: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular, marginTop: 2 },
  activePill: { backgroundColor: Design.colors.primarySoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  activePillText: { color: Design.colors.primaryDark, fontSize: 11, lineHeight: 14, fontFamily: Design.fonts.bold },
  profileActions: { flexDirection: 'row', gap: 5, marginLeft: 7 },
  iconButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  deleteIconButton: { backgroundColor: Design.colors.accentSoft },
  formCard: { gap: 12 },
  formIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  formIconText: { color: Design.colors.primary, fontSize: 28 },
  cardTitle: { color: Design.colors.ink, ...Design.type.title, fontFamily: Design.fonts.bold },
  cardCopy: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular, marginBottom: 3 },
  formHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  formHeadingCopy: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 9 },
  avatarDisclosure: { borderRadius: Design.radius.large, backgroundColor: Design.colors.primarySoft, padding: 14, gap: 12 },
  avatarSummary: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatarSummaryCopy: { flex: 1, gap: 2 },
  avatarSummaryTitle: { color: Design.colors.ink, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  avatarSummaryText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  avatarActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatarAction: { flexGrow: 1, flexBasis: 145 },
  removePhotoButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  removePhotoText: { color: Design.colors.danger, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.bold },
  photoPrivacy: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 16, fontFamily: Design.fonts.regular },
  fieldLabel: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  genderField: { gap: 8 },
  genderOptions: { flexDirection: 'row', gap: 10 },
  genderOption: { flex: 1, minHeight: 52, borderRadius: 17, borderWidth: 1, borderColor: Design.colors.border, backgroundColor: Design.colors.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  genderOptionSelected: { borderColor: Design.colors.primary, backgroundColor: Design.colors.primarySoft },
  genderOptionPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  genderRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Design.colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  genderRadioSelected: { borderColor: Design.colors.primary },
  genderRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Design.colors.primary },
  genderText: { color: Design.colors.inkSoft, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.semiBold },
  genderTextSelected: { color: Design.colors.primaryDark, fontFamily: Design.fonts.bold },
  inlineError: { color: Design.colors.danger, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.semiBold },
  closeButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: Design.colors.backgroundMuted, alignItems: 'center', justifyContent: 'center' },
  cancel: { color: Design.colors.inkSoft, textAlign: 'center', fontSize: 12, fontFamily: Design.fonts.bold, paddingTop: 4 },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  subscriptionCard: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  subscriptionIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  subscriptionCopy: { flex: 1, gap: 2 },
  subscriptionTitle: { color: Design.colors.ink, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  subscriptionMeta: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular },
  accountIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  accountCopy: { flex: 1, gap: 2 },
  accountName: { color: Design.colors.ink, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  accountMeta: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.regular },
  syncMeta: { color: Design.colors.primaryDark, fontSize: 11, lineHeight: 16, fontFamily: Design.fonts.bold },
  safetyCard: { gap: 13 },
  safetyRow: { flexDirection: 'row', gap: 12 },
  infoIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  infoEmoji: { color: Design.colors.primaryDark, fontSize: 17, fontFamily: Design.fonts.extraBold },
  safetyCopyWrap: { flex: 1, gap: 2 },
  safetyTitle: { color: Design.colors.ink, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  safetyCopy: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  divider: { height: 1, backgroundColor: Design.colors.border },
  sourceButton: { height: 43, borderRadius: 15, backgroundColor: Design.colors.background, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sourceLink: { color: Design.colors.primary, fontSize: 12, fontFamily: Design.fonts.extraBold },
  sourceArrow: { color: Design.colors.primary, fontSize: 15, fontFamily: Design.fonts.bold },
  privacyCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lockIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  lockEmoji: { color: '#5C8C7E', fontSize: 21, fontFamily: Design.fonts.extraBold },
  privacyCopyWrap: { flex: 1 },
  privacyTitle: { color: Design.colors.ink, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  privacyCopy: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular, marginTop: 2 },
  deleteCard: { gap: 17, borderWidth: 1, borderColor: '#F4D6CF' },
  deleteHeader: { flexDirection: 'row', gap: 12 },
  deleteWarning: { width: 40, height: 40, borderRadius: 14, backgroundColor: Design.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  deleteWarningText: { color: Design.colors.danger, fontSize: 18, fontFamily: Design.fonts.extraBold },
  deleteCopy: { flex: 1, gap: 3 },
  deleteTitle: { color: Design.colors.ink, fontSize: 15, fontFamily: Design.fonts.extraBold },
  deleteText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  deleteButtons: { flexDirection: 'row', gap: 9 },
  flexButton: { flex: 1 },
});
