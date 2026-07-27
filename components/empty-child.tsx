import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';

export function EmptyChild() {
  return (
    <View style={styles.card}>
      <View style={styles.icon}><IconSymbol name="heart" size={28} color={Design.colors.primaryDark} /></View>
      <Text style={styles.title}>Für wen möchtest du sorgen?</Text>
      <Text style={styles.copy}>Lege zuerst ein Kinderprofil an. Alle Einträge bleiben auf diesem Gerät.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Kinderprofil anlegen" style={styles.button} onPress={() => router.push('/familie')}>
        <Text style={styles.buttonText}>Kinderprofil anlegen</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Design.colors.surface, borderRadius: Design.radius.hero, padding: 29, alignItems: 'center', gap: 11, borderWidth: 1, borderColor: 'rgba(72,61,77,0.045)', ...Design.shadow.card },
  icon: { width: 60, height: 60, borderRadius: 21, backgroundColor: Design.colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  title: { color: Design.colors.ink, ...Design.type.title, fontFamily: Design.fonts.bold, textAlign: 'center' },
  copy: { color: Design.colors.inkSoft, fontSize: 13, lineHeight: 20, fontFamily: Design.fonts.regular, textAlign: 'center' },
  button: { backgroundColor: Design.colors.primaryDark, borderRadius: 17, paddingVertical: 14, paddingHorizontal: 22, marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 14, lineHeight: 19, fontFamily: Design.fonts.bold },
});
