import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { Design } from '@/constants/design';
import { Child, ChildAvatar as ChildAvatarConfig } from '@/lib/store';

export const AVATAR_SKIN_TONES = ['#F8D8BF', '#EFC09B', '#D99B70', '#A96746', '#6F432F'];
export const AVATAR_HAIR_STYLES = ['short', 'waves', 'curls', 'bun'];
export const AVATAR_HAIR_COLORS = ['#30231F', '#68442F', '#B8793F', '#E2B75E', '#A85C4B'];
export const AVATAR_OUTFITS = ['shirt', 'hoodie', 'overalls'];
export const AVATAR_OUTFIT_COLORS = ['#7163A8', '#E68778', '#5E93A6', '#7BA58E', '#D99D4E'];
export const AVATAR_ACCESSORIES = ['none', 'glasses', 'cap', 'bow'];
export const AVATAR_BACKGROUNDS = ['#DED8F2', '#F8D9CF', '#D8EAE1', '#F7E9BC'];

export const HAIR_LABELS: Record<string, string> = { short: 'Kurz', waves: 'Wellig', curls: 'Locken', bun: 'Dutt' };
export const OUTFIT_LABELS: Record<string, string> = { shirt: 'Shirt', hoodie: 'Hoodie', overalls: 'Latzhose' };
export const ACCESSORY_LABELS: Record<string, string> = { none: 'Ohne', glasses: 'Brille', cap: 'Cap', bow: 'Schleife' };

export const DEFAULT_CHILD_AVATAR: ChildAvatarConfig = {
  skinTone: '#EFC09B',
  hairStyle: 'waves',
  hairColor: '#68442F',
  outfit: 'overalls',
  outfitColor: '#7163A8',
  accessory: 'none',
  backgroundColor: Design.colors.lavender,
};

function validValue(value: string | undefined, options: string[], fallback: string) {
  return value && options.includes(value) ? value : fallback;
}

export function normalizeChildAvatar(avatar?: Partial<ChildAvatarConfig>): ChildAvatarConfig {
  return {
    skinTone: validValue(avatar?.skinTone, AVATAR_SKIN_TONES, DEFAULT_CHILD_AVATAR.skinTone),
    hairStyle: validValue(avatar?.hairStyle, AVATAR_HAIR_STYLES, DEFAULT_CHILD_AVATAR.hairStyle),
    hairColor: validValue(avatar?.hairColor, AVATAR_HAIR_COLORS, DEFAULT_CHILD_AVATAR.hairColor),
    outfit: validValue(avatar?.outfit, AVATAR_OUTFITS, DEFAULT_CHILD_AVATAR.outfit),
    outfitColor: validValue(avatar?.outfitColor, AVATAR_OUTFIT_COLORS, DEFAULT_CHILD_AVATAR.outfitColor),
    accessory: validValue(avatar?.accessory, AVATAR_ACCESSORIES, DEFAULT_CHILD_AVATAR.accessory),
    backgroundColor: validValue(avatar?.backgroundColor ?? avatar?.color, AVATAR_BACKGROUNDS, DEFAULT_CHILD_AVATAR.backgroundColor),
  };
}

type AvatarProps = {
  child?: Child;
  avatar?: Partial<ChildAvatarConfig>;
  size?: number;
};

function Outfit({ value }: { value: ChildAvatarConfig }) {
  if (value.outfit === 'hoodie') {
    return (
      <G>
        <Path d="M13 120 C16 91 35 82 60 82 C85 82 104 91 107 120 Z" fill={value.outfitColor} />
        <Path d="M41 84 C45 94 75 94 79 84" fill="none" stroke="#FFFFFF" strokeOpacity={0.42} strokeWidth="4" />
        <Line x1="51" y1="91" x2="48" y2="108" stroke="#FFFFFF" strokeOpacity={0.72} strokeWidth="2" />
        <Line x1="69" y1="91" x2="72" y2="108" stroke="#FFFFFF" strokeOpacity={0.72} strokeWidth="2" />
        <Circle cx="48" cy="109" r="2.5" fill="#FFFFFF" />
        <Circle cx="72" cy="109" r="2.5" fill="#FFFFFF" />
      </G>
    );
  }
  if (value.outfit === 'overalls') {
    return (
      <G>
        <Path d="M13 120 C16 91 35 82 60 82 C85 82 104 91 107 120 Z" fill="#F6F0EA" />
        <Path d="M35 89 L43 86 L46 96 H74 L77 86 L85 89 L82 120 H38 Z" fill={value.outfitColor} />
        <Rect x="45" y="94" width="30" height="27" rx="7" fill={value.outfitColor} />
        <Circle cx="47" cy="96" r="2.4" fill="#F4D8A0" />
        <Circle cx="73" cy="96" r="2.4" fill="#F4D8A0" />
        <Path d="M53 107 H67" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth="2" strokeLinecap="round" />
      </G>
    );
  }
  return (
    <G>
      <Path d="M13 120 C16 91 35 82 60 82 C85 82 104 91 107 120 Z" fill={value.outfitColor} />
      <Path d="M48 84 Q60 97 72 84" fill="#FFFFFF" fillOpacity={0.78} />
      <Path d="M27 105 H93" stroke="#FFFFFF" strokeOpacity={0.2} strokeWidth="5" />
    </G>
  );
}

