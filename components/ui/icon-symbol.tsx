import { SymbolWeight } from 'expo-symbols';
import {
  Bell,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  House,
  Heart,
  Info,
  MoonStar,
  Pencil,
  Pill,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Thermometer,
  Trash2,
  TriangleAlert,
  UsersRound,
  X,
} from 'lucide-react-native';
import { ComponentType } from 'react';
import { OpaqueColorValue, type StyleProp, type ViewStyle } from 'react-native';

type LucideIcon = ComponentType<{ color?: string; size?: number; strokeWidth?: number; style?: StyleProp<ViewStyle> }>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  'house.fill': House,
  'chart.xyaxis.line': ChartNoAxesCombined,
  'person.2.fill': UsersRound,
  'thermometer.medium': Thermometer,
  'pills.fill': Pill,
  'plus': Plus,
  'moon.stars.fill': MoonStar,
  'bell.fill': Bell,
  'bell': Bell,
  'pencil': Pencil,
  'trash.fill': Trash2,
  'xmark': X,
  'checkmark': Check,
  'cross.case.fill': Stethoscope,
  'calendar': CalendarDays,
  'paperplane.fill': Send,
  'chevron.left.forwardslash.chevron.right': Code2,
  'chevron.right': ChevronRight,
  'chevron.left': ChevronLeft,
  'chevron.down': ChevronDown,
  'heart': Heart,
  'info': Info,
  'sparkles': Sparkles,
  'shield-check': ShieldCheck,
  'triangle-alert': TriangleAlert,
  'calendar-check': CalendarCheck2,
  'clock.fill': Clock3,
} satisfies Record<string, LucideIcon>;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const Icon = MAPPING[name];
  return <Icon color={String(color)} size={size} strokeWidth={2.1} style={style} />;
}
