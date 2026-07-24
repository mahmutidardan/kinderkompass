import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';

type Props = {
  title: string;
  text: string;
};

export function InfoButton({ title, text }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable accessibilityLabel={`Info zu ${title}`} accessibilityRole="button" onPress={() => setOpen((current) => !current)} style={[styles.button, open && styles.buttonActive]}>
        <IconSymbol name="info" size={17} color={open ? '#FFFFFF' : Design.colors.primaryDark} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay} accessibilityViewIsModal>
          <Pressable accessibilityRole="button" style={StyleSheet.absoluteFillObject} onPress={() => setOpen(false)} accessibilityLabel="Info schließen" />
          <View style={styles.dialog}>
            <View style={styles.dialogHeader}><View style={styles.dialogIcon}><IconSymbol name="info" size={20} color={Design.colors.primaryDark} /></View><Text style={styles.tooltipTitle}>{title}</Text><Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.closeButton} accessibilityLabel="Info schließen"><IconSymbol name="xmark" size={19} color={Design.colors.inkSoft} /></Pressable></View>
            <Text style={styles.tooltipText}>{text}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Info verstanden" onPress={() => setOpen(false)} style={styles.doneButton}><Text style={styles.doneText}>Verstanden</Text></Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, borderColor: Design.colors.border, backgroundColor: Design.colors.surface, alignItems: 'center', justifyContent: 'center' },
  buttonActive: { backgroundColor: Design.colors.primaryDark, borderColor: Design.colors.primaryDark },
  overlay: { flex: 1, backgroundColor: 'rgba(48,45,54,0.38)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 360, borderRadius: Design.radius.hero, padding: 21, backgroundColor: Design.colors.surface, ...Design.shadow.floating },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 11 },
  dialogIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  tooltipTitle: { color: Design.colors.ink, flex: 1, fontSize: 17, lineHeight: 23, fontFamily: Design.fonts.bold },
  tooltipText: { color: Design.colors.inkSoft, fontSize: 14, lineHeight: 21, fontFamily: Design.fonts.regular },
  closeButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: Design.colors.backgroundMuted, alignItems: 'center', justifyContent: 'center' },
  doneButton: { minHeight: 50, borderRadius: 17, backgroundColor: Design.colors.primaryDark, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  doneText: { color: '#FFFFFF', fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
});
