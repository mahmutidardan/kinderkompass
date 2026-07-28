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
import { AppDialog } from '@/components/ui/app-dialog';
import { AppInput } from '@/components/ui/app-input';
import { AppSectionHeading } from '@/components/ui/app-section-heading';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';
import { useAuth } from '@/lib/auth';
import { Child, ChildGender, useStore } from '@/lib/store';
import { formatGermanDate, isValidBirthDate, parseGermanDate } from '@/lib/date-time';
import { cancelReminders } from '@/lib/notifications';
import { useSubscription } from '@/lib/subscription';
import { FamilyAccessOptions, FamilyMember, FamilyRole, useFamilySharing } from '@/lib/family-sharing';

export default function FamilieScreen() {
  const { configured, guest, localMode, user } = useAuth();
  const store = useStore();
  const subscription = useSubscription();
  const sharing = useFamilySharing();
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<FamilyRole>('caregiver');
  const [inviteChildIds, setInviteChildIds] = useState<string[]>([]);
  const [inviteExpiryDate, setInviteExpiryDate] = useState('');
  const [inviteError, setInviteError] = useState<string>();
  const [inviteFeedback, setInviteFeedback] = useState<string>();
  const [pendingMemberRemoval, setPendingMemberRemoval] = useState<FamilyMember>();
  const [editingMember, setEditingMember] = useState<FamilyMember>();
  const [memberRole, setMemberRole] = useState<FamilyRole>('caregiver');
  const [memberChildIds, setMemberChildIds] = useState<string[]>([]);
  const [memberExpiryDate, setMemberExpiryDate] = useState('');
  const pendingDeleteChild = children.find((child) => child.id === pendingDeleteId);
  const canManageProfiles = !sharing.enabled || sharing.canManageFamily;
  const usesSharedFamily = Boolean(sharing.enabled && sharing.activeFamily);

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

  async function sendFamilyInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setInviteError('Bitte trage eine gültige E-Mail-Adresse ein.');
      return;
    }
    const access = accessOptions(inviteRole, inviteChildIds, inviteExpiryDate);
    if (!access) {
      setInviteError('Bitte wähle für den zeitlich begrenzten Zugang ein zukünftiges Enddatum.');
      return;
    }
    setInviteError(undefined);
    try {
      const delivery = await sharing.inviteMember(email, access);
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('caregiver');
      setInviteChildIds([]);
      setInviteExpiryDate('');
      setInviteFeedback(delivery === 'email-sent' ? 'Einladung wurde per E-Mail gesendet.' : 'Einladung ist hinterlegt. Die Person kann sie nach der Anmeldung annehmen.');
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Die Einladung konnte nicht gesendet werden.');
    }
  }

  function beginMemberEdit(member: FamilyMember) {
    setEditingMember(member);
    setMemberRole(member.role);
    setMemberChildIds(member.allChildren ? [] : member.childIds);
    setMemberExpiryDate(member.accessExpiresAt ? formatGermanDate(new Date(member.accessExpiresAt)) : '');
  }

  async function saveMemberAccess() {
    if (!editingMember) return;
    const access = accessOptions(memberRole, memberChildIds, memberExpiryDate);
    if (!access) {
      setInviteFeedback('Bitte wähle ein zukünftiges Enddatum für den zeitlich begrenzten Zugang.');
      return;
    }
    try {
      await sharing.updateMemberAccess(editingMember.userId, access);
      setEditingMember(undefined);
      setInviteFeedback('Zugriff wurde aktualisiert.');
    } catch {
      setInviteFeedback('Der Zugriff konnte nicht aktualisiert werden.');
    }
  }

  async function confirmMemberRemoval() {
    if (!pendingMemberRemoval) return;
    try {
      await sharing.removeMember(pendingMemberRemoval.userId);
      setInviteFeedback(`${pendingMemberRemoval.displayName || pendingMemberRemoval.email} wurde aus der Familie entfernt.`);
      setPendingMemberRemoval(undefined);
    } catch {
      setInviteFeedback('Die Person konnte nicht entfernt werden.');
    }
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
                {canManageProfiles ? <View style={styles.profileActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${child.name} bearbeiten`} onPress={() => beginEdit(child)} style={styles.iconButton}>
                    <IconSymbol name="pencil" size={17} color={Design.colors.primaryDark} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${child.name} löschen`} onPress={() => { setPendingDeleteId(child.id); setEditingChildId(undefined); setShowForm(false); }} style={[styles.iconButton, styles.deleteIconButton]}>
                    <IconSymbol name="trash.fill" size={17} color={Design.colors.danger} />
                  </Pressable>
                </View> : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {editingChildId && canManageProfiles ? (
        <AppCard style={styles.formCard}>
          <View style={styles.formHeadingRow}>
            <View style={styles.formHeadingCopy}><View><Text style={styles.cardTitle}>Profil bearbeiten</Text><Text style={styles.cardCopy}>{usesSharedFamily ? 'Änderungen werden mit der Familie synchronisiert.' : 'Änderungen gelten nur auf diesem Gerät.'}</Text></View><InfoButton title="Profil bearbeiten" text={usesSharedFamily ? 'Besitzer können Name und Geburtsdatum für den gemeinsamen Familienbereich bearbeiten.' : 'Name und Geburtsdatum werden nur für dieses lokale Kinderprofil verwendet.'} /></View>
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
          <View style={styles.deleteHeader}><View style={styles.deleteWarning}><IconSymbol name="triangle-alert" size={20} color={Design.colors.danger} /></View><View style={styles.deleteCopy}><Text style={styles.deleteTitle}>{pendingDeleteChild.name} löschen?</Text><Text style={styles.deleteText}>Das Profil und alle zugehörigen Messungen und Medikamenteneinträge werden dauerhaft {usesSharedFamily ? 'aus dem gemeinsamen Familienbereich' : 'von diesem Gerät'} entfernt.</Text></View></View>
          <View style={styles.deleteButtons}><AppButton label="Abbrechen" variant="secondary" onPress={() => setPendingDeleteId(undefined)} style={styles.flexButton} /><AppButton label="Profil löschen" variant="danger" onPress={confirmDelete} style={styles.flexButton} /></View>
        </AppCard>
      ) : null}

      {showForm && !editingChildId && !pendingDeleteChild && canManageProfiles ? (
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
      ) : !editingChildId && !pendingDeleteChild && canManageProfiles ? (
        <AppButton label="Weiteres Kinderprofil" variant="soft" onPress={() => setShowForm(true)} icon={<IconSymbol name="plus" size={19} color={Design.colors.primaryDark} />} />
      ) : null}

      <AppSectionHeading title="Familienzugriff" subtitle="Gemeinsam dokumentieren und informiert bleiben" infoTitle="Familienzugriff" infoText="Du legst pro Person Rolle, Kinderzugriff und bei Bedarf ein Ablaufdatum fest. Schreibgeschützte Personen sehen nur die freigegebenen Kinder und können keine Einträge ändern." />
      {inviteFeedback ? <View accessibilityLiveRegion="polite" style={styles.successBanner}><IconSymbol name="checkmark" size={18} color={Design.colors.sageStrong} /><Text style={styles.successText}>{inviteFeedback}</Text><Pressable accessibilityRole="button" accessibilityLabel="Hinweis schließen" onPress={() => setInviteFeedback(undefined)} style={styles.successClose}><IconSymbol name="xmark" size={17} color={Design.colors.inkSoft} /></Pressable></View> : null}
      {!sharing.enabled ? (
        <AppCard tone="lavender" elevated={false} style={styles.sharingUnavailable}>
          <View style={styles.sharingIcon}><IconSymbol name="person.2.fill" size={22} color={Design.colors.primaryDark} /></View>
          <View style={styles.sharingCopy}><Text style={styles.sharingTitle}>Online-Konto erforderlich</Text><Text style={styles.sharingText}>Einladungen und gemeinsamer Datenzugriff funktionieren nach der Anmeldung mit einem konfigurierten Online-Konto. Der lokale Testzugang bleibt nur auf diesem Gerät.</Text></View>
        </AppCard>
      ) : (
        <>
          {sharing.error ? <View style={styles.sharingError}><Text style={styles.sharingErrorTitle}>Familienbereich nicht erreichbar</Text><Text style={styles.sharingText}>{sharing.error}</Text><AppButton label="Erneut versuchen" compact variant="secondary" onPress={sharing.refresh} /></View> : null}
          {sharing.pendingInvites.map((invite) => (
            <AppCard key={invite.id} tone="sage" elevated={false} style={styles.pendingInviteCard}>
              <View style={styles.sharingIcon}><IconSymbol name="paperplane.fill" size={20} color={Design.colors.primaryDark} /></View>
              <View style={styles.sharingCopy}><Text style={styles.sharingTitle}>Einladung zu {invite.familyName}</Text><Text style={styles.sharingText}>{roleDescription(invite.role)}{invite.childIds.length ? ` · ${invite.childIds.length} Kind${invite.childIds.length === 1 ? '' : 'er'}` : ' · alle Kinder'}</Text></View>
              <View style={styles.pendingInviteActions}><AppButton label="Ablehnen" compact variant="secondary" onPress={() => sharing.rejectInvite(invite.id).catch(() => setInviteFeedback('Die Einladung konnte nicht abgelehnt werden.'))} /><AppButton label="Annehmen" compact onPress={() => sharing.acceptInvite(invite.id).catch(() => setInviteFeedback('Die Einladung konnte nicht angenommen werden.'))} /></View>
            </AppCard>
          ))}
          {sharing.families.length > 1 ? <View accessibilityRole="radiogroup" style={styles.familySwitcher}>{sharing.families.map((family) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: family.id === sharing.activeFamily?.id }} key={family.id} onPress={() => sharing.setActiveFamily(family.id)} style={[styles.familyChoice, family.id === sharing.activeFamily?.id && styles.familyChoiceActive]}><Text style={[styles.familyChoiceText, family.id === sharing.activeFamily?.id && styles.familyChoiceTextActive]}>{family.name}</Text></Pressable>)}</View> : null}
          <AppCard style={styles.membersCard}>
            <View style={styles.membersHeader}><View><Text style={styles.sharingTitle}>{sharing.activeFamily?.name ?? 'Meine Familie'}</Text><Text style={styles.sharingText}>{sharing.members.length} {sharing.members.length === 1 ? 'Person' : 'Personen'} mit Zugriff</Text></View>{sharing.canManageFamily ? <AppButton label="Person einladen" compact variant="soft" onPress={() => setInviteOpen(true)} icon={<IconSymbol name="plus" size={17} color={Design.colors.primaryDark} />} /> : null}</View>
            <View style={styles.memberList}>{sharing.members.map((member, index) => (
              <View key={member.userId} style={[styles.memberRow, index < sharing.members.length - 1 && styles.memberDivider]}>
                <View style={styles.memberAvatar}><Text style={styles.memberInitial}>{(member.displayName || member.email).slice(0, 1).toUpperCase()}</Text></View>
                <View style={styles.sharingCopy}><View style={styles.memberNameRow}><Text style={styles.memberName}>{member.displayName || member.email.split('@')[0]}</Text><View style={styles.rolePill}><Text style={styles.roleText}>{roleLabel(member.role)}</Text></View></View><Text style={styles.memberEmail}>{member.email}</Text><Text style={styles.memberScope}>{member.allChildren ? 'Alle Kinder' : `${member.childIds.length} Kind${member.childIds.length === 1 ? '' : 'er'} freigegeben`}{member.accessExpiresAt ? ` · bis ${formatGermanDate(new Date(member.accessExpiresAt))}` : ''}</Text></View>
                {sharing.canManageFamily ? <View style={styles.memberActions}><Pressable accessibilityRole="button" accessibilityLabel={`${member.displayName || member.email} Zugriff bearbeiten`} onPress={() => beginMemberEdit(member)} style={styles.editMemberButton}><IconSymbol name="pencil" size={16} color={Design.colors.primaryDark} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${member.displayName || member.email} entfernen`} onPress={() => setPendingMemberRemoval(member)} style={styles.removeMemberButton}><IconSymbol name="trash.fill" size={16} color={Design.colors.danger} /></Pressable></View> : null}
              </View>
            ))}</View>
            {sharing.canManageFamily && sharing.invites.length > 0 ? <View style={styles.openInvites}><Text style={styles.openInvitesTitle}>Offene Einladungen</Text>{sharing.invites.map((invite) => <View key={invite.id} style={styles.inviteRow}><View style={styles.sharingCopy}><Text style={styles.memberName}>{invite.email}</Text><Text style={styles.memberEmail}>{roleLabel(invite.role)} · {invite.childIds.length ? `${invite.childIds.length} Kind${invite.childIds.length === 1 ? '' : 'er'}` : 'alle Kinder'} · gültig bis {formatGermanDate(new Date(invite.expiresAt))}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Einladung an ${invite.email} widerrufen`} onPress={() => sharing.revokeInvite(invite.id).catch(() => setInviteFeedback('Die Einladung konnte nicht widerrufen werden.'))} style={styles.removeMemberButton}><IconSymbol name="xmark" size={16} color={Design.colors.danger} /></Pressable></View>)}</View> : null}
          </AppCard>
        </>
      )}

      {sharing.canManageFamily ? <>
        <AppSectionHeading title="Fieberwache Plus" subtitle="Testzeitraum und Tarif" infoTitle="Fieberwache Plus" infoText="Du kannst alle Funktionen sieben Tage kostenlos testen. Danach benötigst du einen Monats- oder Jahrestarif." />
        <AppCard tone="sage" elevated={false} compact style={styles.subscriptionCard}>
          <View style={styles.subscriptionIcon}><IconSymbol name="sparkles" size={21} color={Design.colors.primaryDark} /></View>
          <View style={styles.subscriptionCopy}>
            <Text style={styles.subscriptionTitle}>{subscription.previewSubscriptionActive ? 'Test-Abo aktiv' : subscription.trialActive ? 'Kostenloser Test aktiv' : 'Tarif auswählen'}</Text>
            <Text style={styles.subscriptionMeta}>{subscription.previewSubscriptionActive ? (subscription.selectedPlan === 'annual' ? '12-Monats-Tarif · Testmodus' : 'Monatstarif · Testmodus') : subscription.trialActive ? `Noch ${subscription.trialDaysRemaining} ${subscription.trialDaysRemaining === 1 ? 'Tag' : 'Tage'} kostenlos` : '7 Tage kostenlos testen'}</Text>
          </View>
          <AppButton label="Tarife" variant="secondary" compact onPress={() => router.push('/paywall' as Href)} />
        </AppCard>
      </> : null}

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

      <AppDialog visible={inviteOpen} title="Person einladen" subtitle="Lege Zugriff fest, bevor die Einladung verschickt wird." onClose={() => { setInviteOpen(false); setInviteError(undefined); }}>
        <View style={styles.inviteDialogContent}>
          <AppInput label="E-Mail-Adresse" value={inviteEmail} onChangeText={setInviteEmail} error={inviteError} placeholder="name@beispiel.de" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <AccessEditor role={inviteRole} childIds={inviteChildIds} expiryDate={inviteExpiryDate} childProfiles={children} onRoleChange={setInviteRole} onChildIdsChange={setInviteChildIds} onExpiryDateChange={setInviteExpiryDate} />
          <View style={styles.permissionNote}><IconSymbol name="shield-check" size={19} color={Design.colors.primaryDark} /><Text style={styles.permissionNoteText}>{roleDescription(inviteRole)}. Familienzugriff kann jederzeit widerrufen werden.</Text></View>
          <AppButton label="Einladung senden" onPress={sendFamilyInvite} disabled={!inviteEmail.trim()} />
        </View>
      </AppDialog>
      <AppDialog visible={Boolean(editingMember)} title="Zugriff bearbeiten" subtitle="Rolle, Kinderzugriff und Ablaufdatum gelten sofort." onClose={() => setEditingMember(undefined)}>
        <View style={styles.inviteDialogContent}><Text style={styles.editingMemberName}>{editingMember?.displayName || editingMember?.email}</Text><AccessEditor role={memberRole} childIds={memberChildIds} expiryDate={memberExpiryDate} childProfiles={children} onRoleChange={setMemberRole} onChildIdsChange={setMemberChildIds} onExpiryDateChange={setMemberExpiryDate} /><AppButton label="Zugriff speichern" onPress={saveMemberAccess} /></View>
      </AppDialog>
      <AppDialog visible={Boolean(pendingMemberRemoval)} title="Zugriff entfernen?" subtitle={`${pendingMemberRemoval?.displayName || pendingMemberRemoval?.email || 'Diese Person'} verliert den Zugriff auf die gemeinsamen Kinderprofile und Einträge.`} onClose={() => setPendingMemberRemoval(undefined)}>
        <View style={styles.deleteButtons}><AppButton label="Abbrechen" variant="secondary" onPress={() => setPendingMemberRemoval(undefined)} style={styles.flexButton} /><AppButton label="Zugriff entfernen" variant="danger" onPress={confirmMemberRemoval} style={styles.flexButton} /></View>
      </AppDialog>
    </AppShell>
  );
}

