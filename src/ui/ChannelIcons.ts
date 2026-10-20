import { Megaphone, ScrollText, Trophy, BookOpen, Coffee, Music, Code2, Gamepad2, Heart, Star, Camera, Lightbulb, CalendarDays, Briefcase, MessageCircle, Palette, type LucideIcon } from 'lucide-react';

/** Icons a channel can use instead of the default type glyph. One icon family (lucide) across the app. */
export const CHANNEL_ICONS = {
  megaphone: Megaphone, rules: ScrollText, trophy: Trophy, book: BookOpen, coffee: Coffee, music: Music, code: Code2, game: Gamepad2,
  heart: Heart, star: Star, camera: Camera, idea: Lightbulb, calendar: CalendarDays, work: Briefcase, chat: MessageCircle, art: Palette,
} satisfies Record<string, LucideIcon>;
export type ChannelIconName = keyof typeof CHANNEL_ICONS;
