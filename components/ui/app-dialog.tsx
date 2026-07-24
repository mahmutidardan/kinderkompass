import { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Design } from '@/constants/design';

type Props = PropsWithChildren<{
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: ReactNode;
}>;

export function AppDialog({ visible, title, subtitle, onClose, footer, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.layer,
          {
            paddingTop: Math.max(insets.top, Design.spacing.md),
            paddingBottom: Math.max(insets.bottom, Design.spacing.md),
          },
        ]}>
        <Pressable
          accessibilityLabel="Dialog schließen"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable
              accessibilityLabel="Fenster schließen"
              accessibilityRole="button"
              hitSlop={6}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <IconSymbol name="xmark" size={19} color={Design.colors.inkSoft} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 45, 54, 0.38)',
    paddingHorizontal: Design.spacing.sm,
  },
  dialog: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '92%',
    overflow: 'hidden',
    borderRadius: Design.radius.hero,
    borderWidth: 1,
    borderColor: 'rgba(72, 61, 77, 0.08)',
    backgroundColor: Design.colors.surfaceRaised,
    ...Design.shadow.floating,
  },
  handle: {
    width: 40,
    height: 4,
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: Design.radius.round,
    backgroundColor: Design.colors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Design.spacing.sm,
    paddingHorizontal: Design.spacing.lg,
    paddingTop: Design.spacing.md,
    paddingBottom: Design.spacing.sm,
  },
  heading: { flex: 1, gap: 3 },
  title: {
    color: Design.colors.ink,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.35,
    fontFamily: Design.fonts.extraBold,
  },
  subtitle: {
    color: Design.colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Design.fonts.regular,
  },
  closeButton: {
    width: 48,
    height: 48,
    marginRight: -8,
    marginTop: -8,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Design.colors.backgroundMuted,
  },
  pressed: { opacity: 0.68, transform: [{ scale: 0.97 }] },
  content: {
    gap: Design.spacing.sm,
    paddingHorizontal: Design.spacing.lg,
    paddingBottom: Design.spacing.lg,
  },
  footer: {
    paddingHorizontal: Design.spacing.lg,
    paddingTop: Design.spacing.sm,
    paddingBottom: Design.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Design.colors.border,
    backgroundColor: Design.colors.surfaceRaised,
  },
});