const ACCESS_ROLES: { role: FamilyRole; label: string }[] = [
  { role: 'caregiver', label: 'Betreuung' },
  { role: 'read_only', label: 'Nur lesen' },
  { role: 'temporary_guest', label: 'Zeitlich begrenzt' },
  { role: 'guest', label: 'Gast (bisher)' },
  { role: 'owner', label: 'Besitzer' },
];

function roleLabel(role: FamilyRole) {
  return ACCESS_ROLES.find((item) => item.role === role)?.label.toUpperCase() ?? 'ZUGRIFF';
}

function roleDescription(role: FamilyRole) {
  if (role === 'owner') return 'Kann Familie und Zugriffe verwalten';
  if (role === 'read_only') return 'Kann Einträge nur ansehen';
  if (role === 'temporary_guest') return 'Kann Einträge bis zum Ablaufdatum dokumentieren';
  if (role === 'guest') return 'Kann Einträge dokumentieren';
  return 'Kann Einträge dokumentieren';
}

function accessOptions(role: FamilyRole, childIds: string[], expiryDate: string): FamilyAccessOptions | undefined {
  if (role !== 'temporary_guest') return { role, childIds: role === 'owner' ? [] : childIds };
  const date = parseGermanDate(expiryDate);
  if (!date) return undefined;
  date.setHours(23, 59, 59, 999);
  if (date.getTime() <= Date.now()) return undefined;
  return { role, childIds, accessExpiresAt: date.toISOString() };
}

