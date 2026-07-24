import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { Design } from '@/constants/design';

type Props = TextInputProps & {
  label?: string;
  optional?: boolean;
  helper?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  suffix?: string;
};

export function AppInput({ label, optional, helper, error, containerStyle, suffix, style, multiline, ...props }: Props) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}{optional ? <Text style={styles.optional}> (optional)</Text> : null}</Text> : null}
      <View style={[styles.inputShell, multiline && styles.multilineShell, error && styles.inputShellError]}>
        <TextInput
          {...props}
          multiline={multiline}
          placeholderTextColor={Design.colors.inkFaint}
          style={[styles.input, multiline && styles.multiline, style]}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 7 },
  label: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  optional: { color: Design.colors.inkSoft, fontFamily: Design.fonts.regular },
  inputShell: { minHeight: Design.size.input, borderRadius: Design.radius.medium, borderWidth: 1, borderColor: Design.colors.border, backgroundColor: Design.colors.surface, paddingHorizontal: Design.spacing.md, flexDirection: 'row', alignItems: 'center' },
  multilineShell: { minHeight: 104, alignItems: 'stretch' },
  inputShellError: { borderColor: Design.colors.danger, backgroundColor: Design.colors.dangerSoft },
  input: { flex: 1, color: Design.colors.ink, fontSize: 15, lineHeight: 21, fontFamily: Design.fonts.medium, paddingVertical: 0 },
  multiline: { minHeight: 100, paddingTop: 15, paddingBottom: 15, textAlignVertical: 'top' },
  suffix: { color: Design.colors.inkSoft, fontSize: 12, fontFamily: Design.fonts.bold },
  helper: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  error: { color: Design.colors.danger, fontSize: 12, lineHeight: 17, fontFamily: Design.fonts.semiBold },
});
