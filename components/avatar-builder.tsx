import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ACCESSORY_LABELS,
  AVATAR_ACCESSORIES,
  AVATAR_BACKGROUNDS,
  AVATAR_HAIR_COLORS,
  AVATAR_HAIR_STYLES,
  AVATAR_OUTFIT_COLORS,
  AVATAR_OUTFITS,
  AVATAR_SKIN_TONES,
  ChildAvatar as ChildAvatarView,
  HAIR_LABELS,
  normalizeChildAvatar,
  OUTFIT_LABELS,
} from '@/components/child-avatar';
import { Design } from '@/constants/design';
import { ChildAvatar } from '@/lib/store';

type Props = {
  value: ChildAvatar;
  onChange: (value: ChildAvatar) => void;
};

type ColorOptionsProps = {
  label: string;
  value: string;
  colors: string[];
  onSelect: (color: string) => void;
};

function ColorOptions({ label, value, colors, onSelect }: ColorOptionsProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.colorRow}>
        {colors.map((color) => (
          <Pressable
            key={color}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: Farbe auswählen`}
            accessibilityState={{ selected: value === color }}
            onPress={() => onSelect(color)}
            style={[styles.colorOuter, value === color && styles.colorOuterSelected]}>
            <View style={[styles.colorOption, { backgroundColor: color }]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function AvatarBuilder({ value, onChange }: Props) {
  const avatar = normalizeChildAvatar(value);
  const update = (change: Partial<ChildAvatar>) => onChange({ ...avatar, ...change });

  return (
    <View style={styles.builder}>
      <View style={styles.previewCard}>
        <View style={styles.previewHalo}><ChildAvatarView avatar={avatar} size={126} /></View>
        <View style={styles.previewCopy}>
          <Text style={styles.title}>Avatar gestalten</Text>
          <Text style={styles.copy}>Stelle eine eigene Figur mit Frisur, Kleidung und Accessoire zusammen.</Text>
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.label}>Frisur</Text>
        <View style={styles.previewOptions}>
          {AVATAR_HAIR_STYLES.map((hairStyle) => (
            <Pressable
              key={hairStyle}
              accessibilityRole="radio"
              accessibilityLabel={`Frisur ${HAIR_LABELS[hairStyle]}`}
              accessibilityState={{ selected: avatar.hairStyle === hairStyle }}
              onPress={() => update({ hairStyle })}
              style={[styles.previewOption, avatar.hairStyle === hairStyle && styles.optionSelected]}>
              <ChildAvatarView avatar={{ ...avatar, hairStyle, accessory: 'none' }} size={52} />
              <Text style={[styles.optionLabel, avatar.hairStyle === hairStyle && styles.optionLabelSelected]}>{HAIR_LABELS[hairStyle]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ColorOptions label="Hautton" value={avatar.skinTone} colors={AVATAR_SKIN_TONES} onSelect={(skinTone) => update({ skinTone })} />
      <ColorOptions label="Haarfarbe" value={avatar.hairColor} colors={AVATAR_HAIR_COLORS} onSelect={(hairColor) => update({ hairColor })} />

      <View style={styles.group}>
        <Text style={styles.label}>Kleidung</Text>
        <View style={styles.outfitRow}>
          {AVATAR_OUTFITS.map((outfit) => (
            <Pressable
              key={outfit}
              accessibilityRole="radio"
              accessibilityLabel={`Kleidung ${OUTFIT_LABELS[outfit]}`}
              accessibilityState={{ selected: avatar.outfit === outfit }}
              onPress={() => update({ outfit })}
              style={[styles.outfitOption, avatar.outfit === outfit && styles.optionSelected]}>
              <ChildAvatarView avatar={{ ...avatar, outfit }} size={58} />
              <Text style={[styles.optionLabel, avatar.outfit === outfit && styles.optionLabelSelected]}>{OUTFIT_LABELS[outfit]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ColorOptions label="Kleidungsfarbe" value={avatar.outfitColor} colors={AVATAR_OUTFIT_COLORS} onSelect={(outfitColor) => update({ outfitColor })} />

      <View style={styles.group}>
        <Text style={styles.label}>Accessoire</Text>
        <View style={styles.textOptions}>
          {AVATAR_ACCESSORIES.map((accessory) => (
            <Pressable
              key={accessory}
              accessibilityRole="radio"
              accessibilityLabel={`Accessoire ${ACCESSORY_LABELS[accessory]}`}
              accessibilityState={{ selected: avatar.accessory === accessory }}
              onPress={() => update({ accessory })}
              style={[styles.textOption, avatar.accessory === accessory && styles.optionSelected]}>
              <Text style={[styles.textOptionLabel, avatar.accessory === accessory && styles.optionLabelSelected]}>{ACCESSORY_LABELS[accessory]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ColorOptions label="Hintergrund" value={avatar.backgroundColor} colors={AVATAR_BACKGROUNDS} onSelect={(backgroundColor) => update({ backgroundColor })} />
    </View>
  );
}

const styles = StyleSheet.create({
  builder: { gap: 17, paddingTop: 5 },
  previewCard: { minHeight: 162, borderRadius: Design.radius.large, backgroundColor: Design.colors.primarySoft, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 16, overflow: 'hidden' },
  previewHalo: { padding: 5, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.72)', shadowColor: Design.colors.shadow, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  previewCopy: { flex: 1, gap: 4 },
  title: { color: Design.colors.ink, fontSize: 17, lineHeight: 23, fontFamily: Design.fonts.bold },
  copy: { color: Design.colors.inkSoft, fontSize: 12, lineHeight: 18, fontFamily: Design.fonts.regular },
  group: { gap: 8 },
  label: { color: Design.colors.ink, fontSize: 13, lineHeight: 18, fontFamily: Design.fonts.bold },
  previewOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  previewOption: { width: 72, minHeight: 82, borderRadius: 18, backgroundColor: Design.colors.background, paddingVertical: 7, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1.5, borderColor: 'transparent' },
  outfitRow: { flexDirection: 'row', gap: 8 },
  outfitOption: { flex: 1, minWidth: 82, borderRadius: 18, backgroundColor: Design.colors.background, paddingVertical: 8, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: 'transparent' },
  optionSelected: { borderColor: Design.colors.primary, backgroundColor: Design.colors.primarySoft },
  optionLabel: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 15, fontFamily: Design.fonts.semiBold },
  optionLabelSelected: { color: Design.colors.primaryDark },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  colorOuter: { width: 44, height: 44, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  colorOuterSelected: { borderColor: Design.colors.primaryDark },
  colorOption: { width: 28, height: 28, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(58,48,69,0.12)' },
  textOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  textOption: { minWidth: 70, height: 44, borderRadius: 15, backgroundColor: Design.colors.background, borderWidth: 1.5, borderColor: 'transparent', paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  textOptionLabel: { color: Design.colors.inkSoft, fontSize: 11, lineHeight: 15, fontFamily: Design.fonts.semiBold },
});