function AccessEditor({ role, childIds, expiryDate, childProfiles, onRoleChange, onChildIdsChange, onExpiryDateChange }: { role: FamilyRole; childIds: string[]; expiryDate: string; childProfiles: Child[]; onRoleChange: (role: FamilyRole) => void; onChildIdsChange: (childIds: string[]) => void; onExpiryDateChange: (date: string) => void }) {
  const allChildren = childIds.length === 0;
  const canLimitChildren = role !== 'owner';
  return (
    <View style={styles.accessEditor}>
      <View style={styles.accessField}><Text style={styles.fieldLabel}>Rolle</Text><View accessibilityRole="radiogroup" style={styles.roleOptions}>{ACCESS_ROLES.map((item) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: item.role === role }} key={item.role} onPress={() => onRoleChange(item.role)} style={[styles.roleOption, item.role === role && styles.roleOptionSelected]}><Text style={[styles.roleOptionText, item.role === role && styles.roleOptionTextSelected]}>{item.label}</Text></Pressable>)}</View><Text style={styles.roleHint}>{roleDescription(role)}</Text></View>
      {canLimitChildren ? <View style={styles.accessField}><Text style={styles.fieldLabel}>Kinderzugriff</Text><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: allChildren }} onPress={() => onChildIdsChange([])} style={[styles.scopeOption, allChildren && styles.scopeOptionSelected]}><IconSymbol name={allChildren ? 'checkmark' : 'person.2.fill'} size={16} color={allChildren ? '#FFFFFF' : Design.colors.primaryDark} /><Text style={[styles.scopeOptionText, allChildren && styles.scopeOptionTextSelected]}>Alle Kinder</Text></Pressable>{childProfiles.map((child) => { const selected = childIds.includes(child.id); return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} key={child.id} onPress={() => onChildIdsChange(selected ? childIds.filter((id) => id !== child.id) : [...childIds, child.id])} style={[styles.scopeOption, selected && styles.scopeOptionSelected]}><IconSymbol name={selected ? 'checkmark' : 'person.2.fill'} size={16} color={selected ? '#FFFFFF' : Design.colors.primaryDark} /><Text style={[styles.scopeOptionText, selected && styles.scopeOptionTextSelected]}>{child.name}</Text></Pressable>; })}<Text style={styles.roleHint}>Wenn einzelne Kinder ausgewählt sind, ist der Zugriff auf diese Profile begrenzt.</Text></View> : null}
      {role === 'temporary_guest' ? <AppDateTimeInput label="Zugriff endet am" value={expiryDate} onChange={onExpiryDateChange} minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)} /> : null}
    </View>
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
  sharingUnavailable: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sharingIcon: { width: 42, height: 42, borderRadius: 15, flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  sharingCopy: { flex: 1, gap: 2 },
  sharingTitle: { color: Design.colors.ink, fontSize: 15, lineHeight: 20, fontFamily: Design.fonts.bold },
  sharingText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  sharingError: { borderRadius: Design.radius.large, padding: 16, gap: 10, backgroundColor: Design.colors.dangerSoft },
  sharingErrorTitle: { color: Design.colors.danger, fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
  pendingInviteCard: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  pendingInviteActions: { gap: 6, alignItems: 'stretch' },
  familySwitcher: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  familyChoice: { minHeight: 44, borderRadius: 15, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Design.colors.surface, borderWidth: 1, borderColor: Design.colors.border },
  familyChoiceActive: { backgroundColor: Design.colors.primarySoft, borderColor: Design.colors.primary },
  familyChoiceText: { color: Design.colors.inkSoft, fontSize: 12, fontFamily: Design.fonts.semiBold },
  familyChoiceTextActive: { color: Design.colors.primaryDark, fontFamily: Design.fonts.bold },
  membersCard: { gap: 14 },
  membersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  memberList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Design.colors.border },
  memberRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Design.colors.border },
  memberAvatar: { width: 40, height: 40, borderRadius: 15, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { color: Design.colors.primaryDark, fontSize: 15, fontFamily: Design.fonts.bold },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  memberName: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  memberEmail: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 16, fontFamily: Design.fonts.regular },
  memberScope: { color: Design.colors.inkFaint, fontSize: 10, lineHeight: 15, fontFamily: Design.fonts.semiBold },
  rolePill: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: Design.colors.primarySoft },
  roleText: { color: Design.colors.primaryDark, fontSize: 9, lineHeight: 12, fontFamily: Design.fonts.bold },
  memberActions: { flexDirection: 'row', gap: 5 },
  editMemberButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  removeMemberButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: Design.colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  openInvites: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Design.colors.border, paddingTop: 12, gap: 8 },
  openInvitesTitle: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 15, letterSpacing: 0.4, fontFamily: Design.fonts.bold },
  inviteRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inviteDialogContent: { gap: 14 },
  editingMemberName: { color: Design.colors.ink, fontSize: 14, lineHeight: 20, fontFamily: Design.fonts.bold },
  accessEditor: { gap: 12 },
  accessField: { gap: 8 },
  roleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  roleOption: { minHeight: 44, borderRadius: 14, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Design.colors.border, backgroundColor: Design.colors.surface },
  roleOptionSelected: { borderColor: Design.colors.primaryDark, backgroundColor: Design.colors.primaryDark },
  roleOptionText: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.semiBold },
  roleOptionTextSelected: { color: '#FFFFFF', fontFamily: Design.fonts.bold },
  roleHint: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 16, fontFamily: Design.fonts.regular },
  scopeOption: { minHeight: 44, borderRadius: 14, paddingHorizontal: 12, alignItems: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: Design.colors.border, backgroundColor: Design.colors.surface },
  scopeOptionSelected: { borderColor: Design.colors.primaryDark, backgroundColor: Design.colors.primaryDark },
  scopeOptionText: { color: Design.colors.ink, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.semiBold },
  scopeOptionTextSelected: { color: '#FFFFFF', fontFamily: Design.fonts.bold },
  permissionNote: { borderRadius: Design.radius.medium, padding: 13, backgroundColor: Design.colors.primarySoft, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  permissionNoteText: { flex: 1, color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
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