function HairBack({ value }: { value: ChildAvatarConfig }) {
  if (value.hairStyle === 'bun') {
    return <G><Circle cx="78" cy="14" r="14" fill={value.hairColor} /><Circle cx="82" cy="12" r="8" fill={value.hairColor} opacity={0.82} /></G>;
  }
  if (value.hairStyle === 'waves') {
    return <Path d="M25 48 C23 24 37 7 60 7 C84 7 97 26 94 51 L89 76 C84 84 76 84 72 77 L48 77 C43 85 34 83 30 76 Z" fill={value.hairColor} />;
  }
  if (value.hairStyle === 'curls') {
    return <Path d="M25 52 C20 29 33 8 59 7 C87 6 100 28 94 54 L88 74 C82 83 75 82 71 75 H48 C43 83 34 82 29 73 Z" fill={value.hairColor} />;
  }
  return null;
}

function HairFront({ value }: { value: ChildAvatarConfig }) {
  if (value.hairStyle === 'short') {
    return <Path d="M29 42 C28 19 42 7 60 7 C80 7 91 21 91 43 C82 41 79 31 78 24 C69 34 49 37 29 34 Z" fill={value.hairColor} />;
  }
  if (value.hairStyle === 'bun') {
    return <Path d="M29 42 C29 19 43 7 61 7 C82 7 91 22 91 43 C83 40 78 31 78 23 C67 34 49 36 29 34 Z" fill={value.hairColor} />;
  }
  if (value.hairStyle === 'curls') {
    return (
      <G fill={value.hairColor}>
        <Circle cx="32" cy="33" r="12" /><Circle cx="40" cy="20" r="12" /><Circle cx="54" cy="15" r="12" />
        <Circle cx="69" cy="16" r="12" /><Circle cx="82" cy="23" r="12" /><Circle cx="89" cy="36" r="11" />
      </G>
    );
  }
  return <Path d="M29 42 C29 18 43 7 61 7 C81 7 91 21 91 43 C83 42 79 34 78 25 C72 32 66 31 62 26 C55 36 43 36 29 34 Z" fill={value.hairColor} />;
}

function Accessory({ value }: { value: ChildAvatarConfig }) {
  if (value.accessory === 'glasses') {
    return (
      <G fill="none" stroke="#4E4857" strokeWidth="2.5">
        <Rect x="38" y="43" width="17" height="13" rx="6" /><Rect x="65" y="43" width="17" height="13" rx="6" />
        <Line x1="55" y1="48" x2="65" y2="48" /><Line x1="30" y1="46" x2="38" y2="47" /><Line x1="82" y1="47" x2="90" y2="46" />
      </G>
    );
  }
  if (value.accessory === 'cap') {
    return (
      <G>
        <Path d="M28 32 C32 12 47 4 62 5 C78 6 88 17 90 31 C72 25 49 25 28 32 Z" fill={value.outfitColor} />
        <Path d="M54 29 C70 25 91 29 100 36 C82 38 67 36 54 32 Z" fill={value.outfitColor} opacity={0.9} />
        <Path d="M59 7 V27" stroke="#FFFFFF" strokeOpacity={0.32} strokeWidth="2" />
      </G>
    );
  }
  if (value.accessory === 'bow') {
    return (
      <G fill={value.outfitColor}>
        <Path d="M78 18 C87 10 97 13 95 23 C93 30 85 28 78 23 Z" /><Path d="M78 18 C72 10 64 13 66 22 C67 28 73 27 79 23 Z" />
        <Circle cx="79" cy="21" r="4.5" fill="#F5C8BC" />
      </G>
    );
  }
  return null;
}

export function ChildAvatar({ child, avatar, size = 49 }: AvatarProps) {
  const value = normalizeChildAvatar(avatar ?? child?.avatar);
  return (
    <View accessibilityLabel={child ? `Avatar von ${child.name}` : 'Avatar-Vorschau'} style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Rect width="120" height="120" rx="30" fill={value.backgroundColor} />
        <Circle cx="17" cy="20" r="13" fill="#FFFFFF" opacity={0.2} />
        <Circle cx="104" cy="32" r="7" fill="#FFFFFF" opacity={0.22} />
        <Outfit value={value} />
        <HairBack value={value} />
        <Rect x="51" y="68" width="18" height="23" rx="8" fill={value.skinTone} />
        <Circle cx="31" cy="49" r="8" fill={value.skinTone} />
        <Circle cx="89" cy="49" r="8" fill={value.skinTone} />
        <Ellipse cx="60" cy="47" rx="31" ry="36" fill={value.skinTone} />
        <HairFront value={value} />
        <Ellipse cx="43" cy="53" rx="3" ry="4" fill="#3F3434" />
        <Ellipse cx="77" cy="53" rx="3" ry="4" fill="#3F3434" />
        <Path d="M54 65 Q60 70 66 65" fill="none" stroke="#8E504D" strokeWidth="2.5" strokeLinecap="round" />
        <Ellipse cx="39" cy="63" rx="5" ry="2.5" fill="#E98D89" opacity={0.35} />
        <Ellipse cx="81" cy="63" rx="5" ry="2.5" fill="#E98D89" opacity={0.35} />
        <Accessory value={value} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { overflow: 'hidden', backgroundColor: Design.colors.lavender },
});
